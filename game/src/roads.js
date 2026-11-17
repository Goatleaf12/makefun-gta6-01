// Solmar Bay — the road network, as pure geometry.
// Traffic, pedestrians, police and missions all ask this module where
// the drivable surface is, so the city can never disagree with its cars:
// one grid, one truth, no hand-placed coordinates anywhere else.
import { CONFIG } from './config.js';

// Centre lines of the avenues and the streets: -160, -120, …, +160.
export function roadLines() {
  const lines = [];
  const half = ((CONFIG.gridCount - 1) / 2) * CONFIG.gridSpacing;
  for (let i = 0; i < CONFIG.gridCount; i++) lines.push(-half + i * CONFIG.gridSpacing);
  return lines;
}

export function nearestRoadLine(value) {
  const lines = roadLines();
  let best = lines[0];
  let bestDist = Math.abs(value - lines[0]);
  for (const line of lines) {
    const dist = Math.abs(value - line);
    if (dist < bestDist) {
      bestDist = dist;
      best = line;
    }
  }
  return { line: best, distance: bestDist };
}

// True when a point sits on asphalt, intersections included.
export function onRoad(x, z) {
  const half = CONFIG.roadWidth / 2;
  return nearestRoadLine(x).distance <= half || nearestRoadLine(z).distance <= half;
}

// True when a point sits on the sidewalk ring just outside the asphalt.
export function onSidewalk(x, z) {
  const roadHalf = CONFIG.roadWidth / 2;
  const walkHalf = roadHalf + CONFIG.sidewalkWidth;
  const nearX = nearestRoadLine(x).distance;
  const nearZ = nearestRoadLine(z).distance;
  const xSide = nearX > roadHalf && nearX <= walkHalf;
  const zSide = nearZ > roadHalf && nearZ <= walkHalf;
  return xSide || zSide;
}

// A random point on a lane, for spawning traffic and parked cars.
// laneOffset puts the car in the right-hand lane of its direction;
// heading 0 means the car faces +z, PI means it faces -z, and the
// lane sign always matches the heading: a car in the +3m lane of an
// avenue drives toward +z, one in the -3m lane toward -z.
export function randomRoadPoint(rng, axis) {
  const lines = roadLines();
  const line = lines[Math.floor(rng() * lines.length)];
  const span = ((CONFIG.gridCount - 1) / 2) * CONFIG.gridSpacing;
  const along = (rng() * 2 - 1) * span;
  const lane = (rng() < 0.5 ? -1 : 1) * (CONFIG.roadWidth / 4);
  if (axis === 'x') return { x: line + lane, z: along, heading: lane > 0 ? 0 : Math.PI };
  return { x: along, z: line + lane, heading: lane > 0 ? Math.PI / 2 : -Math.PI / 2 };
}

// The four sidewalk corners of one block, where pedestrians turn.
export function blockCorners(bx, bz) {
  const lines = roadLines();
  const x0 = lines[bx];
  const x1 = lines[bx + 1];
  const z0 = lines[bz];
  const z1 = lines[bz + 1];
  const inset = CONFIG.roadWidth / 2 + CONFIG.sidewalkWidth / 2;
  return [
    { x: x0 + inset, z: z0 + inset },
    { x: x1 - inset, z: z0 + inset },
    { x: x1 - inset, z: z1 - inset },
    { x: x0 + inset, z: z1 - inset },
  ];
}

// A random point on a sidewalk edge, so pedestrians start mid-stroll
// instead of always standing on a corner.
export function randomSidewalkPoint(rng) {
  const blocks = CONFIG.gridCount - 1;
  const corners = blockCorners(Math.floor(rng() * blocks), Math.floor(rng() * blocks));
  const a = corners[Math.floor(rng() * 4)];
  const b = corners[(Math.floor(rng() * 4) + 1) % 4];
  const t = rng();
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

// The nearest point on the road grid to a given spot, snapped to the
// right-hand lane of the nearest line — where a roadblock belongs.
export function nearestRoadPoint(x, z) {
  const nx = nearestRoadLine(x);
  const nz = nearestRoadLine(z);
  if (nx.distance <= nz.distance) {
    const lane = x >= nx.line ? CONFIG.roadWidth / 4 : -CONFIG.roadWidth / 4;
    return { x: nx.line + lane, z, heading: lane > 0 ? 0 : Math.PI, axis: 'x' };
  }
  const lane = z >= nz.line ? CONFIG.roadWidth / 4 : -CONFIG.roadWidth / 4;
  return { x, z: nz.line + lane, heading: lane > 0 ? Math.PI / 2 : -Math.PI / 2, axis: 'z' };
}
