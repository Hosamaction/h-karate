const Sound = (() => {
  let ctx = null;
  let enabled = true;
  let volume = 0.8;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep(freq, duration, type = 'sine', vol = volume) {
    if (!enabled) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch(e) {}
  }

  function double(f1, f2, dur) {
    beep(f1, dur);
    setTimeout(() => beep(f2, dur), dur * 1000 + 80);
  }

  return {
    setEnabled: (v) => { enabled = v; },
    setVolume:  (v) => { volume = parseFloat(v) || 0.8; },

    score:      () => beep(880, 0.15, 'square', volume * 0.6),
    point:      () => double(660, 880, 0.12),
    matchStart: () => { beep(440, 0.2); setTimeout(() => beep(660, 0.3), 280); setTimeout(() => beep(880, 0.4), 560); },
    matchEnd:   () => { beep(880, 0.2); setTimeout(() => beep(660, 0.2), 250); setTimeout(() => beep(440, 0.5), 500); },
    winner:     () => { [0,200,400,600].forEach((t,i) => setTimeout(() => beep(440 + i*110, 0.25), t)); },
    penalty:    () => beep(220, 0.3, 'sawtooth', volume * 0.5),
    warning:    () => beep(330, 0.4, 'triangle', volume * 0.6),
    timerLow:   () => beep(660, 0.1, 'square', volume * 0.4),
    submit:     () => beep(1047, 0.12, 'sine', volume * 0.5),
    error:      () => beep(180, 0.4, 'sawtooth', volume * 0.7),
    gong:       () => {
      if (!enabled) return;
      try {
        const c = getCtx();
        [220, 330, 440, 550].forEach((f, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.connect(g); g.connect(c.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(f, c.currentTime + i * 0.02);
          g.gain.setValueAtTime(volume * 0.4, c.currentTime + i * 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.5);
          o.start(c.currentTime + i * 0.02);
          o.stop(c.currentTime + 2.5);
        });
      } catch(e) {}
    }
  };
})();

window.Sound = Sound;
