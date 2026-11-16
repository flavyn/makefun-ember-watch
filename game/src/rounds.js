// The watch itself: waves, the beacon's integrity, salvage and what a night of it adds up to.
// One state machine owns every screen, so a start, a wave, an upgrade and an end are the same code path.

import { ARENA, BANNER, SALVAGE, UPGRADES, WAVE_PLAN } from './tuning.js';

export const STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  UPGRADE: 'upgrade',
  DEFEAT: 'defeat',
  VICTORY: 'victory',
  PAUSED: 'paused',
};

const MAX_ALIVE = 24;

export class Round {
  constructor(api, rng) {
    this.api = api;
    this.rng = rng;
    this.state = STATE.TITLE;
    this.wave = 0;
    this.score = 0;
    this.salvage = 0;
    this.coreMax = ARENA.coreHealth;
    this.coreHealth = ARENA.coreHealth;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.offer = [];
    this.elapsed = 0;
    this.kills = 0;
    this.shots = 0;
    this.hits = 0;
    this.pace = 1;
    this.endReason = '';
    this.pausedFrom = STATE.PLAYING;
  }

  reset() {
    this.state = STATE.TITLE;
    this.wave = 0;
    this.score = 0;
    this.salvage = 0;
    this.coreHealth = this.coreMax;
    this.spawnQueue.length = 0;
    this.spawnTimer = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.elapsed = 0;
    this.kills = 0;
    this.shots = 0;
    this.hits = 0;
    this.pace = 1;
    this.endReason = '';
    this.offer = [];
  }

  start() {
    this.reset();
    this.api.player.reset();
    this.api.hollows.reset();
    this.api.lance.reset();
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    const plan = WAVE_PLAN[this.wave - 1];
    this.spawnQueue.length = 0;
    const push = (type, count) => {
      for (let i = 0; i < count; i += 1) this.spawnQueue.push(type);
    };
    push('warden', plan.warden);
    push('brute', plan.brute);
    push('striker', plan.striker);
    push('crawler', plan.crawler);
    this.pace = plan.pace;
    for (let i = this.spawnQueue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const swap = this.spawnQueue[i];
      this.spawnQueue[i] = this.spawnQueue[j];
      this.spawnQueue[j] = swap;
    }
    this.spawnTimer = 0.5;
    this.banner = `WAVE ${this.wave} / ${WAVE_PLAN.length}`;
    this.bannerTimer = BANNER.waveSeconds;
    this.state = STATE.PLAYING;
    this.api.sound.wave();
  }

  // The whole simulation of one fixed step, so the frame rate can never change the outcome.
  step(dt) {
    if (this.state !== STATE.PLAYING) return;
    this.elapsed += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    this.spawnTimer -= dt;
    if (this.spawnQueue.length > 0 && this.spawnTimer <= 0 && this.api.hollows.aliveCount < MAX_ALIVE) {
      const type = this.spawnQueue.shift();
      const spots = this.api.world.spawns;
      const spot = spots[Math.floor(this.rng() * spots.length)];
      if (this.api.hollows.spawn(type, spot.x, spot.z, this.wave)) this.spawnTimer = 0.44 * this.pace;
    }
    this.api.hollows.step(dt, this.api.player, this.api);
    if (!this.api.player.alive) {
      this.defeat('the keeper fell');
      return;
    }
    if (this.coreHealth <= 0) {
      this.coreHealth = 0;
      this.defeat('the beacon went dark');
      return;
    }
    if (this.spawnQueue.length === 0 && this.api.hollows.aliveCount === 0) this.clearWave();
  }

  clearWave() {
    this.score += 60 + this.wave * 20;
    this.salvage += SALVAGE.perWave;
    this.banner = 'WAVE CLEAR';
    this.bannerTimer = BANNER.clearSeconds;
    if (this.wave >= WAVE_PLAN.length) {
      this.victory();
      return;
    }
    this.offer = this.pickOffer();
    this.state = STATE.UPGRADE;
    this.api.sound.upgrade();
  }

  // Three offers, drawn from the ones the salvage on hand can actually pay for.
  pickOffer() {
    const pool = UPGRADES.map((item) => item);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const swap = pool[i];
      pool[i] = pool[j];
      pool[j] = swap;
    }
    const affordable = pool.filter((item) => item.cost <= this.salvage);
    const chosen = affordable.slice(0, SALVAGE.upgradeOffer);
    for (const item of pool) {
      if (chosen.length >= SALVAGE.upgradeOffer) break;
      if (!chosen.includes(item)) chosen.push(item);
    }
    return chosen;
  }

  chooseUpgrade(index) {
    if (this.state !== STATE.UPGRADE) return false;
    const item = this.offer[index];
    if (!item || item.cost > this.salvage) return false;
    this.salvage -= item.cost;
    this.applyUpgrade(item.id);
    this.api.sound.upgrade();
    this.nextWave();
    return true;
  }

  applyUpgrade(id) {
    const { lance, player } = this.api;
    if (id === 'damage') lance.damageMul *= 1.18;
    if (id === 'health') {
      player.maxHealth += 25;
      player.heal(25);
    }
    if (id === 'vent') lance.ventMul *= 1.3;
    if (id === 'repair') this.coreHealth = Math.min(this.coreMax, this.coreHealth + 30);
    if (id === 'flare') {
      lance.flareCap += 1;
      lance.flareCharges = Math.min(lance.flareCap, lance.flareCharges + 1);
    }
    if (id === 'boots') player.speedMul *= 1.12;
    if (id === 'pierce') lance.pierce += 1;
    if (id === 'chill') lance.chill = true;
  }

  // Pressing 4 keeps the salvage and takes the next wave without spending: a real choice, not a tax.
  skipUpgrade() {
    if (this.state !== STATE.UPGRADE) return false;
    this.salvage += SALVAGE.savingBonus;
    this.banner = 'saved for a bigger upgrade';
    this.bannerTimer = BANNER.clearSeconds;
    this.api.sound.upgrade();
    this.nextWave();
    return true;
  }

  addKill(score, salvage) {
    this.kills += 1;
    this.score += score;
    this.salvage += salvage;
  }

  registerShot(hit) {
    this.shots += 1;
    if (hit) this.hits += 1;
  }

  damageCore(amount) {
    if (this.state !== STATE.PLAYING) return;
    this.coreHealth -= amount;
  }

  damagePlayer(amount) {
    if (this.state !== STATE.PLAYING) return;
    this.api.player.hurt(amount, this.api.sound);
  }

  defeat(reason) {
    if (this.state === STATE.DEFEAT || this.state === STATE.VICTORY) return;
    this.endReason = reason;
    this.state = STATE.DEFEAT;
    this.api.sound.defeat();
  }

  victory() {
    this.endReason = 'the last wave broke on the rock';
    this.score += 500;
    this.state = STATE.VICTORY;
    this.api.sound.victory();
  }

  pause() {
    if (this.state === STATE.PAUSED) return;
    if (this.state !== STATE.PLAYING) return;
    this.pausedFrom = this.state;
    this.state = STATE.PAUSED;
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this.state = this.pausedFrom;
  }

  get accuracy() {
    if (this.shots === 0) return 0;
    return Math.round((this.hits / this.shots) * 100);
  }

  // The shot mode jumps the same machine the player uses; nothing here is a special render path.
  jumpToUpgrade(wave, salvage) {
    this.start();
    while (this.wave < wave && this.state === STATE.PLAYING) this.clearWave();
    this.salvage = salvage;
    this.offer = this.pickOffer();
    this.state = STATE.UPGRADE;
    this.banner = '';
    this.bannerTimer = 0;
  }

  jumpToEnd(kind, score, wave, reason) {
    this.start();
    this.wave = wave;
    this.score = score;
    this.salvage = 34;
    this.hits = 61;
    this.shots = 74;
    this.kills = 38;
    this.coreHealth = kind === 'victory' ? 62 : 0;
    this.endReason = reason;
    this.state = kind === 'victory' ? STATE.VICTORY : STATE.DEFEAT;
    this.spawnQueue.length = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.api.hollows.reset();
  }
}
