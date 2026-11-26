// Tidy the Closet: grid geometry sanity, and bots play generated levels to show they are winnable.
// The "sharp" bot aims perfectly and may swap; the "sloppy" bot misses by up to 4 degrees and never swaps,
// roughly a person on a phone. Win-rate floors are checked against the sloppy bot.
import {
  COLS, THONG, MIN_ANGLE, EMPTY, cellX, cellY, rowLen, neighbors, newLevel, shoot, swap, trace, resolve, copyGrid,
  lowestRow, countItems, par, mulberry32, type State,
} from '../src/games/tidy-closet/sim';

let fail = 0;
const bad = (m: string) => { console.error('FAIL ' + m); fail++; };

// neighbours are symmetric and exactly one item apart
for (let r = 0; r < 14; r++)
  for (let c = 0; c < rowLen(r); c++)
    for (const n of neighbors(r, c)) {
      const d = Math.hypot(cellX(r, c) - cellX(n.r, n.c), cellY(r, 0) - cellY(n.r, 0));
      if (Math.abs(d - 1) > 1e-9) bad(`neighbour ${r},${c} -> ${n.r},${n.c} is ${d.toFixed(3)} away`);
      if (!neighbors(n.r, n.c).some((m) => m.r === r && m.c === c)) bad(`neighbour ${r},${c} -> ${n.r},${n.c} not symmetric`);
    }
for (let r = 0; r < 14; r++) if (cellX(r, rowLen(r) - 1) > COLS - 0.5 + 1e-9) bad(`row ${r} overflows the closet`);

const ANGLES: number[] = [];
for (let a = MIN_ANGLE; a <= Math.PI - MIN_ANGLE + 1e-9; a += Math.PI / 80) ANGLES.push(a);

function evaluate(st: State, type: number, angle: number): number {
  const g = copyGrid(st.grid);
  const tr = trace(g, st.drop, angle);
  if (!tr.cell && type !== THONG) return -1e9;
  const imp = resolve(g, st.drop, tr, type);
  const removed = imp.popped.length + imp.dropped.length;
  if (countItems(g) === 0) return 1e6;
  let s = removed * 12 + imp.dropped.length * 6;
  if (imp.placed && !imp.popped.length)
    s += neighbors(imp.placed.r, imp.placed.c).filter((n) => g[n.r][n.c] === type).length * 4 - imp.placed.r * 0.6;
  s -= Math.max(0, lowestRow(g) + st.drop - 8) * 8;
  return s;
}

function botMove(st: State, noise: number, rnd: () => number): void {
  let best = -Infinity, bestAngle = Math.PI / 2, bestSwap = false;
  for (const sw of noise ? [false] : [false, true]) {
    const type = sw ? st.next : st.current;
    for (const a of ANGLES) {
      const v = evaluate(st, type, a);
      if (v > best) { best = v; bestAngle = a; bestSwap = sw; }
    }
  }
  if (bestSwap) swap(st);
  shoot(st, bestAngle + (rnd() + rnd() - 1) * noise);
}

const SEEDS = 10;
const minWin = (lv: number) => (lv < 3 ? 0.85 : lv < 6 ? 0.6 : 0.3);
const NOISE = (4 * Math.PI) / 180;
const t0 = Date.now();
for (let lv = 0; lv < 8; lv++) {
  const parts: string[] = [];
  let items = 0, p = 0;
  for (const noise of [0, NOISE]) {
    let wins = 0, throws = 0, thongs = 0, threeStars = 0;
    items = 0;
    p = 0;
    const rnd = mulberry32(lv + 77);
    for (let s = 1; s <= (noise ? SEEDS : 5); s++) {
      const st = newLevel(lv, lv * 1000 + s);
      items += st.initialCount;
      p += par(st);
      let n = 0;
      while (st.status === 'play' && n++ < 400) {
        if (st.current === THONG) thongs++;
        const before = countItems(st.grid);
        botMove(st, noise, rnd);
        if (countItems(st.grid) > before + 1) bad(`level ${lv + 1} seed ${s}: a throw added more than one item`);
      }
      if (st.status === 'play') bad(`level ${lv + 1} seed ${s}: never ended`);
      for (const row of st.grid) for (const v of row) if (v !== EMPTY && (v < 0 || v > 4)) bad(`bad item ${v} in grid`);
      if (st.status === 'won') {
        wins++;
        throws += st.throws;
        if (st.throws <= par(st)) threeStars++;
      }
    }
    const rate = wins / (noise ? SEEDS : 5);
    parts.push(
      `${noise ? 'sloppy' : 'sharp'} wins ${(rate * 100).toFixed(0).padStart(3)}% throws ${(throws / Math.max(1, wins)).toFixed(1).padStart(4)}` +
        ` 3star ${String(threeStars).padStart(2)} thongs ${String(thongs).padStart(2)}`,
    );
    if (noise && rate < minWin(lv)) bad(`level ${lv + 1}: sloppy bot win rate ${(rate * 100).toFixed(0)}% < ${minWin(lv) * 100}%`);
  }
  console.log(`level ${String(lv + 1).padStart(2)} items ${(items / SEEDS).toFixed(0)} par ${(p / SEEDS).toFixed(0).padStart(2)} | ${parts.join(' | ')}`);
}
console.log(`ms ${Date.now() - t0}`);
if (fail) { console.error(`${fail} tidy-closet check(s) failed`); process.exit(1); }
console.log('tidy-closet OK');
