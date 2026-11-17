// Solmar Bay — HUD: the DOM overlay the player actually reads.
// Wanted stars, cash, health, speed, the mission objective, the job
// board with all five jobs and their rewards, a toast line, the save
// note, and the start / pause screens. All DOM, so it stays crisp at
// any size and costs the WebGL renderer nothing.
import { PALETTE } from './config.js';

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.starsEl = document.getElementById('wanted');
    this.moneyEl = document.getElementById('money');
    this.healthEl = document.getElementById('health');
    this.healthBarEl = document.getElementById('health-bar');
    this.speedEl = document.getElementById('speed');
    this.objectiveEl = document.getElementById('objective');
    this.jobsEl = document.getElementById('jobs');
    this.toastEl = document.getElementById('toast');
    this.hintEl = document.getElementById('hint');
    this.saveEl = document.getElementById('save-note');
    this.menuEl = document.getElementById('menu');
    this.pauseEl = document.getElementById('pause');
    this.continueBtn = document.getElementById('continue-btn');
    this.toastTimer = 0;
    this.lastObjective = ''; // setObjective skips repeats of the same text
    this.lastJobs = '';
  }

  setWanted(level) {
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < level ? '★' : '☆';
    this.starsEl.textContent = stars;
    this.starsEl.style.color = level > 0 ? PALETTE.wanted : PALETTE.hudText;
    this.starsEl.style.opacity = level > 0 ? '1' : '0.55';
  }

  setMoney(amount) {
    this.moneyEl.textContent = `$${amount.toLocaleString('en-US')}`;
  }

  setHealth(health, maxHealth) {
    const pct = Math.max(0, Math.round((health / maxHealth) * 100));
    this.healthBarEl.style.width = `${pct}%`;
    this.healthBarEl.style.background = pct < 30 ? PALETTE.healthLow : PALETTE.health;
    this.healthEl.textContent = `♥ ${pct}`;
    this.healthEl.style.color = pct < 30 ? PALETTE.healthLow : PALETTE.hudText;
  }

  setSpeed(kmh, driving) {
    this.speedEl.textContent = driving ? `${Math.round(kmh)} km/h` : '';
  }

  setObjective(text) {
    // Skip the DOM write when nothing changed: the HUD updates every
    // frame, and a textContent assignment is work for nothing.
    if (text === this.lastObjective) return;
    this.lastObjective = text;
    this.objectiveEl.textContent = text;
  }

  // The job board: five rows, each with a state mark and its reward.
  // Rebuilt only when the board actually changes.
  setJobs(jobs) {
    const key = jobs.map((j) => `${j.state}:${j.reward}`).join('|');
    if (key === this.lastJobs) return;
    this.lastJobs = key;
    this.jobsEl.innerHTML = jobs.map((job) => {
      const mark = job.state === 'done' ? '✓' : job.state === 'active' ? '▶' : job.state === 'ready' ? '○' : '🔒';
      return `<div class="job ${job.state}"><span class="job-mark">${mark}</span><span class="job-title">${job.title}</span><span class="job-reward">$${job.reward}</span></div>`;
    }).join('');
  }

  toast(text, seconds = 4) {
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = '1';
    this.toastTimer = seconds;
    document.getElementById('status').textContent = text;
  }

  setHint(text) {
    this.hintEl.textContent = text;
  }

  setSaveNote(text) {
    this.saveEl.textContent = text;
  }

  update(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.style.opacity = '0';
    }
  }

  showMenu(show) {
    this.menuEl.style.display = show ? 'flex' : 'none';
  }

  showPause(show) {
    this.pauseEl.style.display = show ? 'flex' : 'none';
  }

  showHud(show) {
    this.root.style.display = show ? 'block' : 'none';
  }

  showContinue(show, label) {
    if (!this.continueBtn) return;
    this.continueBtn.style.display = show ? 'inline-block' : 'none';
    if (show && label) this.continueBtn.textContent = label;
  }
}
