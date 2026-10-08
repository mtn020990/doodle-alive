// Sound for results, all synthesised with Web Audio: no audio files, nothing to license.
// The AI picks one sound effect (job.sound) and a music mood (job.music) per drawing.
// Browsers only allow audio after a tap, so call sound.unlock() from a click handler.

type Wave = OscillatorType;

const MOODS: Record<string, { scale: number[]; root: number; bpm: number; wave: Wave }> = {
  // scale (semitones from the root), root note (Hz), beats per minute, oscillator
  happy: { scale: [0, 2, 4, 7, 9, 12], root: 262, bpm: 132, wave: 'triangle' },
  calm: { scale: [0, 4, 7, 11, 12], root: 220, bpm: 76, wave: 'sine' },
  spooky: { scale: [0, 1, 3, 6, 7, 10], root: 196, bpm: 84, wave: 'sine' },
  epic: { scale: [0, 3, 5, 7, 10, 12], root: 147, bpm: 108, wave: 'sawtooth' },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let muted = false;
const listeners = new Set<() => void>();

function newMaster(audio: AudioContext) {
  const gain = audio.createGain();
  gain.gain.value = 0.5;
  gain.connect(audio.destination);
  return gain;
}

function tone(
  freq: number,
  start: number,
  length: number,
  { wave = 'sine' as Wave, volume = 0.2, endFreq = 0 } = {},
) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

function noise(
  start: number,
  length: number,
  { from = 800, to = 800, type = 'bandpass' as BiquadFilterType, volume = 0.4 } = {},
) {
  if (!ctx || !master) return;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buffer;
  filter.type = type;
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + length * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  src.connect(filter).connect(gain).connect(master);
  src.start(start);
}

const EFFECTS: Record<string, (t: number) => void> = {
  whoosh: (t) => noise(t, 1.2, { from: 300, to: 3500, volume: 0.6 }),
  boing: (t) => {
    tone(620, t, 0.6, { endFreq: 140, volume: 0.35 });
    tone(310, t + 0.05, 0.5, { endFreq: 90, volume: 0.2 });
  },
  sparkle: (t) => {
    for (let i = 0; i < 9; i += 1)
      tone(1500 + Math.random() * 1800, t + i * 0.07, 0.25, { volume: 0.12 });
  },
  splash: (t) => noise(t, 0.9, { from: 2500, to: 250, type: 'lowpass', volume: 0.7 }),
  roar: (t) => {
    tone(85, t, 1.1, { wave: 'sawtooth', endFreq: 60, volume: 0.3 });
    noise(t, 1.1, { from: 400, to: 150, type: 'lowpass', volume: 0.4 });
  },
  beep: (t) => {
    tone(880, t, 0.15, { wave: 'square', volume: 0.1 });
    tone(1175, t + 0.2, 0.15, { wave: 'square', volume: 0.1 });
  },
};

// A short random tune in the mood's scale, looped until stop().
function startMusic(moodName: string) {
  if (!ctx) return;
  const audio = ctx;
  const mood = MOODS[moodName] ?? MOODS.happy;
  const beat = 60 / mood.bpm;
  const tune = Array.from(
    { length: 8 },
    () => mood.scale[Math.floor(Math.random() * mood.scale.length)],
  );
  const bar = beat * tune.length;
  const playBar = (start: number) => {
    tune.forEach((step, i) => {
      const freq = mood.root * 2 ** (step / 12);
      tone(freq, start + i * beat, beat * 0.9, {
        wave: mood.wave,
        volume: mood.wave === 'sawtooth' ? 0.05 : 0.09,
      });
      if (i % 4 === 0) tone(mood.root / 2, start + i * beat, beat * 3.5, { volume: 0.07 }); // bass
    });
  };
  let next = audio.currentTime + 0.1;
  const schedule = () => {
    while (next < audio.currentTime + bar * 1.5) {
      playBar(next);
      next += bar;
    }
  };
  schedule();
  musicTimer = setInterval(schedule, (bar * 1000) / 2);
}

export const sound = {
  unlock() {
    try {
      if (!ctx) {
        const AudioCtor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtor) return;
        ctx = new AudioCtor();
        master = newMaster(ctx);
      }
      if (ctx.state === 'suspended') void ctx.resume();
    } catch {
      ctx = null; // no Web Audio: the page just stays silent
    }
  },

  play(effect?: string | null, mood?: string | null) {
    sound.stop();
    if (!ctx || muted) return;
    const now = ctx.currentTime + 0.05;
    if (effect && EFFECTS[effect]) EFFECTS[effect](now);
    if (mood) startMusic(mood);
  },

  stop() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    if (ctx && master) {
      // Fade out what is already scheduled, then use a fresh output for next time.
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      const old = master;
      master = newMaster(ctx);
      setTimeout(() => old.disconnect(), 400);
    }
  },

  isMuted: () => muted,

  setMuted(value: boolean) {
    muted = value;
    if (muted) sound.stop();
    listeners.forEach((fn) => fn());
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};
