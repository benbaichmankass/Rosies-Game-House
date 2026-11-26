/** Tidy the Closet engine: canvas loop, animations and input on top of the rules in sim.ts. */
import {
  DANGER_ROWS, DANGER_Y, LAUNCH, RH, THONG, cellX, cellY, clampAngle, copyGrid, forEachItem, lowestRow, newLevel, shoot,
  stars, swap, trace, type Grid, type ShotResult, type State, type Pt,
} from './sim';
import {
  BASKET, FLOOR_Y, IN_X, INK, NEXT, ROD_Y, ROSIE, WORLD_H, WORLD_W, drawBasket, drawHook, drawItem, drawNextSpot,
  drawRoom, drawRosie,
} from './art';
import { Sfx } from './audio';

export interface Hud { score: number; level: number; dropIn: number; dropEvery: number }
export interface Callbacks {
  onHud: (h: Hud) => void;
  onClear: (stars: number, bonus: number) => void;
  onOver: () => void;
}

/** sim -> world coordinates */
const wx = (x: number) => IN_X + x;
const wy = (y: number) => ROD_Y + y;
const LAUNCH_W = { x: wx(LAUNCH.x), y: wy(LAUNCH.y) };
const SPEED = 24; // units per second while flying

type Particle =
  | { kind: 'fold'; x: number; y: number; t: number; age: number; delay: number }
  | { kind: 'fall'; x: number; y: number; vx: number; vy: number; rot: number; vr: number; t: number; age: number; floor: number; fetch: number; fx: number; fy: number; delay: number }
  | { kind: 'text'; x: number; y: number; str: string; color: string; size: number; age: number }
  | { kind: 'spark'; x: number; y: number; vx: number; vy: number; color: string; age: number; life: number };

interface Flight { type: number; points: Pt[]; lens: number[]; total: number; d: number; result: ShotResult }

export class Engine {
  readonly sfx = new Sfx();
  st: State;
  private ctx: CanvasRenderingContext2D;
  private scale = 40;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private shown: Grid;
  private shownDrop = 0;
  private targetDrop = 0;
  private rodDelay = 0;
  private flight: Flight | null = null;
  private parts: Particle[] = [];
  private aim: number | null = null;
  private pointerStart: Pt | null = null;
  private swapCandidate = false;
  private rosieLift = 0;
  private rosieWag = 0;
  private rosieHold: { t: number; until: number } | null = null;
  private lastWoof = 0;
  private shake = 0;
  private score = 0;
  private ending: { kind: 'won' | 'lost'; at: number } | null = null;
  private seed = Date.now() % 100000;
  private lastBonus = 0;

  constructor(private canvas: HTMLCanvasElement, private cb: Callbacks) {
    this.ctx = canvas.getContext('2d')!;
    this.st = newLevel(0, this.seed);
    this.shown = copyGrid(this.st.grid);
  }

  /** Fit the world into a w x h box; returns the board's pixel size. */
  layout(w: number, h: number) {
    this.scale = Math.max(10, Math.min(w / WORLD_W, h / WORLD_H));
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const bw = Math.floor(WORLD_W * this.scale), bh = Math.floor(WORLD_H * this.scale);
    this.canvas.width = Math.floor(bw * this.dpr);
    this.canvas.height = Math.floor(bh * this.dpr);
    this.canvas.style.width = `${bw}px`;
    this.canvas.style.height = `${bh}px`;
    this.render();
    return { w: bw, h: bh, scale: this.scale };
  }

  // ------------------------------------------------------------ game flow

  startLevel(levelIndex: number, score: number) {
    this.seed = (this.seed * 7919 + 13) % 1000003;
    this.st = newLevel(levelIndex, this.seed, score);
    this.score = score;
    this.shown = copyGrid(this.st.grid);
    this.shownDrop = this.targetDrop = 0;
    this.flight = null;
    this.parts = [];
    this.aim = null;
    this.ending = null;
    this.rosieHold = null;
    this.hud();
    this.start();
  }

  private hud() {
    this.cb.onHud({
      score: this.score,
      level: this.st.levelIndex,
      dropIn: this.st.def.dropEvery - this.st.throwsSinceDrop,
      dropEvery: this.st.def.dropEvery,
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  pause() {
    this.stop();
    this.sfx.suspend();
  }
  resume() {
    this.sfx.unlock();
    this.start();
  }

  // ------------------------------------------------------------ input (client pixels)

  private toWorld(cx: number, cy: number): Pt {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * WORLD_W, y: ((cy - r.top) / r.height) * WORLD_H };
  }
  private busy() {
    return !!this.flight || !!this.ending || this.st.status !== 'play';
  }
  private aimAt(p: Pt) {
    if (p.y > LAUNCH_W.y - 0.3) {
      this.aim = null;
      return;
    }
    this.aim = clampAngle(Math.atan2(LAUNCH_W.y - p.y, p.x - LAUNCH_W.x));
  }

  down(cx: number, cy: number) {
    if (this.busy()) return;
    const p = this.toWorld(cx, cy);
    this.pointerStart = p;
    const onNext = Math.hypot(p.x - NEXT.x, p.y - NEXT.y) < 0.95;
    const onBasket = Math.hypot(p.x - BASKET.x, p.y - (BASKET.y - 0.3)) < 1.2;
    this.swapCandidate = onNext || onBasket;
    if (!this.swapCandidate) this.aimAt(p);
  }
  move(cx: number, cy: number) {
    if (this.busy() || !this.pointerStart) return;
    const p = this.toWorld(cx, cy);
    if (this.swapCandidate && Math.hypot(p.x - this.pointerStart.x, p.y - this.pointerStart.y) > 0.6) this.swapCandidate = false;
    if (!this.swapCandidate) this.aimAt(p);
  }
  up() {
    if (!this.pointerStart) return;
    this.pointerStart = null;
    if (this.busy()) return;
    if (this.swapCandidate) {
      this.swapCandidate = false;
      swap(this.st);
      this.sfx.swap();
      return;
    }
    if (this.aim === null) return;
    const angle = this.aim;
    this.aim = null;
    this.fire(angle);
  }
  cancelAim() {
    this.pointerStart = null;
    this.aim = null;
  }

  private fire(angle: number) {
    const result = shoot(this.st, angle);
    const points = result.trace.points.map((q) => ({ x: wx(q.x), y: wy(q.y) }));
    const lens = [0];
    for (let i = 1; i < points.length; i++) lens.push(lens[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    this.flight = { type: result.type, points, lens, total: lens[lens.length - 1], d: 0, result };
    if (result.type === THONG) this.sfx.boing();
    else this.sfx.throw();
  }

  private land(f: Flight) {
    const r = f.result;
    const hit = f.points[f.points.length - 1];
    this.shown = copyGrid(this.st.grid);
    // the shown grid already lacks removed items; show the placed one only if it stayed
    const drop = this.shownDrop;
    const thong = r.type === THONG;
    if (thong) {
      this.text(hit.x, hit.y - 0.4, 'OOH LA LA!', '#ff4f9a', 0.55);
      for (let i = 0; i < 18; i++) this.spark(hit.x, hit.y, ['#ff4f9a', '#ffd34d', '#e9a640'][i % 3], 5);
    }
    if (r.popped.length && !thong) {
      this.sfx.fold(r.popped.length);
      r.popped.forEach((p, i) =>
        this.parts.push({ kind: 'fold', x: wx(cellX(p.r, p.c)), y: wy(cellY(p.r, drop)), t: p.t, age: 0, delay: i * 0.03 }),
      );
      const c = r.popped[0];
      this.text(wx(cellX(c.r, c.c)), wy(cellY(c.r, drop)) - 0.3, `+${r.popped.length * 10}`, '#2b2140', 0.42);
    } else if (!thong) this.sfx.land();
    const fallers = [...r.dropped, ...(thong ? r.popped : [])];
    fallers.forEach((p, i) => {
      const x = wx(cellX(p.r, p.c)), y = wy(cellY(p.r, drop));
      const out = thong ? Math.sign(x - hit.x || 1) * (1.5 + Math.random() * 2.5) : (Math.random() - 0.5) * 1.6;
      this.parts.push({
        kind: 'fall', x, y, vx: out, vy: thong ? -3 - Math.random() * 3 : -1 - Math.random(), rot: 0, vr: (Math.random() - 0.5) * 8,
        t: p.t, age: 0, floor: FLOOR_Y + 2.2 + Math.random() * 1.2, fetch: -1, fx: x, fy: y, delay: i * 0.04,
      });
    });
    if (r.points >= 0) this.score += r.points;
    if (r.popped.length + r.dropped.length >= 6) this.text(WORLD_W / 2, 7, r.earnedThong ? 'COMBO! A BONUS THONG!' : 'COMBO! +50', '#c0386a', 0.5);
    if (r.earnedThong) window.setTimeout(() => this.sfx.whistle(), 350);
    if (r.rodDropped) {
      this.rodDelay = 0.35;
      this.targetDrop = this.st.drop;
    }
    if (this.st.status === 'won') {
      this.score += r.clearBonus;
      this.lastBonus = r.clearBonus;
      this.ending = { kind: 'won', at: this.time + 1.4 };
      window.setTimeout(() => this.sfx.clear(), 600);
    } else if (this.st.status === 'lost') {
      this.ending = { kind: 'lost', at: this.time + 1.5 };
      window.setTimeout(() => this.sfx.over(), 700);
    } else if (this.st.drop + lowestRow(this.st.grid) >= DANGER_ROWS - 2) this.sfx.warn();
    this.hud();
  }

  private text(x: number, y: number, str: string, color: string, size: number) {
    this.parts.push({ kind: 'text', x, y, str, color, size, age: 0 });
  }
  private spark(x: number, y: number, color: string, speed: number) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
    this.parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color, age: 0, life: 0.5 + Math.random() * 0.4 });
  }

  // ------------------------------------------------------------ update

  private update(dt: number) {
    this.time += dt;
    const f = this.flight;
    if (f) {
      f.d += SPEED * dt;
      if (f.d >= f.total) {
        this.flight = null;
        this.land(f);
      }
    }
    if (this.rodDelay > 0) {
      this.rodDelay -= dt;
      if (this.rodDelay <= 0) {
        this.sfx.rod();
        this.shake = 0.25;
      }
    } else if (this.shownDrop < this.targetDrop) this.shownDrop = Math.min(this.targetDrop, this.shownDrop + dt * 3);
    this.shake = Math.max(0, this.shake - dt);

    for (const p of this.parts) {
      if ('delay' in p && p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.age += dt;
      if (p.kind === 'fall') {
        if (p.fetch < 0) {
          p.vy += 26 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          if (p.x < 0.3 || p.x > WORLD_W - 0.3) p.vx = -p.vx;
          if (p.y >= p.floor) {
            p.y = p.floor;
            p.fetch = 0;
            p.fx = p.x;
            p.fy = p.y;
          }
        } else {
          p.fetch += dt / 0.4;
          const mx = ROSIE.x + 1.3, my = ROSIE.y - 0.5;
          const k = Math.min(1, p.fetch);
          p.x = p.fx + (mx - p.fx) * k;
          p.y = p.fy + (my - p.fy) * k - Math.sin(k * Math.PI) * 0.8;
          if (p.fetch >= 1) {
            this.rosieHold = { t: p.t, until: this.time + 0.45 };
            this.rosieWag = 1;
            if (this.time - this.lastWoof > 0.5) {
              this.sfx.woof();
              this.lastWoof = this.time;
            } else this.sfx.plop();
            this.text(ROSIE.x + 1, ROSIE.y - 1.2, '+20', '#1f7a83', 0.4);
          }
        }
      } else if (p.kind === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 6 * dt;
      } else if (p.kind === 'text') p.y -= dt * 0.9;
    }
    this.parts = this.parts.filter(
      (p) =>
        !(
          (p.kind === 'fold' && p.age > 0.4) ||
          (p.kind === 'fall' && p.fetch >= 1) ||
          (p.kind === 'text' && p.age > 1.1) ||
          (p.kind === 'spark' && p.age > p.life)
        ),
    );
    this.rosieLift += ((this.parts.some((p) => p.kind === 'fall') ? 1 : 0) - this.rosieLift) * Math.min(1, dt * 8);
    this.rosieWag = Math.max(0, this.rosieWag - dt * 0.8);
    if (this.rosieHold && this.time > this.rosieHold.until) this.rosieHold = null;

    if (this.ending && this.time >= this.ending.at && !this.parts.some((p) => p.kind === 'fall')) {
      const e = this.ending;
      this.ending = null;
      this.aim = null;
      if (e.kind === 'won') this.cb.onClear(stars(this.st), this.lastBonus);
      else this.cb.onOver();
    }
  }

  // ------------------------------------------------------------ render

  render() {
    const c = this.ctx;
    const s = this.scale * this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const sh = this.shake > 0 ? Math.sin(this.time * 70) * this.shake * 0.25 : 0;
    c.setTransform(s, 0, 0, s, sh * s, 0);
    const t = this.time;
    const drop = this.shownDrop;
    const rodY = ROD_Y + drop * RH;
    const alarm = this.st.status === 'play' && this.st.drop + lowestRow(this.shown) >= DANGER_ROWS - 2;
    drawRoom(c, rodY, ROD_Y + DANGER_Y, t, alarm);

    // clothes on the rod
    for (let col = 0; col < 8; col++)
      if (this.shown[0][col] !== -1) drawHook(c, wx(cellX(0, col)), rodY, wy(cellY(0, drop)));
    forEachItem(this.shown, (r, col, type) => {
      const sway = Math.sin(t * 1.6 + r * 0.7 + col) * 0.03;
      drawItem(c, type, wx(cellX(r, col)), wy(cellY(r, drop)), 1, sway);
    });

    // aiming guide
    if (this.aim !== null && !this.flight) this.drawGuide(this.aim);

    // basket with the current item, the next item, Rosie
    drawBasket(c, false);
    if (!this.flight && this.st.status === 'play') this.drawLoaded(this.st.current, LAUNCH_W.x, LAUNCH_W.y - 0.3, 1.05);
    drawBasket(c, true);
    drawNextSpot(c);
    if (this.st.status === 'play') this.drawLoaded(this.st.next, NEXT.x, NEXT.y, 0.85);
    drawRosie(c, t, this.rosieLift, this.rosieWag, this.rosieHold ? this.rosieHold.t : null);

    // flying item
    const f = this.flight;
    if (f) {
      const p = this.along(f);
      if (f.type === THONG) this.glow(p.x, p.y, 0.75);
      drawItem(c, f.type, p.x, p.y, 1, t * (f.type === THONG ? 14 : 5));
    }

    // particles
    for (const p of this.parts) {
      if ('delay' in p && p.delay > 0) {
        if (p.kind === 'fold') drawItem(c, p.t, p.x, p.y);
        continue;
      }
      if (p.kind === 'fold') {
        const k = Math.min(1, p.age / 0.3);
        c.globalAlpha = 1 - k * 0.6;
        drawItem(c, p.t, p.x, p.y - k * 0.3, 1 + k * 0.15, 0, k * 0.85);
        c.globalAlpha = 1;
        if (k > 0.6) this.star(p.x, p.y - 0.3, (1 - k) * 0.9);
      } else if (p.kind === 'fall') drawItem(c, p.t, p.x, p.y, p.fetch >= 0 ? 0.8 : 1, p.rot, 0, false);
      else if (p.kind === 'spark') {
        c.globalAlpha = 1 - p.age / p.life;
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, 0.08, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      } else {
        c.globalAlpha = Math.min(1, 2.2 - p.age * 2);
        c.font = `700 ${p.size}px "Fredoka", system-ui, sans-serif`;
        c.textAlign = 'center';
        c.lineWidth = 0.1;
        c.strokeStyle = '#fff';
        c.lineJoin = 'round';
        c.strokeText(p.str, p.x, p.y);
        c.fillStyle = p.color;
        c.fillText(p.str, p.x, p.y);
        c.globalAlpha = 1;
      }
    }
  }

  private along(f: Flight): Pt {
    let i = 1;
    while (i < f.lens.length - 1 && f.lens[i] < f.d) i++;
    const a = f.points[i - 1], b = f.points[i];
    const seg = f.lens[i] - f.lens[i - 1] || 1;
    const k = Math.min(1, Math.max(0, (f.d - f.lens[i - 1]) / seg));
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  private drawLoaded(type: number, x: number, y: number, size: number) {
    if (type === THONG) {
      this.glow(x, y, 0.75 * size);
      drawItem(this.ctx, type, x, y + Math.sin(this.time * 5) * 0.05, size, Math.sin(this.time * 3) * 0.15);
    } else drawItem(this.ctx, type, x, y, size);
  }

  private glow(x: number, y: number, r: number) {
    const c = this.ctx;
    const pulse = 0.75 + 0.25 * Math.sin(this.time * 8);
    const g = c.createRadialGradient(x, y, 0.1, x, y, r * 1.4);
    g.addColorStop(0, `rgba(255,220,90,${0.7 * pulse})`);
    g.addColorStop(1, 'rgba(255,90,160,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r * 1.4, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 3; i++) {
      const a = this.time * 2 + (i * Math.PI * 2) / 3;
      this.star(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.14 * pulse);
    }
  }

  private star(x: number, y: number, r: number) {
    if (r <= 0) return;
    const c = this.ctx;
    c.fillStyle = '#fff6c2';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.35 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
  }

  private drawGuide(angle: number) {
    const c = this.ctx;
    const tr = trace(this.st.grid, this.st.drop, angle);
    const pts = tr.points.map((q) => ({ x: wx(q.x), y: wy(q.y) }));
    const max = this.st.def.guide;
    const gap = 0.36;
    let d = (this.time * 1.2) % gap;
    let walked = 0;
    c.fillStyle = INK;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      while (d <= len) {
        const k = d / len;
        const fade = 1 - (walked + d) / (max + 0.01);
        if (fade <= 0) return;
        c.globalAlpha = Math.min(0.85, fade * 1.5);
        c.beginPath();
        c.arc(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 0.075, 0, Math.PI * 2);
        c.fill();
        d += gap;
      }
      d -= len;
      walked += len;
    }
    c.globalAlpha = 1;
    // ghost of where it lands
    if (tr.cell && this.st.current !== THONG && max >= 99) {
      c.globalAlpha = 0.35;
      drawItem(c, this.st.current, wx(cellX(tr.cell.r, tr.cell.c)), wy(cellY(tr.cell.r, this.st.drop)), 1, 0, 0, false);
      c.globalAlpha = 1;
    }
  }
}
