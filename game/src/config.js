// Solmar Bay — the single tuning table for the whole game.
// Every number a designer would reach for lives here: the shape of the
// city, how Dax and the cars move, how hard the Bay PD pushes back, what
// each job pays, and the colours the HUD and the minimap speak in.
// Distances are metres, speeds metres per second, money dollars,
// angles radians, time seconds.
export const CONFIG = {
  // The city is a square grid: avenues run north-south, streets run
  // east-west, gridSpacing apart, gridCount lines in each direction.
  gridSpacing: 40,
  gridCount: 9,
  roadWidth: 12,
  sidewalkWidth: 3,
  // Half the side of the playable square; buildings stay inside it.
  cityHalf: 180,
  // West edge: a strip of sand, then the ocean itself.
  beachX: -196,
  oceanX: -236,
  pierZ: -60,
  // Late-afternoon sun over a coastal city: warm light, orange horizon.
  sunColor: 0xffd9a0,
  sunIntensity: 2.4,
  skyTop: 0x2e5f8a,
  skyHorizon: 0xff9e5e,
  fogColor: 0xf2a56b,
  fogNear: 120,
  fogFar: 520,
  // On foot: a brisk walk, a proper run on Shift.
  walkSpeed: 7,
  runSpeed: 11,
  // Car handling: arcade weight, not a sim.
  carAccel: 26,
  carBrake: 42,
  carReverseAccel: 14,
  carMaxSpeed: 42,
  carMaxReverse: 10,
  carTurn: 1.9,
  // Traffic and foot traffic counts.
  trafficCars: 16,
  pedestrians: 30,
  trafficSpeed: 9,
  // Bay PD cruisers are a touch faster than the player's best car.
  policeTopSpeed: 46,
  policeAccel: 30,
  wantedDecaySeconds: 25,
  // Roadblocks go up once the heat hits this many stars.
  roadblockWanted: 3,
  // Dax's health: a cruiser ram costs a chunk, a punch costs a little.
  maxHealth: 100,
  ramDamage: 8,
  punchDamage: 12,
  healthRegenPerSecond: 1.5,
  // Cash on hand when Dax starts the day.
  startMoney: 120,
  // Camera: base field of view plus a kick as speed builds.
  cameraBaseFov: 62,
  cameraFovKick: 10,
  // Save: written to localStorage under this key.
  saveKey: 'solmar-bay-save-v1',
};

// The HUD and the minimap share one palette so the screens read as
// one game.
export const PALETTE = {
  hudText: '#ffe9c4',
  hudPanel: 'rgba(12, 18, 32, 0.62)',
  hudAccent: '#ffb347',
  money: '#7dff9a',
  wanted: '#ff5252',
  objective: '#8fd3ff',
  health: '#7dff9a',
  healthLow: '#ff5252',
  minimapRoad: '#3a4152',
  minimapBlock: '#232a3a',
  minimapBeach: '#e8d29a',
  minimapOcean: '#1f6f8f',
  minimapPark: '#2f6b3a',
  minimapPlayer: '#ffffff',
  minimapPolice: '#ff4040',
  minimapTraffic: '#ffd23f',
  minimapPedestrian: '#9aa4b8',
  minimapMission: '#ff9d00',
  minimapRoadblock: '#ff2020',
  minimapLighthouse: '#ffe9a8',
};

// The five-job arc for Dax Marlowe. Jobs run in order; a job with
// stages has more than one stop, and the HUD shows which stop is live.
// `kind` tells the mission system how the job ends:
//   reach  — arrive inside the target ring
//   escape — survive until the wanted level drops to zero
//   staged — visit each stop in order, then the job pays out
export const MISSIONS = [
  {
    id: 'pickup',
    kind: 'reach',
    title: 'JOB 1 — PICK UP THE PACKAGE',
    brief: 'A client left a package at the Marina kiosk. Get there on foot or by car.',
    target: { x: -170, z: -120 },
    radius: 6,
    reward: 250,
  },
  {
    id: 'delivery',
    kind: 'reach',
    title: 'JOB 2 — CROSS-TOWN DELIVERY',
    brief: 'Deliver the package to the Solmar Tower lobby before the client loses patience.',
    target: { x: 120, z: 120 },
    radius: 7,
    reward: 400,
    timeLimit: 150,
  },
  {
    id: 'escape',
    kind: 'escape',
    title: 'JOB 3 — LOSE THE HEAT',
    brief: 'The pickup was flagged. The Bay PD is on you — break away and stay clean.',
    target: null,
    radius: 0,
    reward: 600,
    timeLimit: 75,
  },
  {
    id: 'taxi',
    kind: 'staged',
    title: 'JOB 4 — FARE TO THE BEACH BAR',
    brief: 'A tourist is waiting at the pier. Pick her up, then drop her at the Beach Bar — fast, she pays for speed.',
    stages: [
      { label: 'Pick up the fare at the pier', target: { x: -176, z: -60 }, radius: 6 },
      { label: 'Drop her at the Beach Bar', target: { x: 140, z: -140 }, radius: 7 },
    ],
    reward: 500,
    timeLimit: 150,
  },
  {
    id: 'score',
    kind: 'staged',
    title: 'JOB 5 — THE BIG SCORE',
    brief: 'Grab the cash at the Meridian Bank, then vanish to the safehouse. The whole Bay PD will be on you.',
    stages: [
      { label: 'Grab the cash at Meridian Bank', target: { x: 40, z: -40 }, radius: 6 },
      { label: 'Lose the cops and reach the safehouse', target: { x: -140, z: 140 }, radius: 7 },
    ],
    reward: 1500,
    timeLimit: 180,
    wantedOnGrab: 5,
  },
];
