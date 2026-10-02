// Web Audio API synthesizer for clean completion chime

class TelemetryAudio {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

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
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Purely silent during testing (per user requirement: sound only after check is complete)
  public playPing() {}
  public playPhaseShift() {}
  public startStreamEngine() {}
  public updateStreamPitch(_mbps: number) {}
  public stopStreamEngine() {}

  // Satisfying harmonic sci-fi chime played ONLY when the entire test is complete
  public playComplete() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Modern crystal notification chord: C5 -> G5 -> C6 -> E6
      const notes = [523.25, 783.99, 1046.5, 1318.51];
      
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Sine wave for crystal clear tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.06, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.4);
      });
    } catch {
      // Audio fallback
    }
  }
}

export const soundManager = new TelemetryAudio();
