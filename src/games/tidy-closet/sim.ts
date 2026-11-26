/**
 * Tidy the Closet: game rules (plain TS, no DOM) so scripts/check-tidy-closet.ts can test them.
 *
 * Sim units: one clothing item is 1 unit wide. The wardrobe interior is COLS units wide (x 0..COLS) and
 * y grows downward from the rod. Items sit in a hex grid hanging from the rod: odd rows are shifted half
 * an item to the right and hold one item fewer. When the rod drops, the whole pile moves down one row.
 */

export const COLS = 8;
export const RH = Math.sqrt(3) / 2; // row height
/** A pile reaching this many rows below the rod's starting line means the door won't close: lost. */
export const DANGER_ROWS = 12;
export const DANGER_Y = DANGER_ROWS * RH;
/** Where items are thrown from (the laundry basket), in sim units. */
export const LAUNCH = { x: COLS / 2, y: 13.4 };
/** Projectile centre to item centre distance that counts as a hit (a little under 1 to be forgiving). */
const R_HIT = 0.8;
/** The thong knocks down every item within this distance of where it lands. */
const THONG_REACH = 2.05;
const GRID_ROWS = 22;
/** Removing this many items with one throw earns a thong. */
export const THONG_COMBO = 6;

export const EMPTY = -1;
/** Item types 0..4; the bonus thong is a separate value that never sits in the grid. */
export const THONG = 9;
export const ITEM_NAMES = ['shirt', 'jeans', 'sock', 'towel', 'boxers'] as const;

export interface LevelDef {
  /** Number of clothing types in play (3..5). */
  types: number;
  /** Starting rows of clothes hanging from the rod. */
  rows: number;
  /** The rod drops one row after this many throws. */
  dropEvery: number;
  /** Length of the aiming guide, in units (99 = the whole path). */
  guide: number;
  /** Chance an item copies a neighbour's type when the pile is made (bigger = bigger same-type clumps = easier). */
  clump: number;
  name: string;
}

const LEVELS: LevelDef[] = [
  { types: 3, rows: 4, dropEvery: 8, guide: 99, clump: 0.3, name: 'Sunday morning' },
  { types: 3, rows: 5, dropEvery: 8, guide: 99, clump: 0.25, name: 'After the gym' },
  { types: 3, rows: 6, dropEvery: 8, guide: 99, clump: 0.2, name: 'Laundry day' },
  { types: 4, rows: 5, dropEvery: 7, guide: 16, clump: 0.3, name: 'Towel avalanche' },
  { types: 4, rows: 6, dropEvery: 7, guide: 16, clump: 0.25, name: 'Sock mountain' },
  { types: 4, rows: 7, dropEvery: 7, guide: 16, clump: 0.2, name: 'Guests are coming' },
];

/** Level i (zero-based). Past the table the pile keeps growing and the rod drops sooner. */
export function levelDef(i: number): LevelDef {
  if (i < LEVELS.length) return LEVELS[i];
  const k = i - LEVELS.length;
  return {
    types: 5,
    rows: Math.min(8, 6 + Math.floor(k / 2)),
    dropEvery: Math.max(4, 6 - Math.floor(k / 3)),
    guide: 10,
    clump: 0.2,
    name: `Closet chaos #${k + 1}`,
  };
}

export interface Cell { r: number; c: number }
export interface Pt { x: number; y: number }

export const rowLen = (r: number) => (r % 2 ? COLS - 1 : COLS);
export const cellX = (r: number, c: number) => c + 0.5 + (r % 2 ? 0.5 : 0);
export const cellY = (r: number, drop: number) => (drop + r) * RH + 0.5;

export function neighbors(r: number, c: number): Cell[] {
  const out: Cell[] = [];
  const add = (rr: number, cc: number) => {
    if (rr >= 0 && rr < GRID_ROWS && cc >= 0 && cc < rowLen(rr)) out.push({ r: rr, c: cc });
  };
  add(r, c - 1);
  add(r, c + 1);
  const d = r % 2 ? 0 : -1; // even rows reach left (c-1, c), odd rows reach right (c, c+1)
  add(r - 1, c + d);
  add(r - 1, c + d + 1);
  add(r + 1, c + d);
  add(r + 1, c + d + 1);
  return out;
}

export type Grid = number[][];

export const emptyGrid = (): Grid => Array.from({ length: GRID_ROWS }, () => new Array<number>(COLS).fill(EMPTY));
export const copyGrid = (g: Grid): Grid => g.map((row) => row.slice());

export function forEachItem(g: Grid, f: (r: number, c: number, t: number) => void): void {
  for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < rowLen(r); c++) if (g[r][c] !== EMPTY) f(r, c, g[r][c]);
}
export function countItems(g: Grid): number {
  let n = 0;
  forEachItem(g, () => n++);
  return n;
}
export function lowestRow(g: Grid): number {
  let low = -1;
  forEachItem(g, (r) => (low = Math.max(low, r)));
  return low;
}

// ------------------------------------------------------------------ randomness

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A full block of `rows` rows. Items copy a neighbour's type some of the time (`clump`), so the pile has clumps to aim at. */
export function generatePile(def: LevelDef, rng: () => number): Grid {
  const g = emptyGrid();
  for (let r = 0; r < def.rows; r++)
    for (let c = 0; c < rowLen(r); c++) {
      const placed = neighbors(r, c).filter((n) => g[n.r][n.c] !== EMPTY);
      if (placed.length && rng() < def.clump) {
        const p = placed[Math.floor(rng() * placed.length)];
        g[r][c] = g[p.r][p.c];
      } else g[r][c] = Math.floor(rng() * def.types);
    }
  // every type must be on the board at the start
  for (let t = 0; t < def.types; t++) {
    let found = false;
    forEachItem(g, (_r, _c, v) => (found ||= v === t));
    if (!found) g[def.rows - 1][Math.floor(rng() * rowLen(def.rows - 1))] = t;
  }
  return g;
}

// ------------------------------------------------------------------ throwing

export interface Trace {
  /** Start, every wall bounce, and the landing point. */
  points: Pt[];
  hit: Pt;
  /** The empty cell the item snaps into (null only if it somehow finds none). */
  cell: Cell | null;
}

/** Clamp an aim angle (radians, 0 = right, PI/2 = straight up) to a sensible upward range. */
export const MIN_ANGLE = (8 * Math.PI) / 180;
export const clampAngle = (a: number) => Math.min(Math.PI - MIN_ANGLE, Math.max(MIN_ANGLE, a));

/** Fly an item from the basket at `angle` until it hits the rod or another item. */
export function trace(g: Grid, drop: number, angle: number): Trace {
  angle = clampAngle(angle);
  let dx = Math.cos(angle);
  const dy = -Math.sin(angle);
  let x = LAUNCH.x;
  let y = LAUNCH.y;
  const points: Pt[] = [{ x, y }];
  const step = 0.06;
  const top = drop * RH + 0.5;
  // below the pile nothing can be hit, so only test items once the throw is near it
  const low = lowestRow(g);
  const nearY = low < 0 ? -Infinity : cellY(low, drop) + 1;
  for (let i = 0; i < 4000; i++) {
    x += dx * step;
    y += dy * step;
    if (x < 0.5) {
      x = 1 - x;
      dx = -dx;
      points.push({ x: 0.5, y });
    } else if (x > COLS - 0.5) {
      x = 2 * (COLS - 0.5) - x;
      dx = -dx;
      points.push({ x: COLS - 0.5, y });
    }
    let stop = y <= top;
    if (!stop && y < nearY) {
      const ri = Math.round((y - top) / RH);
      for (let r = Math.max(0, ri - 1); r <= ri + 1 && !stop; r++) {
        if (r >= GRID_ROWS) break;
        for (let c = 0; c < rowLen(r); c++) {
          if (g[r][c] === EMPTY) continue;
          if (Math.hypot(cellX(r, c) - x, cellY(r, drop) - y) < R_HIT) {
            stop = true;
            break;
          }
        }
      }
    }
    if (stop) {
      if (y < top) y = top;
      const hit = { x, y };
      points.push(hit);
      return { points, hit, cell: snapCell(g, drop, hit) };
    }
  }
  const hit = { x, y };
  points.push(hit);
  return { points, hit, cell: snapCell(g, drop, hit) };
}

/** The nearest empty cell to `p` that hangs from the rod (row 0) or touches another item. */
export function snapCell(g: Grid, drop: number, p: Pt): Cell | null {
  const ri = Math.round((p.y - (drop * RH + 0.5)) / RH);
  let best: Cell | null = null;
  let bd = Infinity;
  for (let r = Math.max(0, ri - 2); r <= ri + 2 && r < GRID_ROWS; r++)
    for (let c = 0; c < rowLen(r); c++) {
      if (g[r][c] !== EMPTY) continue;
      if (r > 0 && !neighbors(r, c).some((n) => g[n.r][n.c] !== EMPTY)) continue;
      const d = Math.hypot(cellX(r, c) - p.x, cellY(r, drop) - p.y);
      if (d < bd) {
        bd = d;
        best = { r, c };
      }
    }
  return best;
}

export interface Removed extends Cell { t: number }
export interface Impact {
  placed: Cell | null;
  /** Items folded away by a match (or knocked down by the thong). */
  popped: Removed[];
  /** Items left hanging from nothing, which fall to the floor for Rosie. */
  dropped: Removed[];
}

/** Items no longer connected to the rod (row 0) through other items. */
export function floating(g: Grid): Cell[] {
  const seen = emptyGrid().map((row) => row.map(() => false));
  const stack: Cell[] = [];
  for (let c = 0; c < COLS; c++) if (g[0][c] !== EMPTY) {
    seen[0][c] = true;
    stack.push({ r: 0, c });
  }
  while (stack.length) {
    const p = stack.pop()!;
    for (const n of neighbors(p.r, p.c))
      if (!seen[n.r][n.c] && g[n.r][n.c] !== EMPTY) {
        seen[n.r][n.c] = true;
        stack.push(n);
      }
  }
  const out: Cell[] = [];
  forEachItem(g, (r, c) => !seen[r][c] && out.push({ r, c }));
  return out;
}

function cluster(g: Grid, start: Cell): Cell[] {
  const t = g[start.r][start.c];
  const seen = new Set<number>([start.r * 100 + start.c]);
  const out: Cell[] = [start];
  for (let i = 0; i < out.length; i++)
    for (const n of neighbors(out[i].r, out[i].c)) {
      const k = n.r * 100 + n.c;
      if (!seen.has(k) && g[n.r][n.c] === t) {
        seen.add(k);
        out.push(n);
      }
    }
  return out;
}

/** Apply a landed item of type `t` to the grid (mutates `g`). */
export function resolve(g: Grid, drop: number, tr: Trace, t: number): Impact {
  const popped: Removed[] = [];
  let placed: Cell | null = null;
  if (t === THONG) {
    forEachItem(g, (r, c, v) => {
      if (Math.hypot(cellX(r, c) - tr.hit.x, cellY(r, drop) - tr.hit.y) < THONG_REACH) popped.push({ r, c, t: v });
    });
  } else if (tr.cell) {
    placed = tr.cell;
    g[placed.r][placed.c] = t;
    const cl = cluster(g, placed);
    if (cl.length >= 3) for (const p of cl) popped.push({ ...p, t });
  }
  for (const p of popped) g[p.r][p.c] = EMPTY;
  const dropped = floating(g).map((p) => ({ ...p, t: g[p.r][p.c] }));
  for (const p of dropped) g[p.r][p.c] = EMPTY;
  return { placed, popped, dropped };
}

// ------------------------------------------------------------------ a level being played

export interface State {
  levelIndex: number;
  def: LevelDef;
  grid: Grid;
  drop: number;
  throws: number;
  throwsSinceDrop: number;
  current: number;
  next: number;
  score: number;
  /** Score when the level started (a retry goes back to it). */
  startScore: number;
  initialCount: number;
  status: 'play' | 'won' | 'lost';
  rng: () => number;
}

export function typesOnBoard(g: Grid): number[] {
  const s = new Set<number>();
  forEachItem(g, (_r, _c, t) => s.add(t));
  return [...s].sort();
}

function deal(st: State): number {
  const on = typesOnBoard(st.grid);
  const pool = on.length ? on : Array.from({ length: st.def.types }, (_, i) => i);
  return pool[Math.floor(st.rng() * pool.length)];
}

export function newLevel(levelIndex: number, seed: number, score = 0): State {
  const def = levelDef(levelIndex);
  const rng = mulberry32(seed);
  const grid = generatePile(def, rng);
  const st: State = {
    levelIndex,
    def,
    grid,
    drop: 0,
    throws: 0,
    throwsSinceDrop: 0,
    current: 0,
    next: 0,
    score,
    startScore: score,
    initialCount: countItems(grid),
    status: 'play',
    rng,
  };
  st.current = deal(st);
  st.next = deal(st);
  return st;
}

/** Throws for 3 stars; 1.5x that for 2 stars. */
export const par = (st: Pick<State, 'initialCount' | 'def'>) => Math.ceil(st.initialCount / 2.6) + Math.max(0, st.def.types - 3) * 2;
export function stars(st: State): number {
  const p = par(st);
  return st.throws <= p ? 3 : st.throws <= Math.ceil(p * 1.5) ? 2 : 1;
}

export const POINTS = { pop: 10, drop: 20, thong: 15, combo: 50, star: 250 };

export interface ShotResult extends Impact {
  trace: Trace;
  type: number;
  points: number;
  earnedThong: boolean;
  rodDropped: boolean;
  clearBonus: number;
}

export function swap(st: State): void {
  if (st.status !== 'play') return;
  [st.current, st.next] = [st.next, st.current];
}

/** Throw the current item at `angle`. Mutates the state and returns what happened, for the renderer. */
export function shoot(st: State, angle: number): ShotResult {
  const type = st.current;
  const tr = trace(st.grid, st.drop, angle);
  const imp = resolve(st.grid, st.drop, tr, type);
  const removed = imp.popped.length + imp.dropped.length;
  let points = imp.dropped.length * POINTS.drop + imp.popped.length * (type === THONG ? POINTS.thong : POINTS.pop);
  if (removed >= THONG_COMBO) points += POINTS.combo;
  st.throws++;
  st.throwsSinceDrop++;

  const earnedThong = type !== THONG && removed >= THONG_COMBO && st.next !== THONG;
  st.current = st.next;
  st.next = earnedThong ? THONG : deal(st);
  // never hand out a type that is no longer in the closet
  const on = typesOnBoard(st.grid);
  if (on.length) {
    if (st.current !== THONG && !on.includes(st.current)) st.current = deal(st);
    if (st.next !== THONG && !on.includes(st.next)) st.next = deal(st);
  }

  let rodDropped = false;
  let clearBonus = 0;
  if (countItems(st.grid) === 0) {
    st.status = 'won';
    clearBonus = stars(st) * POINTS.star;
  } else {
    if (st.throwsSinceDrop >= st.def.dropEvery) {
      st.drop++;
      st.throwsSinceDrop = 0;
      rodDropped = true;
    }
    if (st.drop + lowestRow(st.grid) >= DANGER_ROWS) st.status = 'lost';
  }
  st.score += points + clearBonus;
  return { ...imp, trace: tr, type, points, earnedThong, rodDropped, clearBonus };
}
