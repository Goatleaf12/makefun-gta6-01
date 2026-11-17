// Solmar Bay — pedestrians: locals living on the sidewalks.
// Each walker owns a sidewalk loop around one block: four corners,
// walked in order, with a little bob and a turn at every corner.
// The crowd is not one kind of person: most stroll, some jog, a vendor
// minds a cart at a corner, tourists pause to look around, and a dog
// walker trails a small dog on a lead. Kinds change how they move and
// how they react when Dax shoves past — or punches.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { blockCorners, randomSidewalkPoint } from './roads.js';
import { mulberry32, pick } from './rng.js';

const SHIRTS = [0xd94f3d, 0x3d7dd9, 0xe8c832, 0x4fbf7a, 0xe8e8e8, 0xc25fd9, 0x2e2e33, 0xff8c42];
const PANTS = [0x2e3a4d, 0x4d3a2e, 0x333333, 0x5a5a6e];
const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a3b];
const HATS = [null, 0xc23b2e, 0xe8c832, 0x2e6fc2, 0x3fae5a];

// One walker mesh: body, head, legs that swing, and the extras that
// make a kind read at a glance — a cap, a cart, a camera, a dog.
function makeWalkerMesh(rng, kind) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRTS) });
  const pants = new THREE.MeshLambertMaterial({ color: pick(rng, PANTS) });
  const skin = new THREE.MeshLambertMaterial({ color: pick(rng, SKINS) });
  // A little height variety so the crowd does not look cloned.
  const scale = 0.92 + rng() * 0.16;
  group.scale.setScalar(scale);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.9, 8), shirt);
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.75;
  group.add(head);
  const hatColor = pick(rng, HATS);
  if (hatColor !== null) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.12, 10),
      new THREE.MeshLambertMaterial({ color: hatColor }),
    );
    cap.position.y = 1.95;
    group.add(cap);
  }
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), pants);
  legL.position.set(-0.14, 0.3, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), pants);
  legR.position.set(0.14, 0.3, 0);
  group.add(legR);
  group.userData.legL = legL;
  group.userData.legR = legR;
  // Kind extras, kept in userData so the update loop can move them.
  if (kind === 'vendor') {
    const cart = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.5, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x8a6a44 }),
    );
    cart.position.set(0.8, 0.45, 0.3);
    group.add(cart);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.08, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xd94f3d }),
    );
    awning.position.set(0.8, 1.0, 0.3);
    group.add(awning);
  }
  if (kind === 'tourist') {
    const camera = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x22262e }),
    );
    camera.position.set(0, 1.35, 0.28);
    group.add(camera);
  }
  if (kind === 'dog') {
    const dog = new THREE.Group();
    const dogBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.3, 0.28),
      new THREE.MeshLambertMaterial({ color: 0x8a6a44 }),
    );
    dogBody.position.y = 0.3;
    dog.add(dogBody);
    const dogHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x8a6a44 }),
    );
    dogHead.position.set(0.35, 0.42, 0);
    dog.add(dogHead);
    dog.position.set(-0.6, 0, -0.8);
    group.add(dog);
    group.userData.dog = dog;
  }
  return group;
}

export class Pedestrians {
  constructor(scene, seed = 99) {
    this.scene = scene;
    this.rng = mulberry32(seed);
    // {mesh, kind, corners, cornerIndex, speed, phase, pauseTimer, x, z,
    //  downTimer, fleeTimer, fleeX, fleeZ}
    this.walkers = [];
    const blocks = CONFIG.gridCount - 1;
    for (let i = 0; i < CONFIG.pedestrians; i++) {
      const roll = this.rng();
      const kind = roll < 0.55 ? 'walker'
        : roll < 0.7 ? 'jogger'
        : roll < 0.8 ? 'vendor'
        : roll < 0.9 ? 'tourist' : 'dog';
      const bx = Math.floor(this.rng() * blocks);
      const bz = Math.floor(this.rng() * blocks);
      const corners = blockCorners(bx, bz);
      const start = Math.floor(this.rng() * 4);
      const mesh = makeWalkerMesh(this.rng, kind);
      scene.add(mesh);
      const startPoint = kind === 'vendor'
        ? corners[start]
        : randomSidewalkPoint(this.rng);
      this.walkers.push({
        mesh,
        kind,
        corners,
        cornerIndex: (start + 1) % 4,
        speed: kind === 'jogger' ? 3.2 + this.rng() * 0.8
          : kind === 'vendor' ? 0
          : 1.1 + this.rng() * 0.9,
        phase: this.rng() * Math.PI * 2,
        pauseTimer: kind === 'tourist' ? 2 + this.rng() * 2 : 0,
        x: startPoint.x,
        z: startPoint.z,
        downTimer: 0,
        fleeTimer: 0,
        fleeX: 0,
        fleeZ: 0,
      });
    }
  }

  positions() {
    return this.walkers.map((w) => ({ x: w.x, z: w.z, kind: w.kind, down: w.downTimer > 0 }));
  }

  // A punch lands: the walker goes down for a few seconds, then gets
  // up and runs from the spot. Returns the walker that was hit, or null.
  knockDown(x, z, radius) {
    let best = null;
    let bestDist = radius;
    for (const w of this.walkers) {
      if (w.downTimer > 0) continue;
      const d = Math.hypot(w.x - x, w.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = w;
      }
    }
    if (!best) return null;
    best.downTimer = 3;
    best.fleeTimer = 6;
    // Flee away from the punch, along the sidewalk if possible.
    const dx = best.x - x;
    const dz = best.z - z;
    const len = Math.hypot(dx, dz) || 1;
    best.fleeX = dx / len;
    best.fleeZ = dz / len;
    return best;
  }

  update(dt, time) {
    for (const w of this.walkers) {
      // Knocked down: flat on the ground, legs still.
      if (w.downTimer > 0) {
        w.downTimer -= dt;
        w.mesh.rotation.x = w.downTimer > 0 ? -Math.PI / 2 + 0.2 : 0;
        w.mesh.position.y = 0.2;
        continue;
      }
      w.mesh.rotation.x = 0;
      // Fleeing: run straight away from the punch for a while.
      if (w.fleeTimer > 0) {
        w.fleeTimer -= dt;
        const step = 4.5 * dt;
        w.x += w.fleeX * step;
        w.z += w.fleeZ * step;
        w.mesh.position.set(w.x, 0, w.z);
        w.mesh.rotation.y = Math.atan2(w.fleeX, w.fleeZ);
        const swing = Math.sin(time * 10 + w.phase) * 0.7;
        w.mesh.userData.legL.rotation.x = swing;
        w.mesh.userData.legR.rotation.x = -swing;
        continue;
      }
      // Vendors stay at their cart; everyone else walks the block loop.
      if (w.kind === 'vendor') {
        w.mesh.position.set(w.x, 0, w.z);
        w.mesh.rotation.y += dt * 0.2;
        continue;
      }
      if (w.pauseTimer > 0) {
        w.pauseTimer -= dt;
        w.mesh.userData.legL.rotation.x *= 0.8;
        w.mesh.userData.legR.rotation.x *= 0.8;
        continue;
      }
      const target = w.corners[w.cornerIndex];
      const dx = target.x - w.x;
      const dz = target.z - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.4) {
        w.cornerIndex = (w.cornerIndex + 1) % 4;
        const pauseChance = w.kind === 'tourist' ? 0.5 : w.kind === 'jogger' ? 0.05 : 0.25;
        if (this.rng() < pauseChance) w.pauseTimer = 1 + this.rng() * 2.5;
        continue;
      }
      const step = Math.min(dist, w.speed * dt);
      w.x += (dx / dist) * step;
      w.z += (dz / dist) * step;
      w.mesh.position.set(w.x, 0, w.z);
      w.mesh.rotation.y = Math.atan2(dx, dz);
      // Walk cycle: legs swing opposite, body bobs a touch. Joggers
      // swing harder and faster; the dog trots behind its walker.
      const rate = w.kind === 'jogger' ? 10 : 6;
      const amp = w.kind === 'jogger' ? 0.65 : 0.45;
      const swing = Math.sin(time * rate + w.phase) * amp;
      w.mesh.userData.legL.rotation.x = swing;
      w.mesh.userData.legR.rotation.x = -swing;
      w.mesh.position.y = Math.abs(Math.sin(time * rate + w.phase)) * 0.05;
      if (w.mesh.userData.dog) {
        w.mesh.userData.dog.position.x = -0.6 + Math.sin(time * rate + w.phase) * 0.15;
        w.mesh.userData.dog.rotation.y = Math.sin(time * rate + w.phase) * 0.3;
      }
    }
  }
}
