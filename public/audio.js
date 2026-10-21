const settingKey = 'stress-break-audio-v1';
const midi = note => 440 * 2 ** ((note - 69) / 12);

export class AudioEngine {
  constructor() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(settingKey)) || {}; } catch {}
    this.musicEnabled = saved.music !== false;
    this.effectsEnabled = saved.effects !== false;
    this.context = null;
    this.step = 0;
    this.nextStep = 0;
    this.interval = null;
  }

  saveSettings() {
    try { localStorage.setItem(settingKey, JSON.stringify({ music: this.musicEnabled, effects: this.effectsEnabled })); } catch {}
  }

  start() {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const ctx = this.context = new Context();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -17;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = .003;
      compressor.release.value = .2;
      compressor.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = .7;
      this.master.connect(compressor);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.musicEnabled ? .38 : 0;
      this.musicBus.connect(this.master);
      this.effectsBus = ctx.createGain();
      this.effectsBus.gain.value = this.effectsEnabled ? .78 : 0;
      this.effectsBus.connect(this.master);
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
      this.nextStep = ctx.currentTime + .06;
      this.interval = setInterval(() => this.schedule(), 25);
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }

  setMusic(enabled) {
    this.musicEnabled = enabled;
    this.saveSettings();
    if (enabled) this.start();
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(enabled ? .38 : 0, this.context.currentTime, .025);
  }

  setEffects(enabled) {
    this.effectsEnabled = enabled;
    this.saveSettings();
    if (enabled) this.start();
    if (this.effectsBus) this.effectsBus.gain.setTargetAtTime(enabled ? .78 : 0, this.context.currentTime, .02);
  }

  tone({ frequency, endFrequency, start, duration, level, type = 'sine', bus = this.musicBus, cutoff }) {
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), start + duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(level, .0002), start + Math.min(.012, duration / 5));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    if (cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      oscillator.connect(filter).connect(envelope);
    } else oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  noise({ start, duration, level, frequency = 1800, endFrequency, type = 'highpass', bus = this.effectsBus }) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, start);
    if (endFrequency) filter.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 30), start + duration);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(level, .0002), start + Math.min(.008, duration / 5));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter).connect(envelope).connect(bus);
    source.start(start);
    source.stop(start + duration + .01);
  }

  schedule() {
    if (!this.context || this.context.state !== 'running') return;
    const stepLength = 60 / 136 / 4;
    while (this.nextStep < this.context.currentTime + .13) {
      if (this.musicEnabled) this.musicStep(this.step, this.nextStep);
      this.nextStep += stepLength;
      this.step++;
    }
  }

  musicStep(step, at) {
    const beat = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const roots = [36, 32, 39, 34];
    const root = roots[bar];
    if (beat === 0 || beat === 7 || beat === 8 || beat === 11) {
      this.tone({ frequency: 145, endFrequency: 46, start: at, duration: .19, level: .48, bus: this.musicBus });
      this.noise({ start: at, duration: .018, level: .025, frequency: 2600, bus: this.musicBus });
    }
    if (beat === 4 || beat === 12) {
      this.noise({ start: at, duration: .16, level: .14, frequency: 1600, bus: this.musicBus });
      this.tone({ frequency: 190, endFrequency: 105, start: at, duration: .11, level: .09, bus: this.musicBus });
    }
    if (beat % 2 === 0) this.noise({ start: at, duration: beat === 14 ? .09 : .042, level: beat === 14 ? .05 : .032, frequency: 6600, bus: this.musicBus });
    if ([0, 3, 6, 8, 10, 14].includes(beat)) {
      const note = root + ([3, 10, 14].includes(beat) ? 7 : 0);
      this.tone({ frequency: midi(note), start: at, duration: .18, level: .19, type: 'sawtooth', cutoff: 460, bus: this.musicBus });
    }
    if ([2, 5, 9, 13, 15].includes(beat)) {
      const intervals = [0, 3, 7, 10, 12];
      const note = root + 24 + intervals[[2, 5, 9, 13, 15].indexOf(beat)];
      this.tone({ frequency: midi(note), start: at, duration: .11, level: .045, type: 'triangle', bus: this.musicBus });
    }
    if (beat === 0) {
      for (const interval of [0, 3, 7]) this.tone({ frequency: midi(root + 24 + interval), start: at, duration: 1.25, level: .013, type: 'sawtooth', cutoff: 1200, bus: this.musicBus });
    }
  }

  playAction(mode, tool, combo = 1) {
    this.start();
    if (!this.effectsEnabled || !this.context) return;
    const at = this.context.currentTime + .01;
    if (mode === 'paper') {
      this.noise({ start: at, duration: .36, level: .31, frequency: 3400, endFrequency: 500, type: 'bandpass' });
      this.noise({ start: at + .12, duration: .19, level: .14, frequency: 4800, endFrequency: 900, type: 'highpass' });
    } else if (mode === 'desk') {
      this.noise({ start: at, duration: .42, level: .31, frequency: 1100, endFrequency: 250, type: 'bandpass' });
      this.tone({ frequency: 130, endFrequency: 42, start: at, duration: .34, level: .54, bus: this.effectsBus });
      for (let i = 0; i < 3; i++) this.tone({ frequency: 580 + i * 240, endFrequency: 150 + i * 90, start: at + .07 + i * .06, duration: .13, level: .08, type: 'square', bus: this.effectsBus });
    } else if (mode === 'laptop') {
      this.noise({ start: at, duration: .24, level: .27, frequency: 3900, endFrequency: 350, type: 'bandpass' });
      this.tone({ frequency: 980, endFrequency: 72, start: at, duration: .26, level: .2, type: 'square', bus: this.effectsBus });
      this.tone({ frequency: 88, endFrequency: 35, start: at + .04, duration: .3, level: .38, bus: this.effectsBus });
    } else {
      this.noise({ start: at, duration: .17, level: .15, frequency: 1500, endFrequency: 350, type: 'bandpass' });
      this.tone({ frequency: 175, endFrequency: 48, start: at + .045, duration: .22, level: .47, bus: this.effectsBus });
      if (tool === 'glove') this.tone({ frequency: 480, endFrequency: 95, start: at + .035, duration: .13, level: .14, bus: this.effectsBus });
      if (tool === 'bat') this.noise({ start: at + .045, duration: .19, level: .25, frequency: 800, endFrequency: 230, type: 'bandpass' });
      if (tool === 'foam') this.tone({ frequency: 340, endFrequency: 130, start: at + .05, duration: .19, level: .13, type: 'triangle', bus: this.effectsBus });
      if (tool === 'meteor') {
        this.noise({ start: at + .04, duration: .44, level: .35, frequency: 1200, endFrequency: 180, type: 'bandpass' });
        this.tone({ frequency: 95, endFrequency: 26, start: at + .05, duration: .5, level: .54, bus: this.effectsBus });
      }
    }
    if (mode === 'laptop') {
      this.noise({ start: at + .035, duration: .31, level: .24, frequency: 6200, endFrequency: 850, type: 'highpass' });
      this.tone({ frequency: 1250, endFrequency: 180, start: at + .08, duration: .24, level: .12, type: 'square', bus: this.effectsBus });
    } else if (mode === 'desk') {
      this.noise({ start: at + .07, duration: .38, level: .22, frequency: 950, endFrequency: 150, type: 'bandpass' });
      this.tone({ frequency: 92, endFrequency: 28, start: at + .06, duration: .4, level: .36, bus: this.effectsBus });
    } else if (mode === 'paper') {
      this.noise({ start: at + .09, duration: .28, level: .17, frequency: 4800, endFrequency: 1000, type: 'highpass' });
    }
    if (combo > 1 && combo % 5 === 0) {
      for (let i = 0; i < 3; i++) this.tone({ frequency: midi(72 + i * 4), start: at + .08 + i * .075, duration: .11, level: .075, type: 'triangle', bus: this.effectsBus });
    }
  }
}
