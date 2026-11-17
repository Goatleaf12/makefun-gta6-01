// Solmar Bay — simple street combat.
// F throws a punch on foot. It is short range and has a cooldown, so it
// is a shove in a crowd, not a weapon: the walker it lands on goes down
// and flees, and anyone in uniform nearby notices. Punching a pedestrian
// in front of a cruiser is a fast way to earn a star.
import { CONFIG } from './config.js';

export class Combat {
  constructor() {
    this.cooldown = 0;
    this.punchRange = 2.2;
    this.cooldownSeconds = 0.6;
  }

  get ready() {
    return this.cooldown <= 0;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
  }

  // Try a punch from the player's spot, facing `heading`. Returns the
  // walker that went down, or null when nothing was in reach.
  // `onCrime` runs when the punch is seen by the police.
  punch(player, pedestrians, police, onCrime) {
    if (!this.ready || player.driving) return null;
    this.cooldown = this.cooldownSeconds;
    player.punchTimer = 0.35;
    const reachX = player.pos.x + Math.sin(player.heading) * 1.4;
    const reachZ = player.pos.z + Math.cos(player.heading) * 1.4;
    const hit = pedestrians.knockDown(reachX, reachZ, this.punchRange);
    if (!hit) return null;
    // A cruiser within 25 metres sees the assault.
    const seen = police.cruiserPositions().some(
      (c) => Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < 25,
    );
    if (seen && onCrime) onCrime();
    return hit;
  }
}
