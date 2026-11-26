/**
 * House floor plan as a tile grid, traced from Ben's sketch (docs/map-sketch.jpg).
 * One tile is roughly 16 sketch pixels. Plain TS (no DOM) so scripts/check-map.ts can test it.
 *
 * House coordinates (hx, hy) below follow the sketch; the grid adds a strip of street on the left
 * (the boulevard behind the street door) and a margin row at the bottom.
 */
import type { RoomId, SpotId } from '../shared/types';

export const TILE = 16;
const OX = 4; // street strip left of the yard
export const COLS = 52 + OX;
export const ROWS = 36;

export type Floor = 'grass' | 'walk' | 'rail' | 'dirt' | 'wood' | 'carpet' | 'ktile' | 'btile';
export type Kind = Floor | 'wall' | 'door' | 'window' | 'windowAC' | 'streetdoor';

export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }

/** Furniture and props, drawn by art.ts. `solid` blocks walking on every tile of the box. */
export type PropKind =
  | 'tree' | 'spool' | 'pallets' | 'gardenbed' | 'pool' | 'herbs' | 'can' | 'reel'
  | 'shelf' | 'sofaV' | 'sofaH' | 'coffee' | 'rug' | 'roomba' | 'plant' | 'lamp'
  | 'bed' | 'nightstand' | 'wardrobe' | 'bedrug'
  | 'fridge' | 'counterTop' | 'stove' | 'sink' | 'counterLow' | 'urn' | 'plata'
  | 'shower' | 'toilet' | 'basin' | 'puddle' | 'mat' | 'streettree';
export interface Prop extends Box { kind: PropKind; solid: boolean }

const R = (hx: number, hy: number, w: number, h: number): Box => ({ x: hx + OX, y: hy, w, h });
const P = (hx: number, hy: number): Pt => ({ x: hx + OX, y: hy });

/** Room interiors (floor boxes); a room may have several. */
export const ROOM_BOXES: Record<RoomId, Box[]> = {
  yard: [R(1, 8, 9, 26), R(10, 32, 12, 2)],
  'living-room': [R(11, 8, 11, 11)],
  bedroom: [R(11, 20, 11, 11)],
  kitchen: [R(20, 2, 19, 5)],
  bathroom: [R(40, 1, 11, 6)],
};
const ROOM_FLOOR: Record<RoomId, Floor> = {
  yard: 'dirt', 'living-room': 'wood', bedroom: 'carpet', kitchen: 'ktile', bathroom: 'btile',
};
/** Outer wall boxes (walls are the outline of each box). */
const WALL_BOXES: Box[] = [
  R(0, 7, 11, 28), R(10, 31, 13, 4), // yard (an L)
  R(10, 7, 13, 13), R(10, 19, 13, 13), // living room, bedroom
  R(19, 1, 21, 7), R(39, 0, 13, 8), // kitchen, bathroom
];

/** Openings in the walls (house coords via P). Interior doors are walkable. */
export const DOORS: Pt[] = [
  P(10, 12), P(10, 13), // front door: living room <-> yard
  P(12, 19), // living room <-> bedroom
  P(21, 7), // living room <-> kitchen
  P(39, 4), // kitchen <-> bathroom
];
export const STREET_DOOR: Pt[] = [P(0, 11), P(0, 12)];
export const WINDOWS: { at: Pt; ac?: boolean }[] = [
  { at: P(10, 8) }, { at: P(10, 9) }, // living room window
  { at: P(10, 16), ac: true }, { at: P(10, 17) }, // window with the AC unit
  { at: P(22, 25) }, { at: P(22, 26) }, // bedroom
  { at: P(28, 1) }, { at: P(29, 1) }, // kitchen, over the sink
  { at: P(45, 0) }, // bathroom
];

export const PROPS: Prop[] = [
  // street
  ...[2, 9, 16, 23, 30].map((y) => ({ kind: 'streettree' as const, x: 3, y, w: 1, h: 1, solid: false })),
  // yard
  { kind: 'tree', ...R(1, 8, 2, 2), solid: true },
  { kind: 'pallets', ...R(5, 8, 3, 1), solid: true },
  { kind: 'herbs', ...R(9, 10, 1, 1), solid: true },
  { kind: 'herbs', ...R(9, 15, 1, 1), solid: true },
  { kind: 'spool', ...R(5, 16, 2, 2), solid: true },
  { kind: 'reel', ...R(9, 20, 1, 1), solid: true },
  { kind: 'gardenbed', ...R(1, 19, 1, 9), solid: true },
  { kind: 'can', ...R(3, 26, 1, 1), solid: true },
  { kind: 'pool', ...R(1, 29, 5, 4), solid: true },
  // living room
  { kind: 'rug', ...R(15, 10, 5, 5), solid: false },
  { kind: 'shelf', ...R(13, 8, 2, 1), solid: true },
  { kind: 'lamp', ...R(17, 8, 1, 1), solid: false },
  { kind: 'sofaV', ...R(21, 10, 1, 5), solid: true },
  { kind: 'sofaH', ...R(17, 14, 4, 1), solid: true },
  { kind: 'coffee', ...R(17, 11, 2, 2), solid: true },
  { kind: 'plant', ...R(11, 18, 1, 1), solid: true },
  { kind: 'roomba', ...R(19, 17, 1, 1), solid: true },
  // bedroom
  { kind: 'bedrug', ...R(14, 24, 4, 3), solid: false },
  { kind: 'bed', ...R(15, 20, 2, 3), solid: true },
  { kind: 'nightstand', ...R(14, 20, 1, 1), solid: true },
  { kind: 'nightstand', ...R(17, 20, 1, 1), solid: true },
  { kind: 'wardrobe', ...R(20, 20, 2, 2), solid: true },
  { kind: 'plant', ...R(21, 30, 1, 1), solid: true },
  // kitchen
  { kind: 'fridge', ...R(20, 2, 1, 2), solid: true },
  { kind: 'counterTop', ...R(22, 2, 9, 1), solid: true },
  { kind: 'stove', ...R(25, 2, 2, 1), solid: true },
  { kind: 'sink', ...R(28, 2, 2, 1), solid: true },
  { kind: 'counterLow', ...R(31, 6, 6, 1), solid: true },
  { kind: 'urn', ...R(32, 6, 1, 1), solid: true },
  { kind: 'plata', ...R(34, 6, 2, 1), solid: true },
  // bathroom
  { kind: 'mat', ...R(40, 4, 2, 2), solid: false },
  { kind: 'toilet', ...R(41, 1, 1, 1), solid: true },
  { kind: 'basin', ...R(43, 1, 2, 1), solid: true },
  { kind: 'shower', ...R(48, 1, 3, 3), solid: true },
  { kind: 'puddle', ...R(45, 4, 2, 2), solid: false },
];

/**
 * Game spots. `trigger` is the floor tile that opens the dialog; walking into (or tapping) any of
 * the `objects` tiles also opens it (tapping walks there first). `face` is the way Bentzi looks.
 */
export interface Spot { trigger: Pt; objects: Pt[]; face: Dir; label: string }
export type Dir = 'up' | 'down' | 'left' | 'right';

const tiles = (b: Box): Pt[] => {
  const out: Pt[] = [];
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) out.push({ x, y });
  return out;
};

export const SPOTS: Record<SpotId, Spot> = {
  'street-door': { trigger: P(1, 11), objects: STREET_DOOR, face: 'left', label: 'Street door' },
  'bunny-wall': { trigger: P(2, 23), objects: tiles(R(1, 19, 1, 9)), face: 'left', label: 'Bunny wall' },
  'fps-wall': { trigger: P(14, 33), objects: tiles(R(11, 34, 9, 1)), face: 'down', label: 'Back wall' },
  bed: { trigger: P(16, 23), objects: tiles(R(15, 20, 2, 3)), face: 'up', label: 'Bed' },
  'bedroom-wardrobe': { trigger: P(20, 22), objects: tiles(R(20, 20, 2, 2)), face: 'up', label: 'Wardrobe' },
  'living-floor': { trigger: P(18, 17), objects: [P(19, 17)], face: 'right', label: 'Roomba' },
  'living-windows': { trigger: P(11, 9), objects: [P(10, 8), P(10, 9), P(10, 16), P(10, 17)], face: 'left', label: 'Windows' },
  'kitchen-cabinets': { trigger: P(26, 3), objects: tiles(R(22, 2, 9, 1)), face: 'up', label: 'Cabinets' },
  'kitchen-counter': { trigger: P(34, 5), objects: tiles(R(31, 6, 6, 1)), face: 'down', label: 'Counter' },
  'bathroom-floor': { trigger: P(45, 4), objects: [P(46, 4), P(45, 5), P(46, 5)], face: 'down', label: 'Floor' },
  'turtle-pool': { trigger: P(6, 30), objects: tiles(R(1, 29, 5, 4)), face: 'left', label: 'Turtle pool' },
};

export const START: Pt & { dir: Dir } = { ...P(14, 14), dir: 'down' };

// ---------------------------------------------------------------- grid

export const GRID: Kind[][] = [];
export const ROOM_AT: (RoomId | null)[][] = [];
const SOLID: boolean[][] = [];

(function build() {
  for (let y = 0; y < ROWS; y++) {
    GRID.push(new Array<Kind>(COLS).fill('grass'));
    ROOM_AT.push(new Array<RoomId | null>(COLS).fill(null));
  }
  // the boulevard behind the street door: sidewalk, tram rails, sidewalk
  for (let y = 0; y < ROWS; y++) {
    GRID[y][0] = 'walk';
    GRID[y][1] = 'rail';
    GRID[y][2] = 'rail';
    GRID[y][3] = 'walk';
  }
  for (const b of WALL_BOXES)
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++)
        if (y === b.y || y === b.y + b.h - 1 || x === b.x || x === b.x + b.w - 1) GRID[y][x] = 'wall';
  for (const id of Object.keys(ROOM_BOXES) as RoomId[])
    for (const b of ROOM_BOXES[id])
      for (const t of tiles(b)) {
        GRID[t.y][t.x] = ROOM_FLOOR[id];
        ROOM_AT[t.y][t.x] = id;
      }
  for (const d of DOORS) GRID[d.y][d.x] = 'door';
  for (const d of STREET_DOOR) GRID[d.y][d.x] = 'streetdoor';
  for (const w of WINDOWS) GRID[w.at.y][w.at.x] = w.ac ? 'windowAC' : 'window';
  // doors belong to the room below / to the right of them for the room banner
  for (const d of DOORS) ROOM_AT[d.y][d.x] = ROOM_AT[d.y + 1]?.[d.x] ?? ROOM_AT[d.y][d.x + 1] ?? null;

  for (let y = 0; y < ROWS; y++) {
    SOLID.push([]);
    for (let x = 0; x < COLS; x++) {
      const k = GRID[y][x];
      // only the house and yard are walkable; the street outside is scenery
      SOLID[y][x] = !(ROOM_AT[y][x] && (k === 'door' || ROOM_FLOOR[ROOM_AT[y][x]!] === k));
    }
  }
  for (const p of PROPS) if (p.solid) for (const t of tiles(p)) SOLID[t.y][t.x] = true;
})();

export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
export const walkable = (x: number, y: number) => inBounds(x, y) && !SOLID[y][x];
export const isWall = (x: number, y: number) => {
  if (!inBounds(x, y)) return false;
  const k = GRID[y][x];
  return k === 'wall' || k === 'window' || k === 'windowAC' || k === 'streetdoor';
};

/** The spot whose trigger is this tile, or whose object occupies it. */
export function spotAt(x: number, y: number, which: 'trigger' | 'object'): SpotId | null {
  for (const id of Object.keys(SPOTS) as SpotId[]) {
    const s = SPOTS[id];
    if (which === 'trigger' ? s.trigger.x === x && s.trigger.y === y : s.objects.some((o) => o.x === x && o.y === y)) return id;
  }
  return null;
}

export const DIRS: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/** Breadth-first path from `from` to `to` (both walkable). Returns the steps after `from`, or null. */
export function findPath(from: Pt, to: Pt): Pt[] | null {
  if (!walkable(to.x, to.y)) return null;
  if (from.x === to.x && from.y === to.y) return [];
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  const start = from.y * COLS + from.x;
  prev[start] = start;
  const queue = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const cx = cur % COLS, cy = (cur / COLS) | 0;
    if (cx === to.x && cy === to.y) {
      const path: Pt[] = [];
      for (let c = cur; c !== start; c = prev[c]) path.push({ x: c % COLS, y: (c / COLS) | 0 });
      return path.reverse();
    }
    for (const d of Object.values(DIRS)) {
      const nx = cx + d.x, ny = cy + d.y;
      if (!walkable(nx, ny)) continue;
      const n = ny * COLS + nx;
      if (prev[n] !== -1) continue;
      prev[n] = cur;
      queue.push(n);
    }
  }
  return null;
}

/** Where a tap on tile (x, y) should walk to: the tile itself, a spot's trigger, or the nearest reachable neighbour. */
export function tapTarget(from: Pt, x: number, y: number): Pt | null {
  if (!inBounds(x, y)) return null;
  const spot = spotAt(x, y, 'object');
  if (spot) return SPOTS[spot].trigger;
  if (walkable(x, y)) return { x, y };
  let best: Pt | null = null, bestLen = Infinity;
  for (const d of Object.values(DIRS)) {
    const n = { x: x + d.x, y: y + d.y };
    const p = walkable(n.x, n.y) ? findPath(from, n) : null;
    if (p && p.length < bestLen) { best = n; bestLen = p.length; }
  }
  return best;
}
