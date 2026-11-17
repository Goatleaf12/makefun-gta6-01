// Solmar Bay — bootstrap and the main loop.
// Builds the renderer, the city and every system, then runs the frame:
// input -> player/car -> combat -> traffic -> pedestrians -> police
// -> missions -> camera -> HUD -> minimap -> sound. One file owns the
// wiring and nothing else.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { buildCity } from './city.js';
import { Traffic, ParkedCars } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Player } from './player.js';
import { Combat } from './combat.js';
import { CameraRig } from './camera.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { SoundEngine } from './audio.js';
import { readSave, writeSave } from './save.js';
import { collideCar } from './vehicles.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(CONFIG.fogColor, CONFIG.fogNear, CONFIG.fogFar);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

const input = new Input(canvas);
const city = buildCity(scene);
const traffic = new Traffic(scene, city);
const parked = new ParkedCars(scene);
const pedestrians = new Pedestrians(scene);
const player = new Player(scene, city, city.spawn.x, city.spawn.z);
const combat = new Combat();
const cameraRig = new CameraRig(camera);
const police = new Police(scene, city);
const missions = new Missions(scene);
const hud = new Hud();
const minimap = new Minimap(document.getElementById('minimap'));
const sound = new SoundEngine();

const world = {
  state: 'menu', // menu | playing | paused
  money: CONFIG.startMoney,
  cruise: false, // shot staging: hold the throttle with no hands on keys
  player, police, missions, traffic, parked, pedestrians, combat, cameraRig, hud,
  time: 0,
  saveTimer: 0,
};

window.__solmar = world; // the screenshot script reads readiness from here

function applySave(save) {
  if (!save) return;
  world.money = save.money;
  missions.index = save.missionIndex;
  player.pos.set(save.player.x, 0, save.player.z);
  player.syncMesh();
  police.setWanted(save.wanted);
  if (missions.index > 0) hud.toast(`Save loaded — $${save.money} in your pocket, job ${missions.index + 1} on the board.`);
}

const existingSave = readSave();
if (existingSave) {
  const when = existingSave.savedAt ? new Date(existingSave.savedAt).toLocaleString() : '';
  hud.showContinue(true, `CONTINUE — $${existingSave.money} · JOB ${existingSave.missionIndex + 1}${when ? ` · ${when}` : ''}`);
}

function startGame(withSave) {
  if (world.state !== 'menu') return;
  sound.start();
  if (withSave && existingSave) applySave(existingSave);
  world.state = 'playing';
  hud.showMenu(false);
  hud.showHud(true);
  if (missions.state === 'idle' && !missions.finished) beginMission();
  hud.toast('Welcome to Solmar Bay, Dax. First job is on the board — press ENTER.');
}

// Start the next job; the escape job begins hot, with the Bay PD already
// on Dax, or it would end the instant it began (wanted 0 = escaped).
function beginMission() {
  missions.start();
  if (missions.current && missions.current.id === 'escape') police.setWanted(3);
}

function togglePause() {
  if (world.state === 'playing') {
    world.state = 'paused';
    input.reset();
    hud.showPause(true);
    sound.update(0, 0, false);
  } else if (world.state === 'paused') {
    world.state = 'playing';
    hud.showPause(false);
  }
}

document.getElementById('start-btn').addEventListener('click', () => startGame(false));
const continueBtn = document.getElementById('continue-btn');
if (continueBtn) continueBtn.addEventListener('click', () => startGame(true));
document.getElementById('resume-btn').addEventListener('click', togglePause);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && world.state === 'menu') startGame(false);
  if (event.code === 'Enter' && world.state === 'playing' && missions.state === 'idle') beginMission();
  if (event.code === 'KeyM' && world.state === 'playing') {
    sound.setMuted(!sound.muted);
    hud.toast(sound.muted ? 'Sound muted.' : 'Sound on.');
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Leaving the tab pauses a running game rather than letting the jobs
// and the police run on unseen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && world.state === 'playing') togglePause();
});

// Shot mode: ?shot=cover|street|drive|menu stages the world and plays
// without the menu, so the capture script photographs a live game.
const shotParam = new URLSearchParams(window.location.search).get('shot');
if (shotParam) {
  stageShot(world, shotParam);
} else {
  hud.showMenu(true);
  hud.showHud(false);
}

let lastTime = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  world.time += dt;

  if (input.consumePause()) togglePause();
  if (world.state !== 'playing') {
    // The menu still shows a living city behind it: traffic rolls on.
    if (world.state === 'menu') {
      traffic.update(dt);
      pedestrians.update(dt, world.time);
      cameraRig.update(dt, input, player.position, 0);
    }
    renderer.render(scene, camera);
    return;
  }

  // --- Enter / exit a car. ---
  if (input.consumeAction()) {
    if (player.driving) {
      player.exitCar();
      hud.toast('On foot. The car stays where you left it.');
    } else {
      const near = parked.nearestFree(player.pos.x, player.pos.z, 4.5);
      if (near) {
        player.enterCar(near);
        cameraRig.snapBehind(player.car.pos, player.car.heading);
        police.raise(1, 'stole a car');
        hud.toast('That is grand theft auto, Dax. Bay PD is on the way — ★');
        sound.click();
      }
    }
  }

  // --- Punch, on foot only. ---
  if (input.consumePunch()) {
    const hit = combat.punch(player, pedestrians, police, () => {
      police.raise(1, 'assault in front of a cruiser');
      hud.toast('The cops saw that. Wanted up — ★');
    });
    if (hit) {
      sound.punch();
      hud.toast(`You floored a ${hit.kind}. The crowd is staring.`);
    }
  }
  combat.update(dt);

  // --- Drive or walk. ---
  if (player.driving) {
    const car = player.car;
    // Shot staging cruises with no input; a real player drives the keys.
    const throttle = input.moveY() !== 0 ? input.moveY() : (world.cruise ? 0.7 : 0);
    car.drive(dt, throttle, input.moveX(), input.braking());
    collideCar(city, car);
    // Bumping a pedestrian at speed is a crime the cops notice.
    for (const ped of pedestrians.positions()) {
      if (ped.down) continue;
      if (Math.hypot(ped.x - car.pos.x, ped.z - car.pos.z) < 2.0 && Math.abs(car.speed) > 6) {
        police.raise(1, 'hit a pedestrian');
        car.speed *= 0.5;
        break;
      }
    }
  } else {
    player.walk(dt, input, cameraRig.yaw);
  }
  player.heal(dt);

  // --- The world lives on. ---
  traffic.update(dt);
  pedestrians.update(dt, world.time);
  const rammed = police.update(dt, player.position, player.speed);
  if (rammed) {
    player.hurt(CONFIG.ramDamage);
    hud.toast('A cruiser rammed you — get clear!');
    sound.punch();
    if (!player.alive) {
      world.money = Math.max(0, world.money - 100);
      player.health = CONFIG.maxHealth;
      police.setWanted(0);
      player.exitCarIfDriving();
      player.pos.set(city.spawn.x, 0, city.spawn.z);
      player.syncMesh();
      hud.toast('Busted — the PD took $100 and dropped you at the marina. Shake it off.');
    }
  }

  // --- Missions pay out. ---
  const payout = missions.update(dt, player.position, police);
  if (payout > 0) {
    world.money += payout;
    sound.cash();
    writeSave(world);
    hud.setSaveNote('Progress saved ✓');
    if (missions.finished) hud.toast(`All five jobs clear. $${world.money} in your pocket.`);
  }

  // --- Autosave every 15 seconds of play. ---
  world.saveTimer += dt;
  if (world.saveTimer >= 15) {
    world.saveTimer = 0;
    if (writeSave(world)) hud.setSaveNote('Progress saved ✓');
  }

  // --- Camera, HUD, minimap, sound. ---
  cameraRig.update(dt, input, player.position, player.speed);
  hud.setWanted(police.wanted);
  hud.setMoney(world.money);
  hud.setHealth(player.health, CONFIG.maxHealth);
  hud.setSpeed(player.speed * 3.6, player.driving);
  hud.setObjective(missions.objectiveText(player.position));
  hud.setJobs(missions.jobList());
  if (missions.messageTimer > 0) hud.toast(missions.message, missions.messageTimer);
  hud.update(dt);
  hud.setHint(
    player.driving
      ? 'WASD drive · SPACE brake · E exit car · P pause · M mute'
      : 'WASD walk · SHIFT run · E steal car · F punch · ENTER next job · P pause · M mute',
  );
  minimap.draw({
    player: {
      x: player.position.x,
      z: player.position.z,
      heading: player.driving ? player.car.heading : player.heading,
    },
    traffic: traffic.positions(),
    police: police.cruiserPositions(),
    roadblocks: police.roadblockPositions(),
    pedestrians: pedestrians.positions(),
    missionTarget: missions.activeTarget,
    park: city.park,
    lighthouse: city.lighthouse,
    wanted: police.wanted,
    time: world.time,
  });
  sound.update(player.speed, police.wanted, player.driving);

  renderer.render(scene, camera);
}

requestAnimationFrame(frame);
