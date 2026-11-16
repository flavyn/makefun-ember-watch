// The rock, its lanes and its lamps: geometry is built once here and the step only reads the boxes.
// Walls are half-extent boxes in the x/z plane, so collision is arithmetic and never a scene query.

import * as THREE from 'three';
import { ARENA, PALETTE } from './tuning.js';

const WALL_BLOCKS = [
  { x: 0, z: 0, w: 2.6, d: 2.6, h: 3.6, core: true },
  { x: -9, z: -6, w: 2.2, d: 5.5, h: 2.4 },
  { x: 9, z: -6, w: 2.2, d: 5.5, h: 2.4 },
  { x: -9, z: 8, w: 2.2, d: 4.5, h: 2.4 },
  { x: 9, z: 8, w: 2.2, d: 4.5, h: 2.4 },
  { x: -16, z: -14, w: 3.4, d: 3.4, h: 3.0 },
  { x: 16, z: -14, w: 3.4, d: 3.4, h: 3.0 },
  { x: -16, z: 15, w: 3.4, d: 3.4, h: 3.0 },
  { x: 16, z: 15, w: 3.4, d: 3.4, h: 3.0 },
  { x: 0, z: -15, w: 5.0, d: 1.6, h: 2.0 },
  { x: 0, z: 15, w: 5.0, d: 1.6, h: 2.0 },
];

const SPAWN_POINTS = [
  { x: -19, z: -19 }, { x: 0, z: -20 }, { x: 19, z: -19 },
  { x: -20, z: 0 }, { x: 20, z: 0 },
  { x: -19, z: 19 }, { x: 0, z: 20 }, { x: 19, z: 19 },
];

const POSTS = [
  { x: -6, z: 6 }, { x: 6, z: 6 }, { x: -6, z: -6 }, { x: 6, z: -6 },
];

export function buildWorld(scene) {
  const walls = [];
  const half = ARENA.half;

  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.032);
  scene.background = new THREE.Color(PALETTE.sky);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshStandardMaterial({ color: 0x070f18, roughness: 0.32, metalness: 0.55 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.55;
  scene.add(sea);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 64),
    new THREE.MeshStandardMaterial({ color: 0x233240, roughness: 0.82, metalness: 0.12 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const rockMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.rock, roughness: 0.94 });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.trim,
    emissive: PALETTE.ember,
    emissiveIntensity: 0.65,
    roughness: 0.6,
  });
  const box = new THREE.BoxGeometry(1, 1, 1);

  const stack = (x, z, width, depth, height, material) => {
    const mesh = new THREE.Mesh(box, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
    return mesh;
  };

  for (const block of WALL_BLOCKS) {
    stack(block.x, block.z, block.w, block.d, block.h, block.core ? trimMaterial : rockMaterial);
    if (block.core) continue;
    walls.push({ cx: block.x, cz: block.z, hw: block.w / 2, hd: block.d / 2 });
  }

  const rim = half + 0.5;
  stack(0, -rim, half * 2 + 2, 1, 3.2, rockMaterial);
  stack(0, rim, half * 2 + 2, 1, 3.2, rockMaterial);
  stack(-rim, 0, 1, half * 2 + 2, 3.2, rockMaterial);
  stack(rim, 0, 1, half * 2 + 2, 3.2, rockMaterial);
  walls.push({ cx: 0, cz: -rim, hw: half + 1, hd: 0.5 });
  walls.push({ cx: 0, cz: rim, hw: half + 1, hd: 0.5 });
  walls.push({ cx: -rim, cz: 0, hw: 0.5, hd: half + 1 });
  walls.push({ cx: rim, cz: 0, hw: 0.5, hd: half + 1 });

  for (const post of POSTS) {
    stack(post.x, post.z, 0.22, 0.22, 2.6, rockMaterial);
    const lamp = new THREE.PointLight(PALETTE.ember, 6, 11, 2);
    lamp.position.set(post.x, 2.5, post.z);
    scene.add(lamp);
    stack(post.x, post.z, 0.34, 0.34, 0.12, trimMaterial);
  }

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 1.5, 4.2, 16),
    new THREE.MeshStandardMaterial({
      color: 0x1a1408,
      emissive: PALETTE.ember,
      emissiveIntensity: 2.2,
      roughness: 0.3,
    }),
  );
  beacon.position.set(ARENA.coreX, 2.1, ARENA.coreZ);
  scene.add(beacon);

  const lampGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 18, 14),
    new THREE.MeshStandardMaterial({
      color: PALETTE.beacon,
      emissive: PALETTE.ember,
      emissiveIntensity: 2.6,
      roughness: 0.25,
    }),
  );
  lampGlass.position.set(ARENA.coreX, 4.5, ARENA.coreZ);
  scene.add(lampGlass);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.34, 1.25, 16), rockMaterial);
  roof.position.set(ARENA.coreX, 5.55, ARENA.coreZ);
  scene.add(roof);

  for (let ring = 0; ring < 3; ring += 1) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.28 - ring * 0.14, 0.07, 5, 18), trimMaterial);
    band.rotation.x = Math.PI / 2;
    band.position.set(ARENA.coreX, 1.1 + ring * 1.15, ARENA.coreZ);
    scene.add(band);
  }

  const beaconLight = new THREE.PointLight(PALETTE.ember, 34, 34, 1.5);
  beaconLight.position.set(ARENA.coreX, 3.6, ARENA.coreZ);
  scene.add(beaconLight);

  const lampPool = new THREE.Mesh(
    new THREE.CircleGeometry(9.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xffb24a, transparent: true, opacity: 0.09 }),
  );
  lampPool.rotation.x = -Math.PI / 2;
  lampPool.position.set(ARENA.coreX, 0.02, ARENA.coreZ);
  scene.add(lampPool);

  const gateMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.hollow,
    emissive: PALETTE.eye,
    emissiveIntensity: 0.4,
    roughness: 0.7,
  });
  // Spawn gates lie flat on the deck: a ring on the ground reads as a gate, a floating one reads as a bug.
  for (const spawn of SPAWN_POINTS) {
    const gate = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.25, 24), gateMaterial);
    gate.rotation.x = -Math.PI / 2;
    gate.position.set(spawn.x * 0.86, 0.03, spawn.z * 0.86);
    scene.add(gate);
  }

  scene.add(new THREE.AmbientLight(0x4b7092, 3.5));
  const moon = new THREE.DirectionalLight(0xbad6ee, 2.5);
  moon.position.set(-14, 22, -10);
  scene.add(moon);
  const fill = new THREE.HemisphereLight(0x3f6b90, 0x101b26, 2.0);
  scene.add(fill);

  return {
    walls,
    spawns: SPAWN_POINTS,
    core: { x: ARENA.coreX, z: ARENA.coreZ, radius: ARENA.coreRadius },
    beacon,
    beaconLight,
  };
}

// A circle against the wall boxes: push the point out along the shortest way, no ray cast needed.
export function pushOutOfWalls(pos, radius, walls) {
  for (let i = 0; i < walls.length; i += 1) {
    const wall = walls[i];
    const nearX = Math.max(wall.cx - wall.hw, Math.min(pos.x, wall.cx + wall.hw));
    const nearZ = Math.max(wall.cz - wall.hd, Math.min(pos.z, wall.cz + wall.hd));
    const awayX = pos.x - nearX;
    const awayZ = pos.z - nearZ;
    const gap = awayX * awayX + awayZ * awayZ;
    if (gap >= radius * radius) continue;
    if (gap > 1e-7) {
      const len = Math.sqrt(gap);
      pos.x = nearX + (awayX / len) * radius;
      pos.z = nearZ + (awayZ / len) * radius;
      continue;
    }
    const depthX = wall.hw + radius - Math.abs(pos.x - wall.cx);
    const depthZ = wall.hd + radius - Math.abs(pos.z - wall.cz);
    if (depthX < depthZ) pos.x += pos.x >= wall.cx ? depthX : -depthX;
    else pos.z += pos.z >= wall.cz ? depthZ : -depthZ;
  }
  return pos;
}

// Keep a body out of the beacon and inside the rim, shared by player and Hollow alike.
export function pushOutOfCore(pos, radius, core) {
  const dx = pos.x - core.x;
  const dz = pos.z - core.z;
  const need = radius + core.radius;
  const gap = dx * dx + dz * dz;
  if (gap >= need * need || gap < 1e-7) return pos;
  const len = Math.sqrt(gap);
  pos.x = core.x + (dx / len) * need;
  pos.z = core.z + (dz / len) * need;
  return pos;
}
