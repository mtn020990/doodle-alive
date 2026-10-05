'use strict';

// Sound for results, all synthesised with Web Audio: no audio files, nothing to license.
// The AI picks one sound effect (job.sound) and a music mood (job.music) per drawing.
// Browsers only allow audio after a tap, so call Sound.unlock() from a click handler.
window.Sound = (() => {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;

  const MOODS = {
    // scale (semitones from the root), root note (Hz), beats per minute, oscillator
    happy: { scale: [0, 2, 4, 7, 9, 12], root: 262, bpm: 132, wave: 'triangle' },
    calm: { scale: [0, 4, 7, 11, 12], root: 220, bpm: 76, wave: 'sine' },
    spooky: { scale: [0, 1, 3, 6, 7, 10], root: 196, bpm: 84, wave: 'sine' },
    epic: { scale: [0, 3, 5, 7, 10, 12], root: 147, bpm: 108, wave: 'sawtooth' },
  };

  function unlock() {
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch {
      ctx = null; // no Web Audio: the page just stays silent
    }
  }

  function tone(freq, start, length, { wave = 'sine', volume = 0.2, endFreq = null } = {}) {
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

  function noise(start, length, { from = 800, to = 800, type = 'bandpass', volume = 0.4 } = {}) {
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

  const EFFECTS = {
    whoosh: (t) => noise(t, 1.2, { from: 300, to: 3500, volume: 0.6 }),
    boing: (t) => { tone(620, t, 0.6, { endFreq: 140, volume: 0.35 }); tone(310, t + 0.05, 0.5, { endFreq: 90, volume: 0.2 }); },
    sparkle: (t) => { for (let i = 0; i < 9; i += 1) tone(1500 + Math.random() * 1800, t + i * 0.07, 0.25, { volume: 0.12 }); },
    splash: (t) => noise(t, 0.9, { from: 2500, to: 250, type: 'lowpass', volume: 0.7 }),
    roar: (t) => { tone(85, t, 1.1, { wave: 'sawtooth', endFreq: 60, volume: 0.3 }); noise(t, 1.1, { from: 400, to: 150, type: 'lowpass', volume: 0.4 }); },
    beep: (t) => { tone(880, t, 0.15, { wave: 'square', volume: 0.1 }); tone(1175, t + 0.2, 0.15, { wave: 'square', volume: 0.1 }); },
  };

  // A short random tune in the mood's scale, looped until stop().
  function startMusic(moodName) {
    const mood = MOODS[moodName] || MOODS.happy;
    const beat = 60 / mood.bpm;
    const tune = Array.from({ length: 8 }, () => mood.scale[Math.floor(Math.random() * mood.scale.length)]);
    const bar = beat * tune.length;
    const playBar = (start) => {
      tune.forEach((step, i) => {
        const freq = mood.root * 2 ** (step / 12);
        tone(freq, start + i * beat, beat * 0.9, { wave: mood.wave, volume: mood.wave === 'sawtooth' ? 0.05 : 0.09 });
        if (i % 4 === 0) tone(mood.root / 2, start + i * beat, beat * 3.5, { volume: 0.07 }); // bass
      });
    };
    let next = ctx.currentTime + 0.1;
    const schedule = () => {
      while (next < ctx.currentTime + bar * 1.5) {
        playBar(next);
        next += bar;
      }
    };
    schedule();
    musicTimer = setInterval(schedule, (bar * 1000) / 2);
  }

  function play(effect, mood) {
    stop();
    if (!ctx || muted) return;
    const now = ctx.currentTime + 0.05;
    if (EFFECTS[effect]) EFFECTS[effect](now);
    if (mood) startMusic(mood);
  }

  function stop() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    if (ctx && master) {
      // Fade out what is already scheduled, then restore the volume for next time.
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      const old = master;
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      setTimeout(() => old.disconnect(), 400);
    }
  }

  function setMuted(value) {
    muted = value;
    if (muted) stop();
  }

  return { unlock, play, stop, setMuted, isMuted: () => muted };
})();
