// The keeper: acceleration, crouch and wall collision, and the camera that follows the eye.
// Damage is taken here and reported once, so the round can end on the exact step the health runs out.

import { PLAYER } from './tuning.js';
import { pushOutOfWalls, pushOutOfCore } from './world.js';

const WALK_ACCEL = 1.0;

export class Player {
  constructor() {
    this.pos = { x: 0, y: PLAYER.eye, z: 17 };
    this.vel = { x: 0, z: 0 };
    this.yaw = 0;
    this.pitch = -0.04;
    this.health = PLAYER.maxHealth;
    this.maxHealth = PLAYER.maxHealth;
    this.crouch = false;
    this.speedMul = 1;
    this.hurtTimer = 0;
    this.stepTimer = 0;
    this.bob = 0;
  }

  reset() {
    this.pos.x = 0;
    this.pos.z = 17;
    this.vel.x = 0;
    this.vel.z = 0;
    this.yaw = 0;
    this.pitch = -0.04;
    this.health = this.maxHealth;
    this.crouch = false;
    this.hurtTimer = 0;
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0023;
    this.pitch -= dy * 0.0021;
    if (this.pitch > 1.15) this.pitch = 1.15;
    if (this.pitch < -1.15) this.pitch = -1.15;
  }

  step(dt, input, walls, core, sound) {
    this.crouch = input.held('ControlLeft') || input.held('KeyC');
    const wishX = (input.held('KeyD') ? 1 : 0) - (input.held('KeyA') ? 1 : 0);
    const wishZ = (input.held('KeyS') ? 1 : 0) - (input.held('KeyW') ? 1 : 0);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // Camera forward is (-sin yaw, -cos yaw), so the wish vector turns with it and not against it.
    let ax = wishX * cos + wishZ * sin;
    let az = wishZ * cos - wishX * sin;
    const wishLen = Math.hypot(ax, az);
    if (wishLen > 0) {
      ax /= wishLen;
      az /= wishLen;
      const push = PLAYER.accel * WALK_ACCEL * (this.crouch ? 0.62 : 1) * dt;
      this.vel.x += ax * push;
      this.vel.z += az * push;
    }
    const drag = Math.max(0, 1 - PLAYER.friction * dt);
    this.vel.x *= drag;
    this.vel.z *= drag;

    const cap = (this.crouch ? PLAYER.crouchSpeed : PLAYER.maxSpeed) * this.speedMul;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed > cap) {
      this.vel.x = (this.vel.x / speed) * cap;
      this.vel.z = (this.vel.z / speed) * cap;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    pushOutOfWalls(this.pos, PLAYER.radius, walls);
    pushOutOfCore(this.pos, PLAYER.radius, core);
    const limit = core.x + 30;
    if (this.pos.x < -limit) this.pos.x = -limit;
    if (this.pos.x > limit) this.pos.x = limit;
    if (this.pos.z < -limit) this.pos.z = -limit;
    if (this.pos.z > limit) this.pos.z = limit;

    const eye = this.crouch ? PLAYER.crouchEye : PLAYER.eye;
    const moving = speed > 0.6;
    if (moving) {
      this.bob += dt * (this.crouch ? 5.5 : 9.0) * (speed / PLAYER.maxSpeed);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.crouch ? 0.62 : 0.42;
        sound.step();
      }
    } else {
      this.bob += dt * 1.2;
      this.stepTimer = 0;
    }
    this.pos.y = eye + Math.sin(this.bob) * (moving ? 0.035 : 0.012);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
  }

  hurt(amount, sound) {
    if (this.health <= 0) return;
    this.health -= amount;
    this.hurtTimer = PLAYER.hurtFlash;
    sound.hurt();
    if (this.health < 0) this.health = 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  get alive() {
    return this.health > 0;
  }
}

// The camera is written from the player's state every frame; the simulation never reads the camera.
export function poseCamera(camera, player) {
  camera.position.set(player.pos.x, player.pos.y, player.pos.z);
  camera.rotation.set(0, 0, 0);
  camera.rotateY(player.yaw);
  camera.rotateX(player.pitch);
  return camera;
}
