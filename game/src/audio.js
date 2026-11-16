// Sound is made, not loaded: every cue below is an oscillator or a noise burst built in WebAudio.
// No file is fetched, so the entry stays a plain static tree and its screenshots match its code.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
    this.ambience = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.noise = this.buildNoise();
  }

  buildNoise() {
    const ctx = this.ctx;
    const frames = Math.floor(ctx.sampleRate * 0.6);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x9e3779b9;
    for (let i = 0; i < frames; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    return buffer;
  }

  tone(type, freq, endFreq, seconds, volume, delay) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq && endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  burst(seconds, volume, cutoff, delay) {
    const ctx = this.ctx;
    if (!ctx || this.muted || !this.noise) return;
    const t0 = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + seconds + 0.02);
  }

  lance() {
    this.tone('sawtooth', 320, 120, 0.13, 0.16);
    this.burst(0.1, 0.12, 2400);
  }

  // The trigger pulled on a lance that cannot fire: a dry, short click, so the reason is audible.
  dry() {
    this.burst(0.05, 0.1, 700);
    this.tone('square', 120, 90, 0.05, 0.06);
  }

  vent() {
    this.burst(0.5, 0.18, 900);
    this.tone('sine', 180, 320, 0.45, 0.07);
  }

  hit() {
    this.tone('square', 160, 70, 0.08, 0.1);
  }

  crit() {
    this.tone('triangle', 620, 880, 0.09, 0.14);
    this.tone('square', 240, 120, 0.12, 0.08, 0.01);
  }

  kill() {
    this.burst(0.32, 0.16, 1200);
    this.tone('sine', 240, 60, 0.34, 0.09);
  }

  step() {
    this.burst(0.08, 0.05, 620);
  }

  hurt() {
    this.tone('sawtooth', 96, 48, 0.28, 0.16);
    this.burst(0.22, 0.14, 700);
  }

  flare() {
    this.tone('triangle', 520, 200, 0.5, 0.12);
    this.burst(0.45, 0.2, 1600);
  }

  wave() {
    this.tone('sawtooth', 150, 300, 0.55, 0.13);
    this.tone('sawtooth', 300, 600, 0.55, 0.07, 0.05);
  }

  upgrade() {
    this.tone('triangle', 523, 523, 0.1, 0.12);
    this.tone('triangle', 784, 784, 0.14, 0.11, 0.09);
  }

  defeat() {
    this.tone('sawtooth', 240, 60, 1.6, 0.16);
    this.tone('sine', 120, 40, 1.8, 0.12, 0.1);
  }

  victory() {
    this.tone('triangle', 392, 392, 0.16, 0.12);
    this.tone('triangle', 523, 523, 0.16, 0.12, 0.16);
    this.tone('triangle', 659, 659, 0.2, 0.13, 0.32);
    this.tone('triangle', 784, 784, 0.4, 0.14, 0.5);
  }

  startAmbience() {
    const ctx = this.ctx;
    if (!ctx || this.ambience || this.muted) return;
    const osc = ctx.createOscillator();
    const bob = ctx.createOscillator();
    const bobGain = ctx.createGain();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    bob.type = 'sine';
    bob.frequency.value = 0.11;
    bobGain.gain.value = 6;
    bob.connect(bobGain);
    bobGain.connect(osc.frequency);
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    bob.start();
    this.ambience = { osc, bob };
  }

  setMuted(next) {
    this.muted = next;
    if (this.master) this.master.gain.value = next ? 0 : 0.5;
    if (!next) this.startAmbience();
  }
}
