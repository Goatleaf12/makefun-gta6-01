// Solmar Bay — live minimap: a 2D top-down canvas in the HUD corner.
// Roads, blocks, the ocean and the beach, the park in green, the
// lighthouse, the player arrow with its view cone, traffic dots, the
// taxi in yellow, police in red, roadblocks as red squares, pedestrians
// as faint dots and the mission beacon — all redrawn every frame from
// live state. When the heat is on, the map's border burns red.
import { CONFIG, PALETTE } from './config.js';
import { roadLines } from './roads.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width; // square canvas, 180px
  }

  // City coords (-220..220) -> minimap pixels.
  toMap(x, z) {
    const span = 440;
    const px = ((x + span / 2) / span) * this.size;
    const py = ((z + span / 2) / span) * this.size;
    return { x: px, y: py };
  }

  draw(state) {
    const { ctx, size } = this;
    if (!ctx || size <= 0) return; // canvas not laid out yet: draw nothing
    const half = CONFIG.cityHalf;
    ctx.clearRect(0, 0, size, size);
    // Panel.
    ctx.fillStyle = 'rgba(10, 16, 28, 0.78)';
    ctx.fillRect(0, 0, size, size);
    // Ocean strip on the west edge, then the beach. The ocean ends at
    // x=-216 and the sand runs from there to x=-184, so both rects are
    // drawn from their real edges — never with a negative width.
    const oceanEdge = this.toMap(-216, 0);
    const beachEdge = this.toMap(-184, 0);
    ctx.fillStyle = PALETTE.minimapOcean;
    ctx.fillRect(0, 0, oceanEdge.x, size);
    ctx.fillStyle = PALETTE.minimapBeach;
    ctx.fillRect(oceanEdge.x, 0, beachEdge.x - oceanEdge.x, size);
    // The park, green against the grey blocks.
    if (state.park) {
      const a = this.toMap(state.park.x - state.park.halfW, state.park.z - state.park.halfD);
      const b = this.toMap(state.park.x + state.park.halfW, state.park.z + state.park.halfD);
      ctx.fillStyle = PALETTE.minimapPark;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    // Blocks.
    ctx.fillStyle = PALETTE.minimapBlock;
    const lines = roadLines();
    for (let i = 0; i < lines.length - 1; i++) {
      for (let j = 0; j < lines.length - 1; j++) {
        const a = this.toMap(lines[i] + 8, lines[j] + 8);
        const b = this.toMap(lines[i + 1] - 8, lines[j + 1] - 8);
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      }
    }
    // Roads.
    ctx.strokeStyle = PALETTE.minimapRoad;
    ctx.lineWidth = 5;
    for (const line of lines) {
      const a = this.toMap(line, -half - 10);
      const b = this.toMap(line, half + 10);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const c = this.toMap(-half - 10, line);
      const d = this.toMap(half + 10, line);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }
    // Lighthouse star on the beach.
    if (state.lighthouse) {
      const l = this.toMap(state.lighthouse.x, state.lighthouse.z);
      ctx.fillStyle = PALETTE.minimapLighthouse;
      ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Mission beacon: a pulsing orange ring, with a dotted route line
    // from the player so the job reads as a direction, not just a dot.
    if (state.missionTarget) {
      const m = this.toMap(state.missionTarget.x, state.missionTarget.z);
      const p0 = this.toMap(state.player.x, state.player.z);
      ctx.strokeStyle = 'rgba(255, 157, 0, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(m.x, m.y); ctx.stroke();
      ctx.setLineDash([]);
      const pulse = 6 + Math.sin(state.time * 4) * 2;
      ctx.strokeStyle = PALETTE.minimapMission;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = PALETTE.minimapMission;
      ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Pedestrian dots, faint grey — the city breathing.
    ctx.fillStyle = PALETTE.minimapPedestrian;
    for (const ped of state.pedestrians || []) {
      const p = this.toMap(ped.x, ped.z);
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    // Traffic dots; the taxi reads yellow and bigger.
    for (const car of state.traffic) {
      const p = this.toMap(car.x, car.z);
      if (car.isTaxi) {
        ctx.fillStyle = '#e8c832';
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = PALETTE.minimapTraffic;
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
    // Roadblocks: red squares across the road.
    ctx.fillStyle = PALETTE.minimapRoadblock;
    for (const block of state.roadblocks || []) {
      const p = this.toMap(block.x, block.z);
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    // Police dots, red and bigger — the threat you watch.
    ctx.fillStyle = PALETTE.minimapPolice;
    for (const cop of state.police) {
      const p = this.toMap(cop.x, cop.z);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow, rotated to the heading, white with a dark rim,
    // plus a faint view cone showing where the camera looks.
    const p = this.toMap(state.player.x, state.player.z);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(state.player.heading);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-14, -22); ctx.lineTo(14, -22); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#101418';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.minimapPlayer;
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(4.5, 5); ctx.lineTo(0, 2); ctx.lineTo(-4.5, 5); ctx.closePath();
    ctx.fill();
    ctx.restore();
    // North marker and the city name, so the map reads at a glance.
    // The name sits bottom-right: the beach strip owns the bottom-left.
    ctx.fillStyle = '#ffe9c4';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', size - 14, 14);
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = 'rgba(255, 233, 196, 0.75)';
    ctx.fillText('SOLMAR BAY', size - 70, size - 8);
    // Wanted border: the whole map burns red while the heat is on.
    if (state.wanted > 0) {
      ctx.strokeStyle = `rgba(255, 64, 64, ${0.5 + 0.4 * Math.sin(state.time * 5)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
    }
  }
}
