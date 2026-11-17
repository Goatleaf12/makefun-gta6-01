// Solmar Bay — missions: a five-job chain for Dax Marlowe.
// Each job has a beacon in the world (a glowing column the player can
// see from anywhere, plus a ring on the ground and a marker on the
// minimap), a timer where the story needs one, and a cash payout.
// Jobs run in order: a package pickup, a timed cross-town delivery, a
// police escape, a taxi fare with two stops, and the big score — grab
// the bank cash at five stars, then vanish to the safehouse.
// Finishing all five is the burst-2 arc.
import * as THREE from 'three';
import { MISSIONS } from './config.js';

export class Missions {
  constructor(scene) {
    this.scene = scene;
    this.index = 0;
    this.state = 'idle'; // idle | active | done
    this.stageIndex = 0;
    this.timeLeft = 0;
    this.message = '';
    this.messageTimer = 0;
    this.passenger = false; // the taxi fare is riding with Dax
    // Beacon: a tall glowing column so the target reads from anywhere.
    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 60, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff9d00, transparent: true, opacity: 0.28,
        side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    this.beacon.visible = false;
    scene.add(this.beacon);
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(5, 0.35, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffc24d }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.visible = false;
    scene.add(this.ring);
  }

  get current() {
    return MISSIONS[this.index] || null;
  }

  get finished() {
    return this.index >= MISSIONS.length;
  }

  // The live target: a single target, or the current stage's target.
  // Guarded: between jobs the stage index of the last staged job can
  // still be past its last stage, and the minimap asks every frame.
  get activeTarget() {
    const mission = this.current;
    if (!mission) return null;
    if (mission.kind === 'staged') {
      const stage = mission.stages[this.stageIndex];
      return stage ? stage.target : null;
    }
    return mission.target;
  }

  get activeRadius() {
    const mission = this.current;
    if (!mission) return 0;
    if (mission.kind === 'staged') {
      const stage = mission.stages[this.stageIndex];
      return stage ? stage.radius : 0;
    }
    return mission.radius;
  }

  get stageLabel() {
    const mission = this.current;
    if (!mission) return '';
    if (mission.kind === 'staged') return mission.stages[this.stageIndex].label;
    return mission.brief;
  }

  start() {
    if (this.finished) return;
    this.state = 'active';
    this.stageIndex = 0;
    const mission = this.current;
    this.timeLeft = mission.timeLimit || 0;
    this.showMessage(`${mission.title} — ${mission.brief}`);
    this.placeBeacon();
  }

  placeBeacon() {
    const target = this.activeTarget;
    if (!target) {
      this.beacon.visible = false;
      this.ring.visible = false;
      return;
    }
    this.beacon.position.set(target.x, 30, target.z);
    this.beacon.visible = true;
    this.ring.position.set(target.x, 0.4, target.z);
    this.ring.visible = true;
  }

  showMessage(text, seconds = 5) {
    this.message = text;
    this.messageTimer = seconds;
  }

  // Returns the payout when a mission completes this tick, else 0.
  // `police` is passed so staged jobs can raise the heat mid-job.
  update(dt, playerPos, police) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.state !== 'active' || !this.current) return 0;
    const mission = this.current;
    if (mission.timeLimit) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.showMessage('JOB FAILED — the client walked away. Try the next job.', 5);
        this.index += 1;
        this.state = 'idle';
        this.stageIndex = 0;
        this.passenger = false;
        this.beacon.visible = false;
        this.ring.visible = false;
        return 0;
      }
    }
    if (mission.kind === 'escape') {
      // Survive: the job ends when the heat drops to zero.
      if (police.wanted === 0) return this.complete();
      return 0;
    }
    const target = this.activeTarget;
    if (target) {
      const dist = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
      if (dist < this.activeRadius) {
        if (mission.kind === 'staged') return this.advanceStage(police);
        return this.complete();
      }
    }
    return 0;
  }

  // A staged job reaches one stop: move to the next, or pay out.
  // The taxi fare boards at stop one; the bank job turns the whole
  // city hostile at stop one.
  advanceStage(police) {
    const mission = this.current;
    if (mission.id === 'taxi' && this.stageIndex === 0) {
      this.passenger = true;
      this.showMessage('Fare aboard — drive her to the Beach Bar, and mind the clock.', 4);
    }
    if (mission.id === 'score' && this.stageIndex === 0) {
      police.setWanted(mission.wantedOnGrab || 5);
      this.showMessage('Cash grabbed — FIVE STARS. Every cruiser in Solmar Bay is coming. Run!', 5);
    }
    this.stageIndex += 1;
    if (this.stageIndex >= mission.stages.length) return this.complete();
    this.placeBeacon();
    return 0;
  }

  complete() {
    const mission = this.current;
    const payout = mission.reward;
    this.passenger = false;
    this.stageIndex = 0; // a finished job leaves no stage behind for the next one
    this.showMessage(`JOB DONE — +$${payout}. ${this.index + 1 < MISSIONS.length ? 'Next job is on the board.' : 'All five jobs clear. Solmar Bay is yours, Dax.'}`, 6);
    this.index += 1;
    this.state = 'idle';
    this.beacon.visible = false;
    this.ring.visible = false;
    return payout;
  }

  // One-line objective text for the HUD, plus the timer when it matters
  // and the distance to the target, so the player can feel the job
  // getting closer instead of only reading its name.
  objectiveText(playerPos) {
    if (this.finished) return 'ALL JOBS CLEAR — free roam. Press E near a car to drive.';
    if (this.state === 'active' && this.current) {
      if (this.current.kind === 'escape') {
        return `${this.current.title} — ${Math.ceil(this.timeLeft)}s left. Break away and stay clean.`;
      }
      const timer = this.current.timeLimit ? ` — ${Math.ceil(this.timeLeft)}s left` : '';
      const dist = this.activeTarget && playerPos
        ? ` — ${Math.round(Math.hypot(playerPos.x - this.activeTarget.x, playerPos.z - this.activeTarget.z))}m away`
        : '';
      const stage = this.current.kind === 'staged' ? ` (${this.stageIndex + 1}/${this.current.stages.length})` : '';
      return `${this.current.title}${stage}${timer}${dist}`;
    }
    return 'Press ENTER to take the next job on the board.';
  }

  // The job board for the HUD: every job with its state and reward.
  jobList() {
    return MISSIONS.map((m, i) => ({
      title: m.title,
      reward: m.reward,
      state: i < this.index ? 'done' : i === this.index ? (this.state === 'active' ? 'active' : 'ready') : 'locked',
    }));
  }
}
