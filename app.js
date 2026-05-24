'use strict';

// ── Music data ────────────────────────────────────────────────

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const VOICINGS = {
  'C-M':   { frets:[-1,3,2,0,1,0] },
  'C#-M':  { frets:[-1,4,3,1,2,1] },
  'D-M':   { frets:[-1,-1,0,2,3,2] },
  'D#-M':  { frets:[-1,-1,1,3,4,3] },
  'E-M':   { frets:[0,2,2,1,0,0] },
  'F-M':   { frets:[1,3,3,2,1,1], barre:{fret:1,from:0,to:5} },
  'F#-M':  { frets:[2,4,4,3,2,2], barre:{fret:2,from:0,to:5} },
  'G-M':   { frets:[3,2,0,0,0,3] },
  'G#-M':  { frets:[4,3,1,1,1,4] },
  'A-M':   { frets:[-1,0,2,2,2,0] },
  'A#-M':  { frets:[-1,1,3,3,3,1], barre:{fret:1,from:1,to:5} },
  'B-M':   { frets:[-1,2,4,4,4,2], barre:{fret:2,from:1,to:5} },
  'C-m':   { frets:[-1,3,5,5,4,3], barre:{fret:3,from:1,to:5} },
  'C#-m':  { frets:[-1,4,6,6,5,4], barre:{fret:4,from:1,to:5} },
  'D-m':   { frets:[-1,-1,0,2,3,1] },
  'D#-m':  { frets:[-1,-1,1,3,4,2] },
  'E-m':   { frets:[0,2,2,0,0,0] },
  'F-m':   { frets:[1,3,3,1,1,1], barre:{fret:1,from:0,to:5} },
  'F#-m':  { frets:[2,4,4,2,2,2], barre:{fret:2,from:0,to:5} },
  'G-m':   { frets:[3,5,5,3,3,3], barre:{fret:3,from:0,to:5} },
  'G#-m':  { frets:[4,6,6,4,4,4], barre:{fret:4,from:0,to:5} },
  'A-m':   { frets:[-1,0,2,2,1,0] },
  'A#-m':  { frets:[-1,1,3,3,2,1], barre:{fret:1,from:1,to:5} },
  'B-m':   { frets:[-1,2,4,4,3,2], barre:{fret:2,from:1,to:5} },
};

// 8 eighth-note slots per bar.  swing: 0=straight, 0.38=blues shuffle
// chordDur: guitar ring time in seconds
const GROOVES = {
  rock:   {
    kick:  [1,0,0,0,1,0,0,0],
    snare: [0,0,1,0,0,0,1,0],
    hihat: [1,1,1,1,1,1,1,1],
    guitar:[1,0,0,0,1,0,0,0],
    swing: 0, chordDur: 1.4,
  },
  blues:  {
    kick:  [1,0,0,0,0,0,1,0],
    snare: [0,0,1,0,0,0,1,0],
    hihat: [1,0,1,0,1,0,1,0],
    guitar:[1,0,0,0,0,0,0,0],
    swing: 0.38, chordDur: 3.0,
  },
  reggae: {
    kick:  [0,0,0,0,1,0,0,0],
    snare: [0,0,0,0,1,0,0,0],
    hihat: [1,0,1,0,1,0,1,0],
    guitar:[0,0,0,0,0,1,1,0],
    swing: 0, chordDur: 0.13,
  },
  funk:   {
    kick:  [1,0,0,1,1,0,0,0],
    snare: [0,0,1,0,0,0,1,1],
    hihat: [1,1,1,1,1,1,1,1],
    guitar:[1,0,0,1,0,1,0,0],
    swing: 0, chordDur: 0.28,
  },
};

const PROGS = {
  'I-IV-V':    { offsets:[0,5,7],                        quality:['M','M','M'] },
  '12-bar':    { offsets:[0,0,0,0,5,5,0,0,7,5,0,7],      quality:Array(12).fill('7') },
  'I-V-vi-IV': { offsets:[0,7,9,5],                      quality:['M','M','m','M'] },
};

// ── Audio context + master chain ──────────────────────────────

let ctx = null;
let compressor = null;
let reverbBus = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;
    compressor.connect(ctx.destination);
    reverbBus = buildReverb();
  }
  return ctx;
}

function buildReverb() {
  const len = ctx.sampleRate * 1.8;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  conv.connect(wet);
  wet.connect(compressor);
  return conv;
}

// ── Drum synthesis ────────────────────────────────────────────

function kick(t, vol) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 1.6, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  g.connect(compressor);

  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.06);
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.35);
  osc.connect(g);
  osc.start(t); osc.stop(t + 0.46);

  const len = Math.ceil(ctx.sampleRate * 0.01);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const click = ctx.createBufferSource();
  click.buffer = buf;
  const cg = ctx.createGain();
  cg.gain.value = vol * 0.5;
  click.connect(cg); cg.connect(compressor);
  click.start(t);
}

function snare(t, vol) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);
  const og = ctx.createGain();
  og.gain.setValueAtTime(vol * 0.7, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(og); og.connect(compressor);
  osc.start(t); osc.stop(t + 0.13);

  const len = Math.ceil(ctx.sampleRate * 0.22);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const nd = buf.getChannelData(0);
  for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 0.6;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  noise.connect(bp); bp.connect(ng); ng.connect(compressor);
  const rg = ctx.createGain(); rg.gain.value = vol * 0.3;
  ng.connect(rg); rg.connect(reverbBus);
  noise.start(t);
}

function hihat(t, vol) {
  const len = Math.ceil(ctx.sampleRate * 0.065);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const nd = buf.getChannelData(0);
  for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 7000;
  const pk = ctx.createBiquadFilter();
  pk.type = 'peaking'; pk.frequency.value = 10000; pk.gain.value = 6; pk.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
  noise.connect(hp); hp.connect(pk); pk.connect(g); g.connect(compressor);
  noise.start(t);
}

// ── Bass synthesis ────────────────────────────────────────────

function softClip(n, amount) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return c;
}

function bass(t, freq, vol, dur) {
  const sine = ctx.createOscillator();
  sine.frequency.value = freq;
  const tri = ctx.createOscillator();
  tri.type = 'triangle'; tri.frequency.value = freq;
  const sg = ctx.createGain(); sg.gain.value = 0.75;
  const tg = ctx.createGain(); tg.gain.value = 0.28;
  const ws = ctx.createWaveShaper();
  ws.curve = softClip(256, 2.2); ws.oversample = '2x';
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 400;
  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, t);
  env.gain.setTargetAtTime(vol * 0.7, t + 0.04, 0.08);
  env.gain.setTargetAtTime(0.001, t + dur * 0.7, 0.05);
  sine.connect(sg); tri.connect(tg);
  sg.connect(ws); tg.connect(ws);
  ws.connect(lp); lp.connect(env); env.connect(compressor);
  sine.start(t); sine.stop(t + dur);
  tri.start(t);  tri.stop(t + dur);
}

// ── Karplus-Strong guitar chord (pre-computed) ────────────────
// Computes the string synthesis in JS, stores result in an AudioBuffer,
// then plays it back. Avoids unreliable Web Audio feedback-loop quirks.

function ksChord(t, rootFreq, quality, dur, pan, vol) {
  const semitones = quality === 'm' ? [0, 3, 7, 12, 15]
    : quality === '7'               ? [0, 4, 7, 10, 12]
    :                                 [0, 4, 7, 12, 16];

  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(compressor);
  if (dur > 0.3) {
    const rg = ctx.createGain(); rg.gain.value = 0.18;
    panner.connect(rg); rg.connect(reverbBus);
  }

  const sr = ctx.sampleRate;
  // decay < 1 controls how fast the string dies; 0.997 ≈ guitar sustain
  const decay = 0.997;

  semitones.forEach((semi, idx) => {
    const freq   = rootFreq * Math.pow(2, semi / 12);
    const strum  = t + idx * 0.013;
    const period = Math.max(2, Math.round(sr / freq));
    // compute just enough samples to cover the chord duration
    const totalLen = Math.min(Math.ceil(sr * (dur + 0.4)), sr * 4);

    const buf  = ctx.createBuffer(1, totalLen, sr);
    const d    = buf.getChannelData(0);

    // fill first period with noise (the "pluck")
    for (let i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
    // KS recursion: average consecutive delayed samples
    for (let i = period; i < totalLen; i++) {
      d[i] = decay * 0.5 * (d[i - period] + d[i - period + 1]);
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol * 0.22;
    src.connect(g); g.connect(panner);
    src.start(strum);
    src.stop(strum + dur + 0.4);
  });
}

// ── Backing track scheduler ───────────────────────────────────

class BackingTrack {
  constructor() {
    this.playing  = false;
    this.bpm      = 120;
    this.groove   = 'rock';
    this.key      = 'E';
    this.prog     = 'I-IV-V';
    this.drumVol  = 0.8;
    this.bassVol  = 0.6;
    this.chordVol = 0.5;
    this._nextTime = 0;
    this._step     = 0;
    this._barStep  = 0;
    this._rafId    = null;
    this.onBeat    = null;
    this.onBar     = null;
  }

  start() {
    getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    this.playing   = true;
    this._step     = 0;
    this._barStep  = 0;
    this._nextTime = ctx.currentTime + 0.05;
    this._tick();
  }

  stop() {
    this.playing = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  _tick() {
    if (!this.playing) return;
    while (this._nextTime < ctx.currentTime + 0.12) {
      this._scheduleStep();
    }
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  _eighth() { return 60 / this.bpm / 2; }

  _scheduleStep() {
    const t    = this._nextTime;
    const step = this._step;
    const g    = GROOVES[this.groove];

    // swing: odd steps stretched
    const base = this._eighth();
    const dur  = (step % 2 === 1 && g.swing > 0) ? base * (1 + g.swing) : base;

    // Chord lookup
    const prog     = PROGS[this.prog];
    const chordIdx = this._barStep % prog.offsets.length;
    const keyIdx   = NOTES.indexOf(this.key);
    const noteIdx  = (keyIdx + prog.offsets[chordIdx] + 12) % 12;
    const noteName = NOTES[noteIdx];
    const quality  = prog.quality[chordIdx];
    const rootFreq = 440 * Math.pow(2, (noteIdx - 9) / 12) * 0.5;

    // Drums
    if (g.kick[step])  kick(t, this.drumVol);
    if (g.snare[step]) snare(t, this.drumVol * 0.85);
    if (g.hihat[step]) hihat(t, this.drumVol * 0.5);

    // Bass on kick hits and beat 1
    if (g.kick[step] || step === 0) {
      bass(t, rootFreq * 0.5, this.bassVol * 0.9, dur * 3);
    }

    // Guitar chord
    if (g.guitar[step]) {
      const pan = step < 4 ? -0.2 : 0.2;
      ksChord(t, rootFreq, quality === '7' ? '7' : quality, g.chordDur, pan, this.chordVol);
    }

    // UI callbacks (schedule via setTimeout to sync with audio)
    if (step % 2 === 0 && this.onBeat) {
      const delay = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => this.onBeat(step / 2), delay);
    }
    if (step === 0 && this.onBar) {
      const label = noteName + (quality === 'm' ? 'm' : quality === '7' ? '7' : '');
      const delay = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => this.onBar(label, chordIdx), delay);
    }

    this._nextTime += dur;
    this._step = (this._step + 1) % 8;
    if (this._step === 0) {
      this._barStep = (this._barStep + 1) % prog.offsets.length;
    }
  }
}

// ── SVG chord diagram ─────────────────────────────────────────

function buildDiagramSVG(voicing) {
  if (!voicing) return `<div class="no-voicing">—</div>`;
  const { frets, barre } = voicing;
  const startFret = voicing.startFret || 1;
  const sw = 88, sh = 90;
  const padL = 14, padT = 18, padR = 8, padB = 8;
  const W = sw - padL - padR;
  const H = sh - padT - padB;
  const sx = W / 5;
  const fy = H / 4;
  let s = `<svg width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}">`;

  if (startFret === 1) {
    s += `<line x1="${padL}" y1="${padT}" x2="${padL+W}" y2="${padT}" stroke="#ccc" stroke-width="3"/>`;
  } else {
    s += `<text x="${padL-5}" y="${padT+fy*0.6}" font-size="9" fill="#888" text-anchor="end">${startFret}</text>`;
  }
  for (let f = 1; f <= 4; f++) {
    const y = padT + fy * f;
    s += `<line x1="${padL}" y1="${y}" x2="${padL+W}" y2="${y}" stroke="#444" stroke-width="0.8"/>`;
  }
  for (let i = 0; i < 6; i++) {
    const x = padL + sx * i;
    s += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT+H}" stroke="#555" stroke-width="0.8"/>`;
  }
  if (barre) {
    const by = padT + fy * (barre.fret - startFret + 1) - fy * 0.5;
    const bx1 = padL + sx * barre.from;
    const bx2 = padL + sx * barre.to;
    s += `<rect x="${bx1}" y="${by-5}" width="${bx2-bx1}" height="10" rx="5" fill="#e85d04"/>`;
  }
  frets.forEach((fret, i) => {
    const x = padL + sx * i;
    if (fret === -1) {
      s += `<text x="${x}" y="${padT-5}" font-size="10" fill="#666" text-anchor="middle">✕</text>`;
    } else if (fret === 0) {
      s += `<circle cx="${x}" cy="${padT-5}" r="4" fill="none" stroke="#aaa" stroke-width="1.2"/>`;
    } else {
      const cy = padT + fy * (fret - startFret + 1) - fy * 0.5;
      const isBarre = barre && fret === barre.fret && i >= barre.from && i <= barre.to;
      if (!isBarre) s += `<circle cx="${x}" cy="${cy}" r="5.5" fill="#e85d04"/>`;
    }
  });
  s += '</svg>';
  return s;
}

// ── UI wiring ─────────────────────────────────────────────────

const bt = new BackingTrack();

function getChordLabel(keyIdx, offset, quality) {
  const noteIdx = (keyIdx + offset + 12) % 12;
  return NOTES[noteIdx] + (quality === 'm' ? 'm' : quality === '7' ? '7' : '');
}

function updateChordDisplay() {
  const display = document.getElementById('chord-display');
  const prog    = PROGS[bt.prog];
  const keyIdx  = NOTES.indexOf(bt.key);
  const seen    = new Set();
  const chords  = [];
  prog.offsets.forEach((offset, i) => {
    const label = getChordLabel(keyIdx, offset, prog.quality[i]);
    if (!seen.has(label)) {
      seen.add(label);
      const noteIdx = (keyIdx + offset + 12) % 12;
      chords.push({ label, quality: prog.quality[i], noteName: NOTES[noteIdx] });
    }
  });
  display.innerHTML = chords.map(c => {
    const vKey = `${c.noteName}-${c.quality === '7' ? 'M' : c.quality}`;
    const v = VOICINGS[vKey] || null;
    return `<div class="chord-card" data-chord="${c.label}">
      <div class="chord-card-name">${c.label}</div>
      ${buildDiagramSVG(v)}
    </div>`;
  }).join('');
}

function highlightChord(label) {
  document.querySelectorAll('.chord-card').forEach(el =>
    el.classList.toggle('active-chord', el.dataset.chord === label));
  document.getElementById('now-chord').textContent = label;
}

function buildBeatDots() {
  const row = document.getElementById('beat-row');
  row.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = 'beat-dot' + (i === 0 ? ' accent' : '');
    dot.id = `dot-${i}`;
    row.appendChild(dot);
  }
}

bt.onBeat = idx => {
  document.querySelectorAll('.beat-dot').forEach((d, i) =>
    d.classList.toggle('active', i === idx));
};
bt.onBar = label => highlightChord(label);

// BPM slider
document.getElementById('bpm-slider').addEventListener('input', e => {
  bt.bpm = +e.target.value;
  document.getElementById('bpm-number').textContent = e.target.value;
});

// Tap tempo
let tapTimes = [];
document.getElementById('tap-btn').addEventListener('click', () => {
  const now = performance.now();
  tapTimes.push(now);
  if (tapTimes.length > 6) tapTimes.shift();
  const btn = document.getElementById('tap-btn');
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), 80);
  if (tapTimes.length >= 2) {
    const gaps = [];
    for (let i = 1; i < tapTimes.length; i++) gaps.push(tapTimes[i] - tapTimes[i-1]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const bpm = Math.round(60000 / avg);
    if (bpm >= 40 && bpm <= 200) {
      bt.bpm = bpm;
      document.getElementById('bpm-slider').value = bpm;
      document.getElementById('bpm-number').textContent = bpm;
    }
  }
});

// Key
document.getElementById('key-select').addEventListener('change', e => {
  bt.key = e.target.value;
  updateChordDisplay();
});

// Progression
document.querySelectorAll('#prog-ctrl .seg').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('#prog-ctrl .seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    bt.prog = btn.dataset.prog;
    bt._barStep = 0;
    updateChordDisplay();
  })
);

// Groove
document.querySelectorAll('#groove-ctrl .seg').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('#groove-ctrl .seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    bt.groove = btn.dataset.groove;
  })
);

// Volume
document.getElementById('drum-vol').addEventListener('input',  e => { bt.drumVol  = +e.target.value; });
document.getElementById('bass-vol').addEventListener('input',  e => { bt.bassVol  = +e.target.value; });
document.getElementById('chord-vol').addEventListener('input', e => { bt.chordVol = +e.target.value; });

// Play / Stop
document.getElementById('play-btn').addEventListener('click', () => {
  const btn = document.getElementById('play-btn');
  if (bt.playing) {
    bt.stop();
    btn.textContent = 'Play';
    btn.classList.remove('playing');
    document.getElementById('now-chord').textContent = '—';
    document.querySelectorAll('.beat-dot').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.chord-card').forEach(d => d.classList.remove('active-chord'));
  } else {
    bt.start();
    btn.textContent = 'Stop';
    btn.classList.add('playing');
  }
});

// Init
buildBeatDots();
updateChordDisplay();
