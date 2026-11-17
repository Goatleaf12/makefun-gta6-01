// Solmar Bay — deterministic randomness.
// One tiny generator (mulberry32) feeds every system that must be the
// same on every load: the city layout, the traffic spawns, the walkers.
// The same seed rebuilds the same city, so screenshots stay comparable
// between runs and a save can name a seed instead of a whole world.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one entry of an array with a seeded generator.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A number in [min, max) from a seeded generator.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Shuffle a copy of an array in place with a seeded generator.
export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
