// Solmar Bay — traffic: AI cars that cruise the grid on their lane,
// turn at intersections and keep going. They never leave the road:
// each car owns one axis (avenue or street) and a direction, and only
// changes direction at a crossing, so the city and its cars agree.
// One of them is a yellow taxi, easy to spot in the crowd.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeCarMesh, randomPaint } from './vehicles.js';
import { roadLines } from './roads.js';
import { mulberry32 } from './rng.js';

export class Traffic {
  constructor(scene, city, seed = 777) {
    this.scene = scene;
    this.city = city;
    this.rng = mulberry32(seed);
    this.cars = []; // {mesh, axis, line, along, dir, lane, speed, isTaxi}
    this.spawn();
  }

  spawn() {
    const lines = roadLines();
    for (let i = 0; i < CONFIG.trafficCars; i++) {
      const axis = this.rng() < 0.5 ? 'x' : 'z';
      const line = lines[Math.floor(this.rng() * lines.length)];
      const span = ((CONFIG.gridCount - 1) / 2) * CONFIG.gridSpacing;
      const along = (this.rng() * 2 - 1) * span;
      const dir = this.rng() < 0.5 ? 1 : -1;
      const lane = dir * (CONFIG.roadWidth / 4);
      const isTaxi = i === 0; // the first car is the city's one yellow taxi
      const mesh = makeCarMesh(isTaxi ? 0xe8c832 : randomPaint(this.rng), false, isTaxi);
      this.scene.add(mesh);
      this.cars.push({
        mesh,
        axis,
        line,
        along,
        dir,
        lane,
        isTaxi,
        speed: CONFIG.trafficSpeed * (0.8 + this.rng() * 0.4),
      });
    }
  }

  // Where each traffic car is right now, for the minimap and collisions.
  positions() {
    return this.cars.map((c) => {
      if (c.axis === 'x') return { x: c.line + c.lane, z: c.along, isTaxi: c.isTaxi };
      return { x: c.along, z: c.line + c.lane, isTaxi: c.isTaxi };
    });
  }

  update(dt) {
    const span = ((CONFIG.gridCount - 1) / 2) * CONFIG.gridSpacing;
    for (const car of this.cars) {
      car.along += car.dir * car.speed * dt;
      // At the edge of town, turn around and head back.
      if (car.along > span) { car.along = span; car.dir = -1; }
      if (car.along < -span) { car.along = -span; car.dir = 1; }
      // At an intersection, sometimes turn onto the crossing road.
      // The car keeps its ground position: the old "along" becomes the
      // new road line, and the old line (+ lane) becomes the new "along".
      // The 2% per-frame chance only rolls while the car is within 1.2m
      // of a crossing, so turns happen at crossings and nowhere else.
      const nearLine = roadLines().find((l) => Math.abs(car.along - l) < 1.2);
      if (nearLine !== undefined && this.rng() < 0.02) {
        const newAlong = car.line + car.lane;
        car.line = nearLine;
        car.along = newAlong;
        car.axis = car.axis === 'x' ? 'z' : 'x';
        car.dir = this.rng() < 0.5 ? 1 : -1;
        car.lane = car.dir * (CONFIG.roadWidth / 4);
      }
      if (car.axis === 'x') {
        car.mesh.position.set(car.line + car.lane, 0, car.along);
        car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI;
      } else {
        car.mesh.position.set(car.along, 0, car.line + car.lane);
        car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      const spin = car.speed * dt;
      for (const wheel of car.mesh.userData.wheels) wheel.rotation.x += spin;
    }
  }
}

// Parked cars the player can steal: a row of them along the marina and
// downtown curbs. Stealing one is how a foot chase becomes a car chase.
export class ParkedCars {
  constructor(scene, seed = 4242) {
    this.scene = scene;
    this.rng = mulberry32(seed);
    this.cars = []; // {mesh, x, z, heading, taken}
    const spots = [
      { x: -166, z: -100, heading: Math.PI / 2 },
      { x: -166, z: -60, heading: Math.PI / 2 },
      { x: -166, z: 20, heading: Math.PI / 2 },
      { x: 6, z: -166, heading: 0 },
      { x: 46, z: -166, heading: 0 },
      { x: -6, z: 166, heading: Math.PI },
      { x: 86, z: 126, heading: Math.PI },
      { x: 126, z: 46, heading: -Math.PI / 2 },
      { x: -46, z: 86, heading: Math.PI / 2 },
      { x: 166, z: -46, heading: -Math.PI / 2 },
    ];
    for (const spot of spots) {
      const mesh = makeCarMesh(randomPaint(this.rng));
      mesh.position.set(spot.x, 0, spot.z);
      mesh.rotation.y = spot.heading;
      scene.add(mesh);
      this.cars.push({ mesh, x: spot.x, z: spot.z, heading: spot.heading, taken: false });
    }
  }

  nearestFree(x, z, maxDist) {
    let best = null;
    let bestDist = maxDist;
    for (const car of this.cars) {
      if (car.taken) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    return best;
  }
}
