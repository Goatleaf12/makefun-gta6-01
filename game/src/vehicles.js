// Solmar Bay — cars: one mesh builder for every vehicle in the city
// (traffic, parked, police, player-driven) and one small driving model
// with acceleration, braking, steering and a slide when the handbrake
// is not what you meant. Low-poly boxes, but with headlights, tail
// lights and spinning wheels so they read as cars at a glance.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { resolveBuildingCollision } from './city.js';

const PAINTS = [0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3fae5a, 0xe8e8e8, 0x22262e, 0x8a5fc2, 0xd97b2e];

// A low-poly car: body, glass cabin, four wheels, headlights and tail
// lights. Police cars get a white body, a light bar and black doors —
// the Bay PD look. A taxi gets a yellow roof sign.
export function makeCarMesh(color, isPolice = false, isTaxi = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0xf2f2f2 : color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x18222e });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glass);
  cabin.position.set(0, 1.1, -0.2);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111214 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.36, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), lightMat);
    lamp.position.set(x, 0.62, 2.21);
    group.add(lamp);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), tailMat);
    lamp.position.set(x, 0.62, -2.21);
    group.add(lamp);
  }
  let lightBar = null;
  if (isPolice) {
    const barBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.14, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    barBase.position.set(0, 1.45, -0.2);
    group.add(barBase);
    lightBar = {
      red: new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2020 })),
      blue: new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0x2040ff })),
    };
    lightBar.red.position.set(-0.36, 1.5, -0.2);
    lightBar.blue.position.set(0.36, 1.5, -0.2);
    group.add(lightBar.red);
    group.add(lightBar.blue);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.4, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x14181f }),
    );
    door.position.set(0, 0.55, 0.1);
    group.add(door);
  }
  if (isTaxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.25, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffd23f }),
    );
    sign.position.set(0, 1.5, -0.2);
    group.add(sign);
  }
  group.userData.wheels = wheels;
  group.userData.lightBar = lightBar;
  return group;
}

export function randomPaint(rng) {
  return PAINTS[Math.floor(rng() * PAINTS.length)];
}

// A drivable car: position, heading, speed and the mesh it wears.
// The same class drives the player's car and the police cruisers.
// Heading convention (shared with the player and the camera): heading
// 0 faces +z, and forward on the ground is (sin(heading), cos(heading)).
// Turn left (steer -1) while moving forward and the heading decreases.
export class Car {
  constructor(mesh, x, z, heading) {
    this.mesh = mesh;
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.topSpeed = CONFIG.carMaxSpeed;
    this.syncMesh();
  }

  syncMesh(dt = 0.016) {
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * dt;
    for (const wheel of this.mesh.userData.wheels) wheel.rotation.x += spin;
  }

  // throttle -1..1, steer -1..1, brake true: arcade handling that still
  // feels like weight — speed builds, steering bites harder when slow.
  drive(dt, throttle, steer, brake) {
    if (brake) {
      this.speed -= Math.sign(this.speed) * CONFIG.carBrake * dt;
      if (Math.abs(this.speed) < 0.5) this.speed = 0;
    } else if (throttle > 0) {
      this.speed += CONFIG.carAccel * throttle * dt;
    } else if (throttle < 0) {
      this.speed += CONFIG.carReverseAccel * throttle * dt;
    } else {
      this.speed *= Math.pow(0.4, dt); // coast down
    }
    this.speed = Math.max(-CONFIG.carMaxReverse, Math.min(this.topSpeed, this.speed));
    const steerAmount = steer * CONFIG.carTurn * dt * Math.min(1, Math.abs(this.speed) / 8 + 0.25);
    this.heading += steerAmount * Math.sign(this.speed || 1);
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.pos.addScaledVector(forward, this.speed * dt);
    this.syncMesh(dt);
  }

  stop() {
    this.speed = 0;
    this.syncMesh();
  }
}

// Keep a car inside the city and out of buildings; true on impact.
export function collideCar(city, car) {
  const hit = resolveBuildingCollision(city, car.pos, 2.2);
  const limit = CONFIG.cityHalf + 6;
  car.pos.x = Math.max(-limit, Math.min(limit, car.pos.x));
  car.pos.z = Math.max(-limit, Math.min(limit, car.pos.z));
  if (hit) car.speed *= 0.4;
  car.syncMesh();
  return hit;
}
