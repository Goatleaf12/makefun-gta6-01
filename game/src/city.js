// Solmar Bay — the procedural city builder.
// One seeded pass lays down the ground, beach and ocean, the asphalt
// grid with painted centre dashes, sidewalks, buildings with lit
// windows, street lamps, palm trees, a pier, a park and the downtown
// towers. Nothing is placed by hand: the same seed rebuilds the same
// city every load, so screenshots stay comparable between runs.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { roadLines } from './roads.js';
import { mulberry32 } from './rng.js';

// A building facade as a canvas texture: a grid of windows, some lit warm.
function facadeTexture(rng, baseColor, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 6; c++) {
      const lit = rng() < litRatio;
      ctx.fillStyle = lit ? (rng() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#1c2436';
      ctx.fillRect(8 + c * 20, 10 + r * 20, 12, 12);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Asphalt with a dashed centre line, tiled along each road.
function asphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2c2f36';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#3a3e48';
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  // One dashed centre line: a bar long along the road (u) and narrow
  // across it (v), centred on the strip, so the dash reads as a lane
  // marking from the chase camera instead of a crosswalk bar.
  ctx.fillStyle = '#e8c85a';
  ctx.fillRect(8, 30, 24, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A billboard face: bright paint, a short slogan, a thick frame.
function billboardTexture(rng, bg, words) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 5; i++) ctx.fillRect(0, 12 + i * 24, 256, 6);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(words, 128, 58);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ffe9c4';
  ctx.fillText(rng() < 0.5 ? 'SOLMAR BAY' : 'VISIT THE BAY', 128, 92);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene, seed = 20261118) {
  const rng = mulberry32(seed);
  const city = {
    buildings: [], // {x, z, halfW, halfD} boxes the player and cars must not enter
    lamps: [],
    palms: [],
    spawn: { x: 0, z: -40 },
    park: null, // the one green block, for the minimap
  };

  // --- Sky: a big gradient dome, sunset orange at the horizon. ---
  const skyGeo = new THREE.SphereGeometry(600, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(CONFIG.skyTop) },
      horizon: { value: new THREE.Color(CONFIG.skyHorizon) },
    },
    vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vPos; uniform vec3 top; uniform vec3 horizon; void main(){ float h = clamp(vPos.y / 600.0, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.6)), 1.0); }',
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // --- The sun itself: a low disc in the west, over the ocean. ---
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe6b0, fog: false }),
  );
  sun.position.set(-520, 90, -180);
  sun.lookAt(0, 40, 0);
  scene.add(sun);

  // --- Lights: a warm directional sun, a soft sky fill, and a base
  // ambient so the sides of buildings away from the sun never go black.
  const sunLight = new THREE.DirectionalLight(CONFIG.sunColor, CONFIG.sunIntensity);
  sunLight.position.set(-180, 160, -120);
  scene.add(sunLight);
  scene.add(new THREE.HemisphereLight(0x8fb4d8, 0x5a4632, 0.9));
  scene.add(new THREE.AmbientLight(0x8a90a8, 0.55));

  // --- Ground: green base, then the grey city slab on top. ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ color: 0x4d7a4a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.cityHalf * 2 + 24, CONFIG.cityHalf * 2 + 24),
    new THREE.MeshLambertMaterial({ color: 0x8a8f98 }),
  );
  slab.rotation.x = -Math.PI / 2;
  scene.add(slab);

  // --- Beach sand and ocean on the west edge. ---
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 420),
    new THREE.MeshLambertMaterial({ color: 0xe8d29a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(CONFIG.beachX - 8, 0.02, 0);
  scene.add(sand);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 560),
    new THREE.MeshLambertMaterial({ color: 0x1f6f8f }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(CONFIG.oceanX - 90, 0.01, 0);
  scene.add(ocean);

  // --- The pier: wooden planks reaching into the ocean, where the
  // taxi fare waits. Its posts are a collision-free landmark. ---
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(56, 0.5, 8), pierMat);
  pier.position.set(CONFIG.oceanX + 18, 0.35, CONFIG.pierZ);
  scene.add(pier);
  const pierPostMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
  for (let px = CONFIG.oceanX - 6; px <= CONFIG.oceanX + 40; px += 8) {
    for (const pz of [CONFIG.pierZ - 3.4, CONFIG.pierZ + 3.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 6), pierPostMat);
      post.position.set(px, -0.4, pz);
      scene.add(post);
    }
  }

  // --- Roads: dark asphalt strips with dashed centre lines. ---
  const asphalt = asphaltTexture();
  const lines = roadLines();
  for (const line of lines) {
    for (const horizontal of [true, false]) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(CONFIG.cityHalf * 2 + 24, CONFIG.roadWidth),
        new THREE.MeshLambertMaterial({ map: asphalt.clone() }),
      );
      strip.material.map.needsUpdate = true;
      strip.material.map.repeat.set((CONFIG.cityHalf * 2 + 24) / 16, 1);
      strip.rotation.x = -Math.PI / 2;
      if (horizontal) {
        strip.rotation.z = Math.PI / 2;
        strip.position.set(line, 0.03, 0);
      } else {
        strip.position.set(0, 0.03, line);
      }
      scene.add(strip);
    }
  }

  // --- Sidewalks: pale strips hugging each road. ---
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb9bec6 });
  for (const line of lines) {
    for (const side of [-1, 1]) {
      for (const horizontal of [true, false]) {
        const walk = new THREE.Mesh(
          new THREE.PlaneGeometry(CONFIG.cityHalf * 2 + 24, CONFIG.sidewalkWidth),
          walkMat,
        );
        walk.rotation.x = -Math.PI / 2;
        if (horizontal) {
          walk.rotation.z = Math.PI / 2;
          walk.position.set(line + side * (CONFIG.roadWidth / 2 + CONFIG.sidewalkWidth / 2), 0.04, 0);
        } else {
          walk.position.set(0, 0.04, line + side * (CONFIG.roadWidth / 2 + CONFIG.sidewalkWidth / 2));
        }
        scene.add(walk);
      }
    }
  }

  // --- The park: one block kept green, with a pond and shade trees,
  // instead of buildings. It breaks the grid so the city is not only
  // concrete, and the minimap gets a green patch to read at a glance.
  const parkBlock = { bx: 5, bz: 2 };
  const parkX0 = lines[parkBlock.bx] + CONFIG.roadWidth / 2 + CONFIG.sidewalkWidth;
  const parkX1 = lines[parkBlock.bx + 1] - CONFIG.roadWidth / 2 - CONFIG.sidewalkWidth;
  const parkZ0 = lines[parkBlock.bz] + CONFIG.roadWidth / 2 + CONFIG.sidewalkWidth;
  const parkZ1 = lines[parkBlock.bz + 1] - CONFIG.roadWidth / 2 - CONFIG.sidewalkWidth;
  const parkCx = (parkX0 + parkX1) / 2;
  const parkCz = (parkZ0 + parkZ1) / 2;
  city.park = { x: parkCx, z: parkCz, halfW: (parkX1 - parkX0) / 2, halfD: (parkZ1 - parkZ0) / 2 };
  const lawn = new THREE.Mesh(
    new THREE.PlaneGeometry(parkX1 - parkX0, parkZ1 - parkZ0),
    new THREE.MeshLambertMaterial({ color: 0x3d7a3d }),
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(parkCx, 0.05, parkCz);
  scene.add(lawn);
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(5, 20),
    new THREE.MeshLambertMaterial({ color: 0x2a7a9a }),
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(parkCx - 4, 0.06, parkCz + 2);
  scene.add(pond);
  const treeTrunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const treeLeafMat = new THREE.MeshLambertMaterial({ color: 0x2f7a3d });
  for (let i = 0; i < 8; i++) {
    const tx = parkX0 + 3 + rng() * (parkX1 - parkX0 - 6);
    const tz = parkZ0 + 3 + rng() * (parkZ1 - parkZ0 - 6);
    if (Math.hypot(tx - (parkCx - 4), tz - (parkCz + 2)) < 7) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), treeTrunkMat);
    trunk.position.set(tx, 1.5, tz);
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), treeLeafMat);
    crown.position.set(tx, 4.2, tz);
    scene.add(crown);
  }

  // --- Buildings: one or two boxes per block, taller near the centre.
  // The park block is skipped; the tower block gets the tallest spike.
  const facades = [
    facadeTexture(rng, '#7a6a58', 0.45),
    facadeTexture(rng, '#5d6b7d', 0.4),
    facadeTexture(rng, '#8a7f72', 0.5),
  ];
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3c414c });
  for (let bx = 0; bx < CONFIG.gridCount - 1; bx++) {
    for (let bz = 0; bz < CONFIG.gridCount - 1; bz++) {
      if (bx === parkBlock.bx && bz === parkBlock.bz) continue;
      const x0 = lines[bx] + CONFIG.roadWidth / 2 + CONFIG.sidewalkWidth;
      const x1 = lines[bx + 1] - CONFIG.roadWidth / 2 - CONFIG.sidewalkWidth;
      const z0 = lines[bz] + CONFIG.roadWidth / 2 + CONFIG.sidewalkWidth;
      const z1 = lines[bz + 1] - CONFIG.roadWidth / 2 - CONFIG.sidewalkWidth;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const tall = Math.hypot(cx, cz) < 70; // downtown towers cluster near the origin
      const height = tall ? 26 + rng() * 46 : 7 + rng() * 14;
      const w = (x1 - x0) * (0.55 + rng() * 0.25);
      const d = (z1 - z0) * (0.55 + rng() * 0.25);
      const facade = facades[Math.floor(rng() * facades.length)];
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, height, d),
        new THREE.MeshLambertMaterial({ map: facade }),
      );
      body.position.set(cx, height / 2, cz);
      scene.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6), roofMat);
      roof.position.set(cx, height + 0.4, cz);
      scene.add(roof);
      city.buildings.push({ x: cx, z: cz, halfW: w / 2, halfD: d / 2 });
      // A second low shop on the same block, half the time, outside downtown.
      if (rng() < 0.5 && !tall) {
        const h2 = 5 + rng() * 4;
        const shop = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.5, h2, d * 0.5),
          new THREE.MeshLambertMaterial({ map: facades[1] }),
        );
        const sx = cx + (rng() < 0.5 ? -1 : 1) * w * 0.3;
        const sz = cz + (rng() < 0.5 ? -1 : 1) * d * 0.3;
        shop.position.set(sx, h2 / 2, sz);
        scene.add(shop);
        city.buildings.push({ x: sx, z: sz, halfW: w * 0.25, halfD: d * 0.25 });
      }
    }
  }

  // --- The Solmar Tower: the tallest spike downtown, with a beacon on
  // top, so the delivery target has a landmark the player can see.
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(16, 96, 16),
    new THREE.MeshLambertMaterial({ map: facades[0] }),
  );
  tower.position.set(120, 48, 120);
  scene.add(tower);
  const towerBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4040 }),
  );
  towerBeacon.position.set(120, 97, 120);
  scene.add(towerBeacon);
  city.tower = { x: 120, z: 120 };

  // --- Billboards on two downtown roofs, facing the avenues. ---
  const boards = [
    { x: 40, z: 40, rotY: 0, bg: '#c23b2e', words: 'SUNSET COLA' },
    { x: -40, z: 80, rotY: Math.PI / 2, bg: '#2e6fc2', words: 'BAY AIRLINES' },
  ];
  for (const board of boards) {
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 7),
      new THREE.MeshLambertMaterial({ map: billboardTexture(rng, board.bg, board.words) }),
    );
    face.position.set(board.x, 22, board.z);
    face.rotation.y = board.rotY;
    scene.add(face);
    const posts = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 8, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x2a2e35 }),
    );
    posts.position.set(board.x, 16, board.z);
    scene.add(posts);
  }

  // --- Street lamps along the avenues, warm bulbs at dusk. ---
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2e35 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  for (const line of lines) {
    for (let t = -160; t <= 160; t += 40) {
      for (const side of [-1, 1]) {
        const px = line + side * (CONFIG.roadWidth / 2 + 1);
        const pz = t;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
        pole.position.set(px, 3, pz);
        scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bulbMat);
        bulb.position.set(px, 6.1, pz);
        scene.add(bulb);
        city.lamps.push({ x: px, z: pz });
      }
    }
  }

  // --- Palm trees along the beach boulevard. ---
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7a3d });
  for (let z = -160; z <= 160; z += 20) {
    const px = CONFIG.beachX + 6 + rng() * 4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.set(px, 3.5, z);
    trunk.rotation.z = (rng() - 0.5) * 0.2;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 7), leafMat);
    crown.position.set(px, 8.2, z);
    scene.add(crown);
    city.palms.push({ x: px, z });
  }

  // --- The Solmar Lighthouse: the city's landmark, striped white and
  // coral, standing on the sand at the north end of the beach. ---
  const lightBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 4.2, 26, 12),
    new THREE.MeshLambertMaterial({ color: 0xf2ead8 }),
  );
  lightBase.position.set(CONFIG.beachX + 2, 13, -168);
  scene.add(lightBase);
  const lightBand = new THREE.Mesh(
    new THREE.CylinderGeometry(3.45, 3.45, 4, 12),
    new THREE.MeshLambertMaterial({ color: 0xd95f4b }),
  );
  lightBand.position.set(CONFIG.beachX + 2, 18, -168);
  scene.add(lightBand);
  const lightTop = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  lightTop.position.set(CONFIG.beachX + 2, 27.5, -168);
  scene.add(lightTop);
  city.lighthouse = { x: CONFIG.beachX + 2, z: -168 };

  return city;
}

// Push a circle (a walker, a car) out of every building box it overlaps.
// Returns true when a push happened, so callers can kill speed on impact.
export function resolveBuildingCollision(city, pos, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const dx = pos.x - b.x;
    const dz = pos.z - b.z;
    const px = b.halfW + radius - Math.abs(dx);
    const pz = b.halfD + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      hit = true;
      if (px < pz) pos.x = b.x + Math.sign(dx || 1) * (b.halfW + radius);
      else pos.z = b.z + Math.sign(dz || 1) * (b.halfD + radius);
    }
  }
  return hit;
}
