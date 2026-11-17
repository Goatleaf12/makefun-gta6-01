// Solmar Bay — generative sound, no audio files.
// Everything is synthesized live with the Web Audio API: the engine is
// a low sawtooth whose pitch follows the car's speed, the siren is two
// alternating tones while the heat is on, and the one-shots (pickup
// blip, cash arpeggio, punch thud, click) are short oscillator envelopes.
// Audio starts on the first user gesture, as browsers require, and the
// mute key (M) silences the whole engine.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.muted = false;
    this.started = false;
  }

  // Call from a user gesture (the start button, a keypress). Safe to
  // call repeatedly: it builds the graph once and resumes the context.
  start() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      // Engine: a sawtooth through a low-pass, quiet at idle.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Siren: a sine that an LFO swings between two tones.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 720;
      this.sirenLfo = this.ctx.createOscillator();
      this.sirenLfo.type = 'square';
      this.sirenLfo.frequency.value = 0.7;
      const sirenLfoGain = this.ctx.createGain();
      sirenLfoGain.gain.value = 180;
      this.sirenLfo.connect(sirenLfoGain);
      sirenLfoGain.connect(this.sirenOsc.frequency);
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.sirenLfo.start();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.started = true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // Called every frame: engine pitch follows speed, siren follows heat.
  update(speed, wanted, driving) {
    if (!this.started || !this.ctx) return;
    const now = this.ctx.currentTime;
    const engineLevel = driving ? Math.min(0.16, 0.03 + speed * 0.003) : 0;
    this.engineGain.gain.setTargetAtTime(engineLevel, now, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed * 3.2, now, 0.1);
    const sirenLevel = wanted > 0 ? 0.045 + wanted * 0.008 : 0;
    this.sirenGain.gain.setTargetAtTime(sirenLevel, now, 0.2);
  }

  // A short one-shot tone: frequency, duration, shape and loudness.
  blip(freq, seconds, type, volume) {
    if (!this.started || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  pickup() {
    this.blip(880, 0.12, 'sine', 0.22);
    setTimeout(() => this.blip(1320, 0.14, 'sine', 0.2), 90);
  }

  // Cash: three rising notes, the sound of a job paying out.
  cash() {
    [660, 880, 1100].forEach((freq, i) => {
      setTimeout(() => this.blip(freq, 0.16, 'triangle', 0.22), i * 90);
    });
  }

  punch() {
    this.blip(120, 0.12, 'square', 0.25);
  }

  click() {
    this.blip(520, 0.06, 'sine', 0.15);
  }

  fail() {
    this.blip(220, 0.3, 'sawtooth', 0.18);
    setTimeout(() => this.blip(160, 0.35, 'sawtooth', 0.18), 160);
  }
}
