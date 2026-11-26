/** Tiny Web Audio synth for Tidy the Closet (no sound files). */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  /** Call from a user gesture. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }
  suspend(): void {
    void this.ctx?.suspend();
  }

  private ok(): AudioContext | null {
    return this.muted || !this.ctx || !this.master ? null : this.ctx;
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', to?: number, delay = 0): void {
    const ctx = this.ok();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private hiss(freq: number, q: number, dur: number, vol: number, to?: number, delay = 0): void {
    const ctx = this.ok();
    if (!ctx || !this.noise) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master!);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  throw(): void {
    this.hiss(500, 1.2, 0.22, 0.25, 2200);
  }
  land(): void {
    this.tone(180, 0.09, 0.25, 'triangle', 110);
    this.hiss(900, 2, 0.06, 0.12);
  }
  /** Items folding away; higher with bigger combos. */
  fold(n: number): void {
    const base = 520 + Math.min(n, 10) * 30;
    for (let i = 0; i < Math.min(n, 6); i++) this.tone(base * (1 + i * 0.125), 0.12, 0.13, 'square', undefined, i * 0.045);
    this.hiss(3000, 3, 0.12, 0.08, 1500);
  }
  plop(delay = 0): void {
    this.tone(320, 0.12, 0.2, 'sine', 140, delay);
  }
  woof(): void {
    this.hiss(380, 1.5, 0.12, 0.45, 250);
    this.tone(230, 0.12, 0.25, 'sawtooth', 150);
  }
  swap(): void {
    this.tone(700, 0.05, 0.12, 'square');
    this.tone(950, 0.06, 0.1, 'square', undefined, 0.05);
  }
  rod(): void {
    this.tone(140, 0.4, 0.22, 'sawtooth', 90);
    this.hiss(1200, 8, 0.35, 0.1, 700);
  }
  /** The thong arrives: a cheeky wolf whistle. */
  whistle(): void {
    this.tone(900, 0.22, 0.2, 'sine', 2300);
    this.tone(1300, 0.45, 0.2, 'sine', 700, 0.3);
  }
  boing(): void {
    this.tone(160, 0.35, 0.3, 'triangle', 620);
    this.hiss(1800, 1, 0.2, 0.2, 400);
  }
  clear(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 0.16, 'triangle', undefined, i * 0.11));
  }
  over(): void {
    [392, 370, 349, 262].forEach((f, i) => this.tone(f, 0.35, 0.16, 'triangle', f * 0.97, i * 0.22));
  }
  warn(): void {
    this.tone(660, 0.08, 0.1, 'square');
  }
}
