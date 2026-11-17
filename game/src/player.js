// Solmar Bay — Dax Marlowe on foot, and getting in and out of cars.
// On foot: WASD moves relative to the camera, Shift runs, the character
// turns toward the walk direction and the legs swing. E near a parked
// car steals it (wanted +1); E while driving parks the car and steps out
// beside it on the driver's side. Dax has health: cruiser rams hurt,
// and it creeps back while he stays out of trouble.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { resolveBuildingCollision } from './city.js';
import { Car } from './vehicles.js';

function makePlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x27324a });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2e4a6b });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.95, 8), jacket);
  body.position.y = 1.1;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin);
  head.position.y = 1.82;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }),
  );
  cap.position.y = 2.02;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.17), jeans);
  legL.position.set(-0.15, 0.31, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.17), jeans);
  legR.position.set(0.15, 0.31, 0);
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), jacket);
  armL.position.set(-0.48, 1.15, 0);
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), jacket);
  armR.position.set(0.48, 1.15, 0);
  group.add(armR);
  group.userData.legL = legL;
  group.userData.legR = legR;
  group.userData.armR = armR;
  return group;
}

export class Player {
  constructor(scene, city, x, z) {
    this.scene = scene;
    this.city = city;
    this.mesh = makePlayerMesh();
    scene.add(this.mesh);
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = 0;
    this.car = null; // a Car instance while driving, null on foot
    this.walkPhase = 0;
    this.health = CONFIG.maxHealth;
    this.punchTimer = 0; // counts down after a punch; the arm swings while it runs
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
  }

  get driving() {
    return this.car !== null;
  }

  get position() {
    return this.driving ? this.car.pos : this.pos;
  }

  get speed() {
    return this.driving ? Math.abs(this.car.speed) : 0;
  }

  get alive() {
    return this.health > 0;
  }

  hurt(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  heal(dt) {
    if (this.health > 0 && this.health < CONFIG.maxHealth) {
      this.health = Math.min(CONFIG.maxHealth, this.health + CONFIG.healthRegenPerSecond * dt);
    }
  }

  // One on-foot step: camera-relative WASD, collide with buildings,
  // stay inside the city.
  walk(dt, input, cameraYaw) {
    const mx = input.moveX();
    const my = input.moveY();
    if (mx === 0 && my === 0) {
      this.mesh.userData.legL.rotation.x *= 0.8;
      this.mesh.userData.legR.rotation.x *= 0.8;
    } else {
      const speed = input.running() ? CONFIG.runSpeed : CONFIG.walkSpeed;
      // Camera yaw rotates the input: forward is away from the camera.
      // The camera sits at focus + (sin yaw, cos yaw), so forward on the
      // ground is (-sin yaw, -cos yaw) and right is (cos yaw, -sin yaw).
      const sin = Math.sin(cameraYaw);
      const cos = Math.cos(cameraYaw);
      const wx = mx * cos - my * sin;
      const wz = -mx * sin - my * cos;
      const len = Math.hypot(wx, wz);
      const nx = wx / len;
      const nz = wz / len;
      this.pos.x += nx * speed * dt;
      this.pos.z += nz * speed * dt;
      this.heading = Math.atan2(nx, nz);
      this.walkPhase += dt * speed * 1.6;
      this.mesh.userData.legL.rotation.x = Math.sin(this.walkPhase) * 0.6;
      this.mesh.userData.legR.rotation.x = -Math.sin(this.walkPhase) * 0.6;
      resolveBuildingCollision(this.city, this.pos, 0.5);
      const limit = CONFIG.cityHalf + 10;
      this.pos.x = Math.max(-limit, Math.min(limit, this.pos.x));
      this.pos.z = Math.max(-limit, Math.min(limit, this.pos.z));
    }
    // The punch swing: the right arm snaps forward, then settles.
    if (this.punchTimer > 0) {
      this.punchTimer -= dt;
      this.mesh.userData.armR.rotation.x = -1.4 * Math.sin((this.punchTimer / 0.35) * Math.PI);
    } else {
      this.mesh.userData.armR.rotation.x *= 0.8;
    }
    this.syncMesh();
  }

  // Step into a parked car: hide the walker, hand the car to the driver.
  enterCar(parked) {
    const car = new Car(parked.mesh, parked.x, parked.z, parked.heading);
    parked.taken = true;
    this.car = car;
    this.mesh.visible = false;
    this.pos.set(parked.x, 0, parked.z);
    return car;
  }

  // Step out beside the car, on the driver's side; never inside a wall.
  exitCar() {
    if (!this.car) return;
    const car = this.car;
    car.stop();
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    this.pos.copy(car.pos).addScaledVector(side, 2.2);
    resolveBuildingCollision(this.city, this.pos, 0.5);
    this.heading = car.heading;
    this.car = null;
    this.mesh.visible = true;
    this.syncMesh();
  }

  // Convenience for shot staging: leave the car if driving, else no-op.
  exitCarIfDriving() {
    if (this.driving) this.exitCar();
  }
}
