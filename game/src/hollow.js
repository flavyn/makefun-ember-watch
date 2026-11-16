// The Hollow: what comes in from the sea. One pool, one behaviour tree, no allocation in the step.
// A Hollow walks at the beacon, stops to break it, and turns on the keeper when it hears the lance.

import * as THREE from 'three';
import { HOLLOWS, POOL_MAX, PALETTE, SLOW } from './tuning.js';
import { pushOutOfWalls, pushOutOfCore } from './world.js';

const BODY = new THREE.CylinderGeometry(0.34, 0.52, 1.45, 8);
const HEAD = new THREE.SphereGeometry(0.26, 10, 8);
const EYE = new THREE.SphereGeometry(0.075, 6, 6);

const AGGRO_SECONDS = 3.2;
const SIGHT = 8.5;
const HEARING = 13.0;
const STRIKE_REACH = 1.35;

export class Hollows {
  constructor(scene, world, sound) {
    this.scene = scene;
    this.world = world;
    this.sound = sound;
    this.items = [];
    this.aliveCount = 0;
    this.hitHead = false;
    this.hitDistance = 0;
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.hollow, roughness: 0.88 });
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: PALETTE.eye,
      emissive: PALETTE.eye,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    });
    for (let i = 0; i < POOL_MAX; i += 1) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(BODY, bodyMaterial);
      body.position.y = 0.72;
      const head = new THREE.Mesh(HEAD, bodyMaterial);
      head.position.y = 1.58;
      const eyeLeft = new THREE.Mesh(EYE, eyeMaterial);
      eyeLeft.position.set(-0.1, 1.62, -0.22);
      const eyeRight = new THREE.Mesh(EYE, eyeMaterial);
      eyeRight.position.set(0.1, 1.62, -0.22);
      group.add(body, head, eyeLeft, eyeRight);
      group.visible = false;
      scene.add(group);
      this.items.push({
        group,
        body,
        alive: false,
        type: 'crawler',
        x: 0,
        z: 0,
        hp: 1,
        maxHp: 1,
        speed: 1,
        radius: 0.42,
        coreDamage: 10,
        playerDamage: 8,
        score: 10,
        salvage: 3,
        aggro: 0,
        stun: 0,
        strikeTimer: 0,
        lungeTimer: 0,
        phase: 0,
        facing: 0,
        scale: 1,
        bodyMul: 1,
        headMul: 1,
        slowTimer: 0,
      });
    }
  }

  reset() {
    for (const item of this.items) {
      item.alive = false;
      item.group.visible = false;
    }
    this.aliveCount = 0;
  }

  spawn(type, x, z, wave) {
    const plan = HOLLOWS[type];
    let item = null;
    for (const candidate of this.items) {
      if (!candidate.alive) {
        item = candidate;
        break;
      }
    }
    if (item === null) return false;
    const hpScale = 1 + (wave - 1) * 0.055;
    const speedScale = 1 + (wave - 1) * 0.03;
    item.alive = true;
    item.type = type;
    item.x = x;
    item.z = z;
    item.maxHp = plan.hp * hpScale;
    item.hp = item.maxHp;
    item.speed = plan.speed * speedScale;
    item.radius = plan.radius;
    item.coreDamage = plan.coreDamage;
    item.playerDamage = plan.playerDamage;
    item.score = plan.score;
    item.salvage = plan.salvage;
    item.scale = plan.scale;
    item.bodyMul = plan.bodyMul ?? 1;
    item.headMul = plan.headMul ?? 1;
    item.slowTimer = 0;
    item.aggro = 0;
    item.stun = 0;
    item.strikeTimer = 0;
    item.lungeTimer = 0;
    item.phase = (this.aliveCount % 7) * 0.9;
    item.group.visible = true;
    item.group.position.set(x, 0, z);
    item.group.scale.setScalar(plan.scale);
    item.group.rotation.set(0, 0, 0);
    this.aliveCount += 1;
    return true;
  }

  // One step of every living Hollow: hear the lance, pick a target, close in, break it.
  step(dt, player, api) {
    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      if (!item.alive) continue;
      if (item.stun > 0) {
        item.stun -= dt;
        item.phase += dt * 2.4;
        item.group.position.set(item.x, 0.12 + Math.sin(item.phase) * 0.06, item.z);
        continue;
      }
      const toPlayerX = player.pos.x - item.x;
      const toPlayerZ = player.pos.z - item.z;
      const playerGap = Math.hypot(toPlayerX, toPlayerZ);
      if (item.aggro > 0) item.aggro -= dt;
      if (playerGap < SIGHT) item.aggro = Math.max(item.aggro, 0.6);

      const chasePlayer = item.aggro > 0 && playerGap > 0.6;
      const targetX = chasePlayer ? player.pos.x : this.world.core.x;
      const targetZ = chasePlayer ? player.pos.z : this.world.core.z;
      let dirX = targetX - item.x;
      let dirZ = targetZ - item.z;
      const gap = Math.hypot(dirX, dirZ) || 1;
      dirX /= gap;
      dirZ /= gap;

      let reach = chasePlayer ? STRIKE_REACH : this.world.core.radius + item.radius + 0.35;
      if (item.type === 'striker' && gap > 2.6 && gap < 5.4) {
        if (item.lungeTimer <= 0) {
          item.lungeTimer = 2.3;
          item.strikeTimer = 0.34;
        }
      }
      if (item.lungeTimer > 0) item.lungeTimer -= dt;
      const lunging = item.strikeTimer > 0;
      if (lunging) item.strikeTimer -= dt;
      // A Frost Wick hit leaves the target slow for a moment, which is what buys the next shot.
      if (item.slowTimer > 0) item.slowTimer -= dt;
      const chilled = item.slowTimer > 0 ? SLOW.speedMul : 1;
      const speed = item.speed * (lunging ? 2.35 : 1) * chilled;

      if (gap > reach) {
        item.x += dirX * speed * dt;
        item.z += dirZ * speed * dt;
      } else if (chasePlayer) {
        api.damagePlayer(item.playerDamage * dt);
        item.strikeTimer = 0.12;
      } else {
        api.damageCore(item.coreDamage * dt);
      }

      pushOutOfWalls(item, item.radius, this.world.walls);
      pushOutOfCore(item, item.radius, this.world.core);
      // The eyes sit on the group's -z side, so the turn has to point -z at the target.
      item.facing = Math.atan2(-dirX, -dirZ);
      item.phase += dt * (2.2 + speed * 0.5);
      const bob = Math.abs(Math.sin(item.phase)) * 0.09;
      item.group.position.set(item.x, bob, item.z);
      item.group.rotation.y = item.facing;
      item.body.rotation.z = Math.sin(item.phase) * 0.06;
    }
  }

  // Heard: every Hollow close enough to the shot turns its head toward the keeper for a moment.
  alert(x, z, radius) {
    for (const item of this.items) {
      if (!item.alive) continue;
      const gap = Math.hypot(item.x - x, item.z - z);
      if (gap <= radius) item.aggro = AGGRO_SECONDS;
    }
  }

  // A hit is worth what the part is worth: the warden's plate eats body shots and pays for the head.
  applyDamage(index, amount, head) {
    const item = this.items[index];
    if (!item || !item.alive) return false;
    item.hp -= amount * (head ? item.headMul : item.bodyMul);
    if (item.hp > 0) return false;
    item.alive = false;
    item.group.visible = false;
    this.aliveCount -= 1;
    return true;
  }

  // Closest living Hollow along a ray: head or body, whichever sphere the ray meets first.
  raycast(origin, dir, maxDistance) {
    let bestIndex = -1;
    let bestDistance = maxDistance;
    let bestHead = false;
    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      if (!item.alive) continue;
      const bodyY = 0.92 * item.scale;
      const headY = 1.6 * item.scale;
      const bodyRadius = 0.46 * item.scale;
      const headRadius = 0.27 * item.scale;
      const bodyHit = sphereAlong(origin, dir, item.x, bodyY, item.z, bodyRadius, bestDistance);
      if (bodyHit > 0 && bodyHit < bestDistance) {
        bestDistance = bodyHit;
        bestIndex = i;
        bestHead = false;
      }
      const headHit = sphereAlong(origin, dir, item.x, headY, item.z, headRadius, bestDistance);
      if (headHit > 0 && headHit < bestDistance) {
        bestDistance = headHit;
        bestIndex = i;
        bestHead = true;
      }
    }
    this.hitHead = bestHead;
    this.hitDistance = bestDistance;
    return bestIndex;
  }

  // Every living Hollow within a radius of a point: the flare's list, written into a reused array.
  gatherWithin(x, z, radius, out) {
    out.length = 0;
    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      if (!item.alive) continue;
      if (Math.hypot(item.x - x, item.z - z) <= radius + item.radius) out.push(i);
    }
    return out;
  }

  stun(index, seconds) {
    const item = this.items[index];
    if (item && item.alive) item.stun = Math.max(item.stun, seconds);
  }
}

// Distance along the ray to a sphere, or -1 when the ray misses or the sphere sits past the limit.
function sphereAlong(origin, dir, cx, cy, cz, radius, limit) {
  const lx = cx - origin.x;
  const ly = cy - origin.y;
  const lz = cz - origin.z;
  const t = lx * dir.x + ly * dir.y + lz * dir.z;
  if (t <= 0 || t > limit) return -1;
  const px = lx - dir.x * t;
  const py = ly - dir.y * t;
  const pz = lz - dir.z * t;
  if (px * px + py * py + pz * pz > radius * radius) return -1;
  return t;
}

// A running count the round screen can show without walking the pool twice.
export function livingCount(hollows) {
  return hollows.aliveCount;
}
