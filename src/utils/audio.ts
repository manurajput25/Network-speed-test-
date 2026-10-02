// High-precision Web Audio API synthesizer for futuristic sci-fi telemetry audio

class TelemetryAudio {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private streamOsc: OscillatorNode | null = null;
  private streamGain: GainNode | null = null;
  private streamFilter: BiquadFilterNode | null = null;

  constructor() {}

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stopStreamEngine();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Futuristic radar laser chirp for ping probe
  public playPing() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.07);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // Phase transition sci-fi power-up chord
  public playPhaseShift() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [330, 495, 660].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.14);

        gain.gain.setValueAtTime(0.03, now + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.03);
        osc.stop(now + 0.16);
      });
    } catch {}
  }

  // Harmonic sci-fi completion chime
  public playComplete() {
    this.stopStreamEngine();
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C major 9th
      chords.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      });
    } catch {}
  }

  // Continuous dynamic sub-bass / warp hum that revs up with bandwidth speed
  public startStreamEngine() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      if (this.streamOsc) {
        this.stopStreamEngine();
      }

      const now = this.ctx.currentTime;
      this.streamOsc = this.ctx.createOscillator();
      this.streamGain = this.ctx.createGain();
      this.streamFilter = this.ctx.createBiquadFilter();

      this.streamOsc.type = 'sawtooth';
      this.streamOsc.frequency.setValueAtTime(110, now);

      this.streamFilter.type = 'lowpass';
      this.streamFilter.frequency.setValueAtTime(300, now);

      this.streamGain.gain.setValueAtTime(0.001, now);
      this.streamGain.gain.linearRampToValueAtTime(0.02, now + 0.2);

      this.streamOsc.connect(this.streamFilter);
      this.streamFilter.connect(this.streamGain);
      this.streamGain.connect(this.ctx.destination);

      this.streamOsc.start(now);
    } catch {}
  }

  // Adjust engine frequency smoothly as Mbps changes
  public updateStreamPitch(mbps: number) {
    if (!this.enabled || !this.ctx || !this.streamOsc || !this.streamFilter) return;

    try {
      const now = this.ctx.currentTime;
      // Map 0 - 500+ Mbps to 110Hz - 440Hz
      const targetFreq = Math.min(120 + Math.sqrt(Math.max(mbps, 0)) * 14, 520);
      const filterCutoff = Math.min(320 + Math.sqrt(Math.max(mbps, 0)) * 40, 1400);

      this.streamOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
      this.streamFilter.frequency.setTargetAtTime(filterCutoff, now, 0.08);
    } catch {}
  }

  public stopStreamEngine() {
    if (this.streamGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.streamGain.gain.linearRampToValueAtTime(0.0001, now + 0.15);
        setTimeout(() => {
          try {
            if (this.streamOsc) {
              this.streamOsc.stop();
              this.streamOsc.disconnect();
              this.streamOsc = null;
            }
          } catch {}
        }, 160);
      } catch {}
    }
  }
}

export const soundManager = new TelemetryAudio();
