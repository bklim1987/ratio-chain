let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
}

export function isMuted() {
  return muted;
}

/** -1 = full left channel, 0 = center/both, 1 = full right channel */
export type Pan = -1 | 0 | 1;

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  gainPeak = 0.18,
  pan: Pan = 0,
) {
  if (muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = c.currentTime + start;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    let node: AudioNode = gain;
    if (pan !== 0 && typeof c.createStereoPanner === "function") {
      const panner = c.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      node = panner;
    }
    osc.connect(gain);
    node.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  } catch {
    // audio not available; ignore
  }
}

export function playSuccess(ratios: number, pan: Pan = 0) {
  const base = 420;
  const n = Math.min(ratios + 1, 7);
  for (let i = 0; i < n; i++) {
    tone(base * Math.pow(1.14, i), i * 0.045, 0.16, "triangle", 0.14, pan);
  }
}

export function playDrop(pan: Pan = 0) {
  tone(190, 0, 0.1, "sine", 0.08, pan);
}

export function playCombo(pan: Pan = 0) {
  [523, 659, 784, 988, 1175].forEach((f, i) =>
    tone(f, i * 0.07, 0.28, "sawtooth", 0.1, pan),
  );
}

export function playCorrect(pan: Pan = 0) {
  tone(880, 0, 0.14, "sine", 0.15, pan);
  tone(1108, 0.11, 0.2, "sine", 0.15, pan);
}

export function playFail(pan: Pan = 0) {
  tone(150, 0, 0.28, "square", 0.1, pan);
  tone(110, 0.08, 0.3, "square", 0.08, pan);
}

export function playCountdownBeep() {
  tone(660, 0, 0.15, "sine", 0.12);
}

export function playGo() {
  tone(880, 0, 0.2, "triangle", 0.18);
  tone(1320, 0.05, 0.25, "triangle", 0.14);
}
