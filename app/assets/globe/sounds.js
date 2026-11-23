/* Zajel sounds: pigeon wing flaps, take-off, gliding wind, landing flutter and a soft coo.
   Everything is synthesised with WebAudio, so no audio files are bundled. */
window.ZSound = (function () {
  let ctx = null, master = null, noiseBuf = null, muted = false;
  try { muted = localStorage.getItem('zajel.mute') === '1'; } catch (e) { /* storage unavailable */ }

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : .8; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) { // soft pink-ish noise: closer to air and feathers than white noise
      const w = Math.random() * 2 - 1;
      b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * .1848) * .2;
    }
    return ctx;
  }
  function ready() { const c = init(); if (c && c.state === 'suspended') c.resume(); return c && !muted ? c : null; }
  function noise(t, dur) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loopStart = Math.random(); s.start(t, Math.random() * 1.5, dur + .05); return s; }

  /* One wing beat: an airy whoosh (down-stroke) with a soft feather clap. */
  function flap(t, vol, pitch) {
    const n = noise(t, .16), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(700 * pitch, t); bp.frequency.exponentialRampToValueAtTime(1500 * pitch, t + .05); bp.Q.value = .9;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + .14);
    n.connect(bp).connect(g).connect(master);
    const c = noise(t + .03, .05), hp = ctx.createBiquadFilter(), g2 = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 2200;
    g2.gain.setValueAtTime(0, t + .03); g2.gain.linearRampToValueAtTime(vol * .55, t + .034); g2.gain.exponentialRampToValueAtTime(.001, t + .075);
    c.connect(hp).connect(g2).connect(master);
  }
  function wind(t, dur, vol) {
    const n = noise(t, dur), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(900, t + dur * .5); lp.frequency.linearRampToValueAtTime(350, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .3); g.gain.linearRampToValueAtTime(0, t + dur);
    n.connect(lp).connect(g).connect(master);
  }
  function thump(t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + .12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .18);
    o.connect(g).connect(master); o.start(t); o.stop(t + .2);
  }
  /* Rock-dove coo: a breathy, low "hoo-oo" with a falling pitch. */
  function coo(t, vol) {
    const notes = [[0, .26, 340, 300], [.32, .55, 360, 290]];
    notes.forEach(([st, dur, f0, f1]) => {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
      o.type = 'sine'; o2.type = 'triangle';
      o.frequency.setValueAtTime(f0, t + st); o.frequency.exponentialRampToValueAtTime(f1, t + st + dur);
      o2.frequency.setValueAtTime(f0 * 2, t + st); o2.frequency.exponentialRampToValueAtTime(f1 * 2, t + st + dur);
      vib.frequency.value = 22; vg.gain.value = 6; vib.connect(vg); vg.connect(o.frequency);
      lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2;
      const g2 = ctx.createGain(); g2.gain.value = .25; o2.connect(g2).connect(lp); o.connect(lp);
      g.gain.setValueAtTime(0, t + st); g.gain.linearRampToValueAtTime(vol, t + st + .06); g.gain.setValueAtTime(vol, t + st + dur * .6); g.gain.exponentialRampToValueAtTime(.001, t + st + dur);
      lp.connect(g).connect(master);
      [o, o2, vib].forEach(x => { x.start(t + st); x.stop(t + st + dur + .02); });
      const br = noise(t + st, dur), bf = ctx.createBiquadFilter(), bg = ctx.createGain(); // breath
      bf.type = 'bandpass'; bf.frequency.value = 600; bf.Q.value = 1.5;
      bg.gain.setValueAtTime(0, t + st); bg.gain.linearRampToValueAtTime(vol * .25, t + st + .05); bg.gain.exponentialRampToValueAtTime(.001, t + st + dur);
      br.connect(bf).connect(bg).connect(master);
    });
  }

  return {
    get muted() { return muted; },
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('zajel.mute', muted ? '1' : '0'); } catch (e) { /* storage unavailable */ }
      init(); if (master) master.gain.value = muted ? 0 : .8;
      if (!muted && ctx && ctx.state === 'suspended') ctx.resume();
    },
    unlock() { const c = init(); if (c && c.state === 'suspended') c.resume(); },
    /* Take-off: a fast burst of claps that settles into steady beats, then wind. */
    takeoff() {
      const c = ready(); if (!c) return; const t = c.currentTime + .03;
      let at = t; for (let i = 0; i < 14; i++) { const gap = .055 + i * .006; flap(at, .55 - i * .02, 1.15 - i * .015); at += gap; }
      wind(t + .2, 2.2, .18);
    },
    /* A few calm wing beats while the pigeon is in the air. */
    cruise() {
      const c = ready(); if (!c) return; const t = c.currentTime + .03;
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) flap(t + i * .11, .16, .9);
      wind(t, 1.6, .07);
    },
    /* Landing: wings braking (slowing flutter), a soft touch-down, then a coo. */
    landing() {
      const c = ready(); if (!c) return; const t = c.currentTime + .03;
      let at = t; for (let i = 0; i < 10; i++) { flap(at, .3 + (i < 6 ? i * .04 : (9 - i) * .05), 1 - i * .02); at += .07 + i * .012; }
      thump(at + .02, .35);
      coo(at + .7, .22);
    },
    coo() { const c = ready(); if (c) coo(c.currentTime + .03, .22); }
  };
})();
