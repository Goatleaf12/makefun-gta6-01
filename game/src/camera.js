// Solmar Bay — the third-person chase camera.
// A mouse drag orbits around the player (or the car); the rig eases
// toward its target so turns feel weighted instead of snappy, pulls back
// and widens a touch as the car picks up speed, and snaps behind the
// player after entering a car or after a shot cut.
import * as THREE from 'three';
import { CONFIG } from './config.js';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI; // behind the player at spawn, looking north
    this.pitch = 0.32;
    this.distance = 9;
    this.fixedDistance = 0; // when > 0, shot staging pins the distance
    this.current = new THREE.Vector3(0, 6, 14);
    this.lookTarget = new THREE.Vector3();
  }

  update(dt, input, focus, speed) {
    const drag = input.consumeDrag();
    this.yaw -= drag.dx * 0.005;
    this.pitch += drag.dy * 0.004;
    this.pitch = Math.max(0.08, Math.min(1.1, this.pitch));
    const driving = speed > 0.5;
    // A pinned distance (screenshots) beats the speed-based pull-back.
    const targetDistance = this.fixedDistance > 0
      ? this.fixedDistance
      : driving ? 11 + Math.min(6, speed * 0.12) : 8.5;
    this.distance += (targetDistance - this.distance) * Math.min(1, dt * 3);
    // Speed stretches the field of view a touch — the rush of going fast.
    const targetFov = CONFIG.cameraBaseFov + Math.min(CONFIG.cameraFovKick, speed * 0.22);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 3);
    this.camera.updateProjectionMatrix();
    const height = 2.2 + Math.sin(this.pitch) * this.distance;
    const flat = Math.cos(this.pitch) * this.distance;
    const desired = new THREE.Vector3(
      focus.x + Math.sin(this.yaw) * flat,
      height,
      focus.z + Math.cos(this.yaw) * flat,
    );
    // Ease: fast enough to track a car, slow enough to feel like a camera.
    const ease = 1 - Math.pow(0.0001, dt);
    this.current.lerp(desired, ease);
    this.lookTarget.lerp(new THREE.Vector3(focus.x, focus.y + 1.6, focus.z), ease);
    this.camera.position.copy(this.current);
    this.camera.lookAt(this.lookTarget);
  }

  // Put the rig directly behind a new focus (entering a car, a shot cut).
  snapBehind(focus, heading) {
    this.yaw = heading + Math.PI;
    this.pitch = 0.32;
    const flat = Math.cos(this.pitch) * this.distance;
    this.current.set(
      focus.x + Math.sin(this.yaw) * flat,
      2.2 + Math.sin(this.pitch) * this.distance,
      focus.z + Math.cos(this.yaw) * flat,
    );
    this.lookTarget.set(focus.x, focus.y + 1.6, focus.z);
  }
}
