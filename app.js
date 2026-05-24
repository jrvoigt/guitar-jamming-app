// ── Chord data ────────────────────────────────────────────────────────────────
// frets: [low E, A, D, G, B, high e]  -1=muted  0=open  n=fret number

const CHORDS = [
  { name: 'E',  type: 'major', frets: [0, 2, 2, 1, 0, 0] },
  { name: 'Em', type: 'minor', frets: [0, 2, 2, 0, 0, 0] },
  { name: 'A',  type: 'major', frets: [-1, 0, 2, 2, 2, 0] },
  { name: 'Am', type: 'minor', frets: [-1, 0, 2, 2, 1, 0] },
  { name: 'D',  type: 'major', frets: [-1, -1, 0, 2, 3, 2] },
  { name: 'Dm', type: 'minor', frets: [-1, -1, 0, 2, 3, 1] },
  { name: 'G',  type: 'major', frets: [3, 2, 0, 0, 0, 3] },
  { name: 'C',  type: 'major', frets: [-1, 3, 2, 0, 1, 0] },
  { name: 'F',  type: 'major', frets: [1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  { name: 'Bm', type: 'minor', frets: [-1, 2, 4, 4, 3, 2], startFret: 2, barre: { fret: 2, from: 1, to: 5 } },
];

// ── SVG chord diagram ─────────────────────────────────────────────────────────

function chordSVG({ frets, startFret = 1, barre }) {
  const W = 86, H = 100;
  const pl = 14, pr = 8, pt = 24, pb = 8;
  const bx = pl, by = pt;
  const bw = W - pl - pr;
  const bh = H - pt - pb;
  const ss = bw / 5;   // string spacing
  const fs = bh / 4;   // fret spacing (4 frets shown)

  let d = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">`;

  // Nut or fret-position label
  if (startFret === 1) {
    d += `<rect x="${bx}" y="${by}" width="${bw}" height="3" fill="#ccc" rx="1.5"/>`;
  } else {
    d += `<text x="${bx - 3}" y="${by + fs * 0.65}" text-anchor="end" fill="#777"
           font-size="9" font-family="sans-serif">${startFret}fr</text>`;
  }

  // Fret lines
  for (let f = 0; f <= 4; f++) {
    const y = by + f * fs;
    d += `<line x1="${bx}" y1="${y}" x2="${bx + bw}" y2="${y}" stroke="#3a3a5c" stroke-width="1"/>`;
  }

  // String lines
  for (let s = 0; s < 6; s++) {
    const x = bx + s * ss;
    d += `<line x1="${x}" y1="${by}" x2="${x}" y2="${by + bh}" stroke="#4a4a6a" stroke-width="1"/>`;
  }

  // Barre bar
  if (barre) {
    const barY = by + (barre.fret - startFret + 0.5) * fs;
    const x1 = bx + barre.from * ss;
    const x2 = bx + barre.to * ss;
    d += `<rect x="${x1 - 5}" y="${barY - 5}" width="${x2 - x1 + 10}" height="10" rx="5" fill="#e85d04"/>`;
  }

  // Per-string indicators
  frets.forEach((fret, i) => {
    const x = bx + i * ss;
    if (fret === -1) {
      const y = by - 10;
      d += `<line x1="${x-4}" y1="${y-4}" x2="${x+4}" y2="${y+4}" stroke="#666" stroke-width="1.5" stroke-linecap="round"/>`;
      d += `<line x1="${x+4}" y1="${y-4}" x2="${x-4}" y2="${y+4}" stroke="#666" stroke-width="1.5" stroke-linecap="round"/>`;
    } else if (fret === 0) {
      d += `<circle cx="${x}" cy="${by - 10}" r="4" fill="none" stroke="#bbb" stroke-width="1.5"/>`;
    } else {
      if (barre && fret === barre.fret && i >= barre.from && i <= barre.to) return;
      const dotY = by + (fret - startFret + 0.5) * fs;
      d += `<circle cx="${x}" cy="${dotY}" r="5" fill="#e85d04"/>`;
    }
  });

  d += '</svg>';
  return d;
}

// ── Chord grid ────────────────────────────────────────────────────────────────

function renderChords(filter = 'all') {
  const list = filter === 'all' ? CHORDS : CHORDS.filter(c => c.type === filter);
  document.getElementById('chord-grid').innerHTML = list.map(chord => `
    <div class="chord-card">
      <div class="chord-name">${chord.name}</div>
      ${chordSVG(chord)}
      <div class="chord-type">${chord.type}</div>
    </div>
  `).join('');
}

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderChords(btn.dataset.filter);
  });
});

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// ── Metronome ─────────────────────────────────────────────────────────────────

class Metronome {
  constructor() {
    this.ctx = null;
    this.bpm = 120;
    this.beatsPerMeasure = 4;
    this.isRunning = false;
    this.currentBeat = 0;
    this.nextBeatTime = 0;
    this.timerID = null;
    this.onBeat = null;
  }

  _ctx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  }

  _click(beat, time) {
    const ctx = this._ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const accent = beat === 0;
    osc.frequency.value = accent ? 1000 : 800;
    gain.gain.setValueAtTime(accent ? 0.9 : 0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.06);
    const delay = (time - ctx.currentTime) * 1000;
    setTimeout(() => this.onBeat && this.onBeat(beat), Math.max(0, delay));
  }

  _schedule() {
    const ctx = this._ctx();
    while (this.nextBeatTime < ctx.currentTime + 0.12) {
      this._click(this.currentBeat % this.beatsPerMeasure, this.nextBeatTime);
      this.nextBeatTime += 60 / this.bpm;
      this.currentBeat++;
    }
    this.timerID = setTimeout(() => this._schedule(), 30);
  }

  start() {
    const ctx = this._ctx();
    if (ctx.state === 'suspended') ctx.resume();
    this.isRunning = true;
    this.currentBeat = 0;
    this.nextBeatTime = ctx.currentTime + 0.05;
    this._schedule();
  }

  stop() {
    this.isRunning = false;
    clearTimeout(this.timerID);
  }

  toggle() {
    this.isRunning ? this.stop() : this.start();
    return this.isRunning;
  }
}

// ── Beat dots ─────────────────────────────────────────────────────────────────

function buildBeatRow(n) {
  document.getElementById('beat-row').innerHTML = Array.from({ length: n }, (_, i) =>
    `<div class="beat-dot${i === 0 ? ' accent' : ''}" data-beat="${i}"></div>`
  ).join('');
}

function flashBeat(beat) {
  document.querySelectorAll('.beat-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === beat);
  });
}

// ── Metronome UI ──────────────────────────────────────────────────────────────

const metro = new Metronome();
metro.onBeat = flashBeat;

const bpmSlider = document.getElementById('bpm-slider');
const bpmNumber = document.getElementById('bpm-number');
const startBtn  = document.getElementById('start-btn');
const tapBtn    = document.getElementById('tap-btn');

bpmSlider.addEventListener('input', () => {
  metro.bpm = +bpmSlider.value;
  bpmNumber.textContent = bpmSlider.value;
});

startBtn.addEventListener('click', () => {
  const running = metro.toggle();
  startBtn.textContent = running ? 'Stop' : 'Start';
  startBtn.classList.toggle('running', running);
  if (!running) flashBeat(-1);
});

let tapTimes = [];
tapBtn.addEventListener('click', () => {
  const now = Date.now();
  tapTimes.push(now);
  if (tapTimes.length > 8) tapTimes.shift();
  if (tapTimes.length >= 2) {
    const intervals = tapTimes.slice(1).map((t, i) => t - tapTimes[i]);
    const avg = intervals.reduce((a, b) => a + b) / intervals.length;
    const bpm = Math.max(40, Math.min(240, Math.round(60000 / avg)));
    metro.bpm = bpm;
    bpmSlider.value = bpm;
    bpmNumber.textContent = bpm;
  }
  tapBtn.classList.add('flash');
  setTimeout(() => tapBtn.classList.remove('flash'), 100);
});

document.querySelectorAll('.seg').forEach(seg => {
  seg.addEventListener('click', () => {
    document.querySelectorAll('.seg').forEach(s => s.classList.remove('active'));
    seg.classList.add('active');
    metro.beatsPerMeasure = +seg.dataset.beats;
    buildBeatRow(+seg.dataset.beats);
    if (metro.isRunning) { metro.stop(); metro.start(); }
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────

renderChords();
buildBeatRow(4);
