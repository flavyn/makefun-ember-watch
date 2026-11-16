// What the keeper sees: three bars, four numbers and the screens between waves.
// Every write is compared first, so a quiet frame touches no DOM node at all.

import { WAVE_PLAN } from './tuning.js';
import { STATE } from './rounds.js';

export class Hud {
  constructor() {
    this.health = document.getElementById('health-fill');
    this.healthText = document.getElementById('health-text');
    this.core = document.getElementById('core-fill');
    this.coreText = document.getElementById('core-text');
    this.heat = document.getElementById('heat-fill');
    this.heatText = document.getElementById('heat-text');
    this.score = document.getElementById('score');
    this.wave = document.getElementById('wave');
    this.salvage = document.getElementById('salvage');
    this.flares = document.getElementById('flares');
    this.banner = document.getElementById('banner');
    this.hurt = document.getElementById('hurt');
    this.overlayTitle = document.getElementById('title');
    this.overlayUpgrade = document.getElementById('upgrade');
    this.overlayEnd = document.getElementById('end');
    this.overlayPause = document.getElementById('pause');
    this.upgradeCards = document.getElementById('upgrade-cards');
    this.upgradeSalvage = document.getElementById('upgrade-salvage');
    this.endTitle = document.getElementById('end-title');
    this.endReason = document.getElementById('end-reason');
    this.endScore = document.getElementById('end-score');
    this.endWave = document.getElementById('end-wave');
    this.endKills = document.getElementById('end-kills');
    this.endAccuracy = document.getElementById('end-accuracy');
    this.crosshair = document.getElementById('crosshair');
    this.hitmark = document.getElementById('hitmark');
    this.hintLine = document.getElementById('hint');
    this.hitTimer = 0;
    this.dryTimer = 0;
    this.hintTimer = 0;
    // The page opens on the title screen, so that is the state the cache must start from.
    this.cache = {
      health: -1,
      core: -1,
      heat: -1,
      score: -1,
      wave: -1,
      salvage: -1,
      flares: -1,
      banner: '',
      overlay: 'title',
    };
  }

  setBar(node, share) {
    const width = Math.round(Math.max(0, Math.min(1, share)) * 100);
    node.style.transform = `scaleX(${width / 100})`;
  }

  // Feedback that has to be seen without reading: a hit marker, a dry flash on the heat bar,
  // and one line of advice when a body shot bounces off a warden's plate.
  flashHit(kind) {
    this.hitTimer = kind === 'kill' ? 0.22 : 0.14;
    this.hitmark.dataset.kind = kind;
  }

  flashDry() {
    this.dryTimer = 0.35;
  }

  hint(text) {
    this.hintTimer = 1.6;
    this.hintLine.textContent = text;
  }

  tick(dt) {
    if (this.hitTimer > 0) this.hitTimer = Math.max(0, this.hitTimer - dt);
    if (this.dryTimer > 0) this.dryTimer = Math.max(0, this.dryTimer - dt);
    if (this.hintTimer > 0) this.hintTimer = Math.max(0, this.hintTimer - dt);
  }

  update(round, player, lance) {
    const healthShare = player.health / player.maxHealth;
    if (this.cache.health !== Math.round(healthShare * 100)) {
      this.cache.health = Math.round(healthShare * 100);
      this.setBar(this.health, healthShare);
      this.healthText.textContent = `${Math.max(0, Math.round(player.health))}`;
    }
    const coreShare = round.coreHealth / round.coreMax;
    if (this.cache.core !== Math.round(coreShare * 100)) {
      this.cache.core = Math.round(coreShare * 100);
      this.setBar(this.core, coreShare);
      this.coreText.textContent = `${Math.max(0, Math.round(round.coreHealth))}`;
    }
    const heatShare = lance.heat / 100;
    if (this.cache.heat !== Math.round(heatShare * 20)) {
      this.cache.heat = Math.round(heatShare * 20);
      this.setBar(this.heat, heatShare);
      this.heatText.textContent = lance.overheated ? 'VENT' : `${Math.round(lance.heat)}`;
    }
    if (this.cache.score !== round.score) {
      this.cache.score = round.score;
      this.score.textContent = `${round.score}`;
    }
    if (this.cache.wave !== round.wave) {
      this.cache.wave = round.wave;
      this.wave.textContent = `${Math.min(round.wave, WAVE_PLAN.length)}/${WAVE_PLAN.length}`;
    }
    if (this.cache.salvage !== round.salvage) {
      this.cache.salvage = round.salvage;
      this.salvage.textContent = `${round.salvage}`;
    }
    if (this.cache.flares !== lance.flareCharges) {
      this.cache.flares = lance.flareCharges;
      this.flares.textContent = `${lance.flareCharges}`;
    }
    const banner = round.bannerTimer > 0 ? round.banner : '';
    if (this.cache.banner !== banner) {
      this.cache.banner = banner;
      this.banner.textContent = banner;
      this.banner.style.opacity = banner === '' ? '0' : '1';
    }
    this.hurt.style.opacity = player.hurtTimer > 0 ? '0.55' : '0';
    this.crosshair.style.opacity = round.state === STATE.PLAYING ? '1' : '0';
    this.hitmark.style.opacity = this.hitTimer > 0 ? '1' : '0';
    this.hitmark.style.color = this.hitmark.dataset.kind === 'kill' ? '#ff8f6b'
      : this.hitmark.dataset.kind === 'crit' ? '#ffe9b0' : '#dff2ff';
    this.hintLine.style.opacity = this.hintTimer > 0 ? '1' : '0';
    this.heat.style.filter = this.dryTimer > 0 ? 'brightness(2.4) saturate(2)' : 'none';
    this.showOverlay(round.state, round);
  }

  showOverlay(state, round) {
    const wanted =
      state === STATE.TITLE ? 'title'
        : state === STATE.UPGRADE ? 'upgrade'
          : state === STATE.DEFEAT || state === STATE.VICTORY ? 'end'
            : state === STATE.PAUSED ? 'pause'
              : '';
    if (this.cache.overlay === wanted) return;
    this.cache.overlay = wanted;
    this.overlayTitle.classList.toggle('on', wanted === 'title');
    this.overlayUpgrade.classList.toggle('on', wanted === 'upgrade');
    this.overlayEnd.classList.toggle('on', wanted === 'end');
    this.overlayPause.classList.toggle('on', wanted === 'pause');
    if (wanted === 'upgrade') this.renderUpgrade(round);
    if (wanted === 'end') this.renderEnd(round);
  }

  renderUpgrade(round) {
    this.upgradeSalvage.textContent = `${round.salvage}`;
    this.upgradeCards.textContent = '';
    round.offer.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = `${index + 1}`;
      const name = document.createElement('h3');
      name.textContent = item.name;
      const text = document.createElement('p');
      text.textContent = item.text;
      const cost = document.createElement('span');
      cost.className = item.cost <= round.salvage ? 'cost' : 'cost short';
      cost.textContent = `${item.cost} salvage`;
      card.append(key, name, text, cost);
      this.upgradeCards.append(card);
    });
  }

  renderEnd(round) {
    const won = round.state === STATE.VICTORY;
    this.endTitle.textContent = won ? 'THE LIGHT HOLDS' : 'THE LIGHT GOES OUT';
    this.endTitle.className = won ? 'won' : 'lost';
    this.endReason.textContent = round.endReason;
    this.endScore.textContent = `${round.score}`;
    this.endWave.textContent = `${round.wave} / ${WAVE_PLAN.length}`;
    this.endKills.textContent = `${round.kills}`;
    this.endAccuracy.textContent = `${round.accuracy}%`;
  }
}
