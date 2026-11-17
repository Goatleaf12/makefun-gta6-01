// Solmar Bay — Bay PD: the wanted system and the police who answer it.
// Wanted runs 0–5 stars. Stealing a car, hitting a pedestrian or
// punching someone in front of a cruiser raises it; cruisers spawn on
// roads near the player and chase, steering toward the player and
// ramming at close range. From 3 stars up the PD also throws up
// roadblocks: parked cruisers across the road ahead of the player, so
// the chase is not only behind you. Break away, slow down and stay out
// of trouble, and the heat cools off one star at a time.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeCarMesh, Car, collideCar } from './vehicles.js';
import { roadLines, nearestRoadPoint } from './roads.js';

export class Police {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.wanted = 0;
    this.coolTimer = 0;
    this.cruisers = []; // Car instances wearing police meshes, chasing
    this.roadblocks = []; // {mesh, x, z, heading} parked cruisers, blocking
    this.flashPhase = 0;
    // The player's spawn, until the first update refreshes it: roadblock
    // and cruiser spawns need a position even before the first frame,
    // because shot staging calls setWanted during module load.
    this.lastPlayerPos = { x: 0, z: -40 };
    this.ramCooldown = 0;
  }

  get maxCruisers() {
    return Math.min(this.wanted, 4);
  }

  get maxRoadblocks() {
    return this.wanted >= CONFIG.roadblockWanted ? 2 : 0;
  }

  raise(amount, reason) {
    const before = this.wanted;
    this.wanted = Math.min(5, this.wanted + amount);
    this.coolTimer = CONFIG.wantedDecaySeconds;
    if (this.wanted > before) {
      this.spawnCruisers();
      this.placeRoadblocks();
    }
    return { before, after: this.wanted, reason };
  }

  setWanted(level) {
    this.wanted = Math.max(0, Math.min(5, level));
    this.coolTimer = CONFIG.wantedDecaySeconds;
    this.spawnCruisers();
    this.placeRoadblocks();
  }

  // Spawn cruisers on roads near the player until the wanted level is
  // matched, so the chase starts close enough to see, not across town.
  spawnCruisers() {
    const lines = roadLines();
    while (this.cruisers.length < this.maxCruisers) {
      let line = lines[Math.floor(Math.random() * lines.length)];
      let along = (Math.random() * 2 - 1) * 120;
      if (this.lastPlayerPos) {
        const near = lines.filter((l) => Math.abs(l - this.lastPlayerPos.x) < 90);
        if (near.length > 0) line = near[Math.floor(Math.random() * near.length)];
        along = this.lastPlayerPos.z + (Math.random() * 2 - 1) * 60;
      }
      const mesh = makeCarMesh(0xffffff, true);
      this.scene.add(mesh);
      const car = new Car(mesh, line + 4, along, Math.random() * Math.PI * 2);
      car.topSpeed = CONFIG.policeTopSpeed;
      this.cruisers.push(car);
    }
  }

  // Drop cruisers the wanted level no longer pays for.
  trimCruisers() {
    while (this.cruisers.length > this.maxCruisers) {
      const car = this.cruisers.pop();
      this.scene.remove(car.mesh);
    }
  }

  // Roadblocks: two cruisers parked across the road 40–70m ahead of the
  // player, facing the player, with their light bars flashing. They are
  // scenery with teeth — the player can ram through or go around.
  placeRoadblocks() {
    while (this.roadblocks.length < this.maxRoadblocks) {
      if (!this.lastPlayerPos) return;
      const p = this.lastPlayerPos;
      const ahead = 40 + Math.random() * 30;
      const side = Math.random() < 0.5 ? -1 : 1;
      const spot = nearestRoadPoint(p.x + side * ahead * 0.4, p.z - ahead * 0.8);
      // Two cruisers side by side, blocking the lane.
      for (const offset of [-2.4, 2.4]) {
        const mesh = makeCarMesh(0xffffff, true);
        const ox = spot.axis === 'x' ? spot.x : spot.x + offset;
        const oz = spot.axis === 'x' ? spot.z + offset : spot.z;
        mesh.position.set(ox, 0, oz);
        mesh.rotation.y = spot.heading;
        this.scene.add(mesh);
        this.roadblocks.push({ mesh, x: ox, z: oz, heading: spot.heading });
      }
    }
    this.trimRoadblocks();
  }

  trimRoadblocks() {
    while (this.roadblocks.length > this.maxRoadblocks * 2) {
      const block = this.roadblocks.pop();
      this.scene.remove(block.mesh);
    }
  }

  clearRoadblocks() {
    for (const block of this.roadblocks) this.scene.remove(block.mesh);
    this.roadblocks = [];
  }

  roadblockPositions() {
    return this.roadblocks.map((b) => ({ x: b.x, z: b.z }));
  }

  // A cruiser rammed the player this frame: true once per cooldown.
  update(dt, playerPos, playerSpeed) {
    this.lastPlayerPos = { x: playerPos.x, z: playerPos.z };
    this.flashPhase += dt * 6;
    if (this.ramCooldown > 0) this.ramCooldown -= dt;
    const flash = (bar) => {
      if (!bar) return;
      const redOn = Math.sin(this.flashPhase) > 0;
      bar.red.material.color.setHex(redOn ? 0xff2020 : 0x550000);
      bar.blue.material.color.setHex(redOn ? 0x000055 : 0x2040ff);
    };
    for (const car of this.cruisers) flash(car.mesh.userData.lightBar);
    for (const block of this.roadblocks) flash(block.mesh.userData.lightBar);
    if (this.wanted === 0) {
      this.trimCruisers();
      this.clearRoadblocks();
      return false;
    }
    // Heat cools when the player is slow and out of trouble.
    this.coolTimer -= dt;
    if (this.coolTimer <= 0 && playerSpeed < 2) {
      this.wanted = Math.max(0, this.wanted - 1);
      this.coolTimer = CONFIG.wantedDecaySeconds;
      this.trimCruisers();
      this.trimRoadblocks();
    }
    // Each cruiser steers toward the player and rams at close range.
    let rammed = false;
    for (const car of this.cruisers) {
      const dx = playerPos.x - car.pos.x;
      const dz = playerPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz);
      let diff = targetHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.5));
      const throttle = dist > 4 ? 1 : 0.6;
      car.drive(dt, throttle, steer, false);
      collideCar(this.city, car);
      if (dist < 3.2) {
        car.speed *= 0.7; // a ram nudges, then backs off
        if (this.ramCooldown <= 0) {
          this.ramCooldown = 1.2;
          rammed = true;
        }
      }
    }
    return rammed;
  }

  cruiserPositions() {
    return this.cruisers.map((c) => ({ x: c.pos.x, z: c.pos.z }));
  }
}
