/**
 * Tidy the Closet art: everything drawn in canvas, in world units (1 unit = one clothing item).
 * Look: a cosy pastel cartoon bedroom with thick ink outlines.
 */
import { THONG } from './sim';

export const INK = '#2b2140';

/** World layout (units). The sim's x 0..8 maps to world x IN_X..IN_X+8; sim y 0 is the rod line ROD_Y. */
export const WORLD_W = 9.2;
export const WORLD_H = 19.5;
export const IN_X = 0.6;
export const ROD_Y = 2.3;
export const IN_BOTTOM = 13.35;
export const FLOOR_Y = 14.35;

type Painter = (c: CanvasRenderingContext2D) => void;
const P = (d: string) => new Path2D(d);

function fillStroke(c: CanvasRenderingContext2D, p: Path2D, fill: string, w = 2) {
  c.fillStyle = fill;
  c.fill(p);
  c.lineWidth = w;
  c.strokeStyle = INK;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.stroke(p);
}
function line(c: CanvasRenderingContext2D, d: string, color: string, w: number, dash?: number[]) {
  c.save();
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  if (dash) c.setLineDash(dash);
  c.stroke(P(d));
  c.restore();
}

// ---------------------------------------------------------------- clothes (drawn in a 40x40 box)

const shirtBody = P('M12 6 L3 12 L7.5 19 L12 16.5 L12 34 Q20 35.5 28 34 L28 16.5 L32.5 19 L37 12 L28 6 Q20 11 12 6Z');
const jeansBody = P('M10 5 H30 L32.5 35 H23 L20 17 L17 35 H7.5 Z');
const sockBody = P('M13 4 H25 V21 L32 25.5 Q37 30 31.5 35 Q28 36.5 24 35 L15 30.5 Q11.5 28.5 12.5 24 Z');
const towelBody = P('M8 7 H32 Q33.5 7 33.5 8.5 V31.5 Q33.5 33 32 33 H8 Q6.5 33 6.5 31.5 V8.5 Q6.5 7 8 7Z');
const boxerBody = P('M7.5 11 H32.5 L35 31 Q28 33.5 22 31.5 L20 23 L18 31.5 Q12 33.5 5 31 Z');
const boxerBand = P('M7 6.5 H33 Q34 6.5 34 7.5 V11.5 H6 V7.5 Q6 6.5 7 6.5Z');
const thongBand = P('M3 10 Q20 15.5 37 10 L37 13.2 Q20 18.8 3 13.2 Z');
const thongPouch = P('M12.5 13.5 Q20 17 27.5 13.5 Q27.5 23 20 32 Q12.5 23 12.5 13.5Z');

const ITEM_PAINT: Record<number, Painter> = {
  0: (c) => {
    fillStroke(c, shirtBody, '#e0524a');
    line(c, 'M15.5 7.5 L20 12.5 L24.5 7.5', '#fff3', 2);
    line(c, 'M15 7 L20 12 L25 7', INK, 1.6);
    c.strokeStyle = INK;
    c.lineWidth = 1.4;
    c.strokeRect(22.5, 18, 3.8, 4);
    line(c, 'M14 30 Q20 31.5 26 30', '#0002', 2);
  },
  1: (c) => {
    fillStroke(c, jeansBody, '#3d6fd1');
    line(c, 'M10 9.5 H30', INK, 1.4);
    line(c, 'M20 9.5 V17', INK, 1.3);
    line(c, 'M12 12 Q14.5 15 17.5 13 M28 12 Q25.5 15 22.5 13', '#a8c6ff', 1.1, [1.6, 1.4]);
    line(c, 'M10.5 32 H16.2 M23.8 32 H29.8', '#a8c6ff', 1.1, [1.6, 1.4]);
    c.fillStyle = '#e8c35a';
    c.beginPath();
    c.arc(20, 7.3, 1.3, 0, Math.PI * 2);
    c.fill();
  },
  2: (c) => {
    fillStroke(c, sockBody, '#f2c230');
    line(c, 'M13 8 H25', '#e0524a', 2.4);
    line(c, 'M13 12 H25', '#e0524a', 2.4);
    line(c, 'M26 34.5 Q31 34 32.8 29', '#d49e10', 3);
    line(c, 'M13 22 Q15 26 19 26.5', '#d49e10', 2.5);
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke(sockBody);
  },
  3: (c) => {
    fillStroke(c, towelBody, '#4fb07a');
    line(c, 'M6.5 13 H33.5 M6.5 27 H33.5', '#fff', 2.6);
    line(c, 'M6.5 20 H33.5', '#3d9465', 1.2);
    for (let x = 9; x <= 31; x += 3.6) line(c, `M${x} 33 V36`, INK, 1.2);
  },
  4: (c) => {
    fillStroke(c, boxerBody, '#9b5cc4');
    fillStroke(c, boxerBand, '#f3ecff', 1.8);
    line(c, 'M6.5 9 H33.5', '#9b5cc4', 1);
    c.fillStyle = '#fff';
    for (const [x, y] of [[11, 16], [18, 15], [26, 16], [31, 23], [9, 24], [15, 21], [25, 23], [29, 29], [12, 29]] as const) {
      // tiny hearts
      c.beginPath();
      c.moveTo(x, y + 1.6);
      c.bezierCurveTo(x - 2.4, y - 0.2, x - 1, y - 2, x, y - 0.6);
      c.bezierCurveTo(x + 1, y - 2, x + 2.4, y - 0.2, x, y + 1.6);
      c.fill();
    }
    line(c, 'M20 23 V31', INK, 1);
  },
  [THONG]: (c) => {
    // a men's leopard-print thong: thin waistband, small pouch, gold trim
    fillStroke(c, thongBand, '#e0a63a', 1.8);
    fillStroke(c, thongPouch, '#e9a640', 2);
    c.save();
    c.clip(thongPouch);
    c.fillStyle = '#3a2412';
    for (const [x, y, r] of [[16, 17, 1.6], [21, 19, 1.3], [24.5, 16.5, 1.4], [18, 23.5, 1.5], [22.5, 25, 1.2], [20, 29, 1]] as const) {
      c.beginPath();
      c.ellipse(x, y, r * 1.2, r, 0.4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#a05a1a';
      c.beginPath();
      c.ellipse(x, y, r * 0.5, r * 0.4, 0.4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3a2412';
    }
    c.restore();
    line(c, 'M13 14 Q20 17.6 27 14', '#ffe08a', 1.2);
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke(thongPouch);
    // a little gold ring on each hip
    c.strokeStyle = '#ffd34d';
    c.lineWidth = 1.4;
    for (const x of [7, 33]) {
      c.beginPath();
      c.arc(x, 11.8, 1.6, 0, Math.PI * 2);
      c.stroke();
    }
  },
};

/** One clothing item centred on (x, y), `size` units across. `fold` 0..1 squashes it as it gets folded away. */
export function drawItem(c: CanvasRenderingContext2D, t: number, x: number, y: number, size = 1, rot = 0, fold = 0, backing = true) {
  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  if (backing) {
    c.fillStyle = 'rgba(43,33,64,.13)';
    c.beginPath();
    c.ellipse(0.03 * size, 0.06 * size, 0.47 * size, 0.47 * size * (1 - fold), 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath();
    c.ellipse(0, 0, 0.47 * size, 0.47 * size * (1 - fold), 0, 0, Math.PI * 2);
    c.fill();
  }
  c.scale((size / 40) * 1.02, (size / 40) * 1.02 * (1 - fold));
  c.translate(-20, -20);
  ITEM_PAINT[t]?.(c);
  c.restore();
}

// ---------------------------------------------------------------- the room

/** Wall, wardrobe, floor. `rodY` is the rod's current height (animated), `dangerY` the door line; `alarm` blinks it. */
export function drawRoom(c: CanvasRenderingContext2D, rodY: number, dangerY: number, time: number, alarm: boolean) {
  // bedroom wall
  c.fillStyle = '#c9bfe3';
  c.fillRect(-2, -2, WORLD_W + 4, FLOOR_Y + 2);
  c.fillStyle = '#bdb2da';
  for (let x = -0.4; x < WORLD_W + 1; x += 0.9) c.fillRect(x, 0, 0.3, FLOOR_Y);
  // carpet
  c.fillStyle = '#d9b98c';
  c.fillRect(-2, FLOOR_Y, WORLD_W + 4, WORLD_H - FLOOR_Y + 2);
  c.fillStyle = '#cfab7a';
  for (let y = FLOOR_Y + 0.35; y < WORLD_H; y += 0.5)
    for (let x = ((y * 7) % 0.8) - 0.4; x < WORLD_W; x += 0.8) c.fillRect(x, y, 0.12, 0.06);
  c.fillStyle = '#a5845a';
  c.fillRect(-2, FLOOR_Y - 0.08, WORLD_W + 4, 0.16);

  // wardrobe body
  const L = 0.1, R = WORLD_W - 0.1, T = 0.55;
  c.fillStyle = '#c8955f';
  c.strokeStyle = INK;
  c.lineWidth = 0.07;
  rr(c, L, T, R - L, FLOOR_Y - T + 0.02, 0.12);
  c.fill();
  c.stroke();
  // crown moulding (the HUD sits here)
  c.fillStyle = '#b07f4c';
  c.fillRect(L + 0.04, T + 0.04, R - L - 0.08, 0.75);
  // interior
  const ix = IN_X, iw = 8, iy = 1.35;
  c.fillStyle = '#f6ead7';
  c.fillRect(ix, iy, iw, IN_BOTTOM - iy);
  c.fillStyle = '#efdfc6';
  for (let x = ix + 1; x < ix + iw; x += 1.6) c.fillRect(x, iy, 0.05, IN_BOTTOM - iy);
  // inner shadow
  const g = c.createLinearGradient(0, iy, 0, iy + 1.2);
  g.addColorStop(0, 'rgba(60,40,20,.28)');
  g.addColorStop(1, 'rgba(60,40,20,0)');
  c.fillStyle = g;
  c.fillRect(ix, iy, iw, 1.2);
  c.strokeStyle = INK;
  c.lineWidth = 0.05;
  c.strokeRect(ix, iy, iw, IN_BOTTOM - iy);
  // top shelf with neat folded stacks (where tidy clothes end up)
  c.fillStyle = '#e8d2b0';
  c.fillRect(ix, iy + 0.55, iw, 0.14);
  c.strokeRect(ix, iy + 0.55, iw, 0.14);
  const stack = (x: number, cols: string[]) => {
    cols.forEach((col, i) => {
      c.fillStyle = col;
      rr(c, x, iy + 0.42 - i * 0.14, 0.9, 0.14, 0.04);
      c.fill();
      c.lineWidth = 0.03;
      c.stroke();
    });
  };
  stack(ix + 0.3, ['#3d6fd1', '#e0524a', '#4fb07a']);
  stack(ix + 1.4, ['#9b5cc4', '#f2c230']);
  stack(ix + 6.6, ['#4fb07a', '#3d6fd1', '#e0524a']);
  // shoebox
  c.fillStyle = '#e46d4b';
  rr(c, ix + 4.6, iy + 0.12, 1.2, 0.43, 0.04);
  c.fill();
  c.stroke();

  // open doors at the sides
  for (const [x0, x1] of [[L, IN_X], [IN_X + 8, R]] as const) {
    c.fillStyle = '#d9a873';
    c.fillRect(x0 + 0.04, 1.3, x1 - x0 - 0.08, IN_BOTTOM - 1.3);
    c.fillStyle = '#e2b986';
    c.fillRect(x0 + 0.12, 1.5, x1 - x0 - 0.24, IN_BOTTOM - 1.7);
    c.fillStyle = '#d4a35a';
    c.beginPath();
    c.arc((x0 + x1) / 2, 7.3, 0.11, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 0.03;
    c.stroke();
  }

  // danger line: the door won't close past here
  const dy = dangerY;
  const a = alarm ? 0.6 + 0.4 * Math.sin(time * 9) : 0.45;
  c.save();
  c.strokeStyle = `rgba(214,69,65,${a})`;
  c.lineWidth = alarm ? 0.09 : 0.06;
  c.setLineDash([0.28, 0.2]);
  c.beginPath();
  c.moveTo(IN_X + 0.05, dy);
  c.lineTo(IN_X + 7.95, dy);
  c.stroke();
  c.restore();
  c.fillStyle = '#c0392b';
  c.font = '600 0.3px "Fredoka", system-ui, sans-serif';
  c.textAlign = 'right';
  c.fillText("DOOR WON'T CLOSE", IN_X + 7.9, dy + 0.38);

  // drawers under the hanging space
  for (let i = 0; i < 2; i++) {
    const x = IN_X + i * 4 + 0.08;
    c.fillStyle = '#d9a873';
    rr(c, x, IN_BOTTOM + 0.1, 3.84, 0.8, 0.06);
    c.fill();
    c.lineWidth = 0.04;
    c.stroke();
    c.fillStyle = '#b8864f';
    rr(c, x + 1.52, IN_BOTTOM + 0.42, 0.8, 0.13, 0.06);
    c.fill();
  }

  // the rod and its brackets
  c.fillStyle = '#8a8f98';
  c.fillRect(IN_X - 0.05, rodY - 0.12, 0.2, 0.32);
  c.fillRect(IN_X + 7.85, rodY - 0.12, 0.2, 0.32);
  const rg = c.createLinearGradient(0, rodY - 0.08, 0, rodY + 0.1);
  rg.addColorStop(0, '#e4e8ee');
  rg.addColorStop(1, '#7c838e');
  c.fillStyle = rg;
  rr(c, IN_X, rodY - 0.08, 8, 0.17, 0.08);
  c.fill();
  c.lineWidth = 0.035;
  c.strokeStyle = INK;
  c.stroke();
}

/** Wire hanger hook from the rod down to a top-row item. */
export function drawHook(c: CanvasRenderingContext2D, x: number, rodY: number, itemY: number) {
  c.save();
  c.strokeStyle = '#6f7682';
  c.lineWidth = 0.045;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(x, rodY + 0.02, 0.1, Math.PI, Math.PI * 2.4);
  c.moveTo(x, rodY + 0.12);
  c.lineTo(x, itemY - 0.38);
  c.moveTo(x - 0.32, itemY - 0.28);
  c.lineTo(x, itemY - 0.42);
  c.lineTo(x + 0.32, itemY - 0.28);
  c.stroke();
  c.restore();
}

export const BASKET = { x: IN_X + 4, y: 16.55 };
export const NEXT = { x: 7.75, y: 16.85 };
export const ROSIE = { x: 1.55, y: 17.55 };

export function drawBasket(c: CanvasRenderingContext2D, front: boolean) {
  const { x, y } = BASKET;
  if (!front) {
    // back rim and a peek of laundry
    c.fillStyle = '#b48748';
    c.beginPath();
    c.ellipse(x, y - 0.55, 1.15, 0.26, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#7f5a2b';
    c.beginPath();
    c.ellipse(x, y - 0.52, 1.0, 0.19, 0, 0, Math.PI * 2);
    c.fill();
    return;
  }
  c.fillStyle = '#d9b779';
  c.strokeStyle = INK;
  c.lineWidth = 0.07;
  c.beginPath();
  c.moveTo(x - 1.15, y - 0.55);
  c.lineTo(x + 1.15, y - 0.55);
  c.lineTo(x + 0.95, y + 0.95);
  c.quadraticCurveTo(x, y + 1.12, x - 0.95, y + 0.95);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = '#b08a4c';
  c.lineWidth = 0.05;
  for (let i = 1; i < 4; i++) {
    const yy = y - 0.55 + i * 0.38;
    c.beginPath();
    c.moveTo(x - 1.15 + i * 0.05, yy);
    c.lineTo(x + 1.15 - i * 0.05, yy);
    c.stroke();
  }
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(x + i * 0.32, y - 0.5);
    c.lineTo(x + i * 0.27, y + 0.98);
    c.stroke();
  }
  // rim
  c.fillStyle = '#c79e5c';
  c.strokeStyle = INK;
  c.lineWidth = 0.06;
  rr(c, x - 1.22, y - 0.66, 2.44, 0.2, 0.1);
  c.fill();
  c.stroke();
  // handles
  c.fillStyle = '#7f5a2b';
  rr(c, x - 0.95, y - 0.33, 0.35, 0.1, 0.05);
  c.fill();
  rr(c, x + 0.6, y - 0.33, 0.35, 0.1, 0.05);
  c.fill();
}

/** The little round stool the next item waits on, with a SWAP hint. */
export function drawNextSpot(c: CanvasRenderingContext2D) {
  const { x, y } = NEXT;
  c.fillStyle = 'rgba(43,33,64,.18)';
  c.beginPath();
  c.ellipse(x, y + 0.75, 0.72, 0.16, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#7fb6c9';
  c.strokeStyle = INK;
  c.lineWidth = 0.06;
  c.beginPath();
  c.ellipse(x, y + 0.42, 0.66, 0.2, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#5b97ad';
  c.fillRect(x - 0.08, y + 0.5, 0.16, 0.3);
  c.fillStyle = INK;
  c.font = '600 0.27px "Fredoka", system-ui, sans-serif';
  c.textAlign = 'center';
  c.fillText('NEXT · tap to swap', x - 0.2, y + 1.25);
}

// ---------------------------------------------------------------- Rosie

/**
 * Rosie lying on her teal dog bed, facing right toward the basket. `lift` 0..1 raises her head
 * (alert / catching), `wag` drives the tail, `sleepy` closes her eyes.
 */
export function drawRosie(c: CanvasRenderingContext2D, time: number, lift: number, wag: number, holding: number | null) {
  const { x, y } = ROSIE;
  c.save();
  c.translate(x, y);
  // bed
  c.fillStyle = 'rgba(43,33,64,.2)';
  c.beginPath();
  c.ellipse(0.05, 0.55, 1.45, 0.3, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1f9aa6';
  c.strokeStyle = INK;
  c.lineWidth = 0.06;
  c.beginPath();
  c.ellipse(0, 0.32, 1.4, 0.42, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#7fd0d6';
  c.beginPath();
  c.ellipse(0, 0.24, 1.15, 0.26, 0, 0, Math.PI * 2);
  c.fill();

  const breathe = Math.sin(time * 2.2) * 0.02;
  // tail (left), long and thin
  const tw = Math.sin(time * (wag > 0.05 ? 18 : 1.5)) * (0.15 + wag * 0.45);
  c.strokeStyle = INK;
  c.lineWidth = 0.13;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-0.82, 0.02);
  c.quadraticCurveTo(-1.3, -0.1 + tw * 0.3, -1.45, -0.45 + tw);
  c.stroke();
  c.strokeStyle = '#f4f2ee';
  c.lineWidth = 0.07;
  c.stroke();
  // body
  c.fillStyle = '#f4f2ee';
  c.strokeStyle = INK;
  c.lineWidth = 0.06;
  c.beginPath();
  c.ellipse(-0.1, 0.0 - breathe, 0.85, 0.36 + breathe, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // big black rump spot by the tail, and grey ticking
  c.save();
  c.beginPath();
  c.ellipse(-0.1, 0.0 - breathe, 0.85, 0.36 + breathe, 0, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#141414';
  c.beginPath();
  c.ellipse(-0.62, -0.12, 0.3, 0.26, 0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#9a9a9a';
  for (const [a, b] of [[-0.2, -0.15], [0.1, -0.05], [0.3, -0.2], [-0.05, 0.12], [0.35, 0.1], [-0.35, 0.1]] as const) {
    c.beginPath();
    c.arc(a, b, 0.035, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  // front legs stretched toward the basket
  c.fillStyle = '#f4f2ee';
  c.lineWidth = 0.05;
  for (const dy of [0.16, 0.27]) {
    rr(c, 0.45, dy, 0.75, 0.11, 0.05);
    c.fill();
    c.stroke();
  }
  // head: black with a white blaze and muzzle, black ears, red collar
  const hx = 0.82, hy = -0.22 - lift * 0.35;
  c.save();
  c.translate(hx, hy);
  c.rotate(-lift * 0.25);
  c.fillStyle = '#d93a3a';
  rr(c, -0.24, 0.14, 0.2, 0.32, 0.05);
  c.fill();
  c.fillStyle = '#141414';
  c.beginPath();
  c.ellipse(0, 0, 0.3, 0.27, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // ear
  c.beginPath();
  c.moveTo(-0.15, -0.18);
  c.quadraticCurveTo(-0.42, -0.1, -0.33, 0.24);
  c.quadraticCurveTo(-0.15, 0.05, -0.02, -0.18);
  c.fill();
  // muzzle
  c.fillStyle = '#f4f2ee';
  c.beginPath();
  c.ellipse(0.32, 0.08, 0.22, 0.14, 0.1, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // blaze
  c.beginPath();
  c.moveTo(0.02, -0.27);
  c.quadraticCurveTo(0.1, -0.05, 0.16, 0.02);
  c.lineTo(0.24, -0.02);
  c.quadraticCurveTo(0.12, -0.12, 0.08, -0.27);
  c.fill();
  // nose
  c.fillStyle = '#141414';
  c.beginPath();
  c.arc(0.53, 0.04, 0.055, 0, Math.PI * 2);
  c.fill();
  // eye
  const open = lift > 0.15 || Math.sin(time * 0.7) > 0.6;
  c.strokeStyle = '#f4f2ee';
  c.fillStyle = '#f4f2ee';
  c.lineWidth = 0.035;
  if (open) {
    c.beginPath();
    c.arc(0.12, -0.08, 0.05, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#141414';
    c.beginPath();
    c.arc(0.135, -0.08, 0.028, 0, Math.PI * 2);
    c.fill();
  } else {
    c.beginPath();
    c.arc(0.12, -0.09, 0.05, 0.2, Math.PI - 0.2);
    c.stroke();
  }
  if (holding !== null) drawItem(c, holding, 0.55, 0.15, 0.55, 0.4, 0, false);
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- helpers

export function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
