// The ember lance: heat instead of ammunition, a vent instead of a reload, and flares for the crowd.
// This file owns the weapon's numbers and its projectiles; it never decides what a hit means.

import * as THREE from 'three';
import { LANCE, FLARE } from './tuning.js';

const FLARE_POOL = 4;

export class Lance {
  constructor(scene, sound) {
    this.scene = scene;
    this.sound = sound;
    this.heat = 0;
    this.overheated = false;
    this.ventTimer = 0;
    this.fireTimer = 0;
    this.recoil = 0;
    this.damageMul = 1;
    this.ventMul = 1;
    this.pierce = 0;
    this.chill = false;
    this.flareCharges = FLARE.charges;
    this.flareCap = FLARE.charges;
    this.flareTimer = 0;
    this.flareMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffb24a, emissiveIntensity: 2.4 }),
    );
    this.flares = [];
    for (let i = 0; i < FLARE_POOL; i += 1) {
      const mesh = this.flareMesh.clone();
      mesh.visible = false;
      scene.add(mesh);
      this.flares.push({ mesh, alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, fuse: 0 });
    }
  }

  reset() {
    this.heat = 0;
    this.overheated = false;
    this.ventTimer = 0;
    this.fireTimer = 0;
    this.recoil = 0;
    this.pierce = 0;
    this.chill = false;
    this.flareCharges = FLARE.charges;
    this.flareTimer = 0;
    for (const flare of this.flares) {
      flare.alive = false;
      flare.mesh.visible = false;
    }
  }

  get heatShare() {
    return this.heat / LANCE.heatMax;
  }

  get spread() {
    return LANCE.spreadStill + this.heatShare * LANCE.spreadHeat;
  }

  // Heat, vent and flare recovery: the part of the weapon that runs whether or not you fire.
  step(dt, moving) {
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.ventTimer > 0) {
      this.ventTimer -= dt;
      this.heat -= LANCE.ventPerSecond * this.ventMul * dt;
      if (this.heat <= 0) {
        this.heat = 0;
        this.overheated = false;
      }
    } else if (this.heat > 0 && !this.overheated) {
      this.heat -= 6 * dt;
      if (this.heat < 0) this.heat = 0;
    }
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 0.12);
    if (this.flareCharges < this.flareCap) {
      this.flareTimer += dt;
      if (this.flareTimer >= FLARE.regen) {
        this.flareTimer -= FLARE.regen;
        this.flareCharges += 1;
      }
    } else {
      this.flareTimer = 0;
    }
    this.moving = moving;
  }

  canFire() {
    return this.fireTimer <= 0 && !this.overheated && this.heat < LANCE.heatMax;
  }

  // Pulling the trigger on a locked lance: the click, and a short wait before the next one.
  registerDry() {
    if (this.fireTimer > 0) return;
    this.fireTimer = 0.28;
    this.sound.dry();
  }

  // Called by the round after a hit lands: cost, recoil, and the lock that forces a vent.
  registerShot() {
    this.fireTimer = LANCE.fireInterval;
    this.heat += LANCE.heatPerShot;
    this.recoil = Math.min(0.06, this.recoil + LANCE.recoilPitch);
    if (this.heat >= LANCE.heatMax) {
      this.heat = LANCE.heatMax;
      this.overheated = true;
      this.sound.vent();
    }
  }

  vent() {
    if (this.ventTimer > 0 || this.heat <= 0) return false;
    this.ventTimer = LANCE.ventDelay;
    this.sound.vent();
    return true;
  }

  throwFlare(camera) {
    if (this.flareCharges <= 0) return false;
    const flare = this.flares.find((item) => !item.alive);
    if (!flare) return false;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    flare.alive = true;
    flare.x = camera.position.x + dir.x * 0.5;
    flare.y = camera.position.y + dir.y * 0.5;
    flare.z = camera.position.z + dir.z * 0.5;
    flare.vx = dir.x * 15;
    flare.vy = dir.y * 15 + 3.4;
    flare.vz = dir.z * 15;
    flare.fuse = FLARE.fuse;
    flare.mesh.visible = true;
    flare.mesh.position.set(flare.x, flare.y, flare.z);
    this.flareCharges -= 1;
    this.sound.flare();
    return true;
  }

  // Flares fly, fall and burst: the burst hands its point back so the round can apply the blast.
  stepFlares(dt, onBurst) {
    let burst = null;
    for (const flare of this.flares) {
      if (!flare.alive) continue;
      flare.fuse -= dt;
      flare.vy -= 16 * dt;
      flare.x += flare.vx * dt;
      flare.y += flare.vy * dt;
      flare.z += flare.vz * dt;
      if (flare.y < 0.16) {
        flare.y = 0.16;
        flare.vy = Math.abs(flare.vy) * 0.32;
        flare.vx *= 0.62;
        flare.vz *= 0.62;
      }
      flare.mesh.position.set(flare.x, flare.y, flare.z);
      if (flare.fuse <= 0) {
        flare.alive = false;
        flare.mesh.visible = false;
        burst = { x: flare.x, z: flare.z };
        onBurst(flare.x, flare.z);
      }
    }
    return burst;
  }
}
