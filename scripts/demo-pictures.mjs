// Simple drawn pictures for the demo account (`pnpm seed:demo`).
//
// No image library is needed: shapes are drawn into a pixel buffer and
// saved as a PNG with Node's built-in zlib. The pictures are clearly
// illustrations, not real photos, so nobody mistakes demo data for real.

import { deflateSync } from "node:zlib";

const WIDTH = 960;
const HEIGHT = 640;

function hex(color) {
  const n = parseInt(color.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

class Picture {
  constructor() {
    this.pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  }

  set(x, y, rgb) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = (y * WIDTH + x) * 3;
    this.pixels[i] = rgb[0];
    this.pixels[i + 1] = rgb[1];
    this.pixels[i + 2] = rgb[2];
  }

  rect(x, y, w, h, color) {
    const rgb = Array.isArray(color) ? color : hex(color);
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(WIDTH, Math.round(x + w));
    const y1 = Math.min(HEIGHT, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.set(xx, yy, rgb);
    }
  }

  /** Vertical gradient. */
  gradient(x, y, w, h, top, bottom) {
    const a = hex(top);
    const b = hex(bottom);
    for (let row = 0; row < h; row++) {
      this.rect(x, y + row, w, 1, mix(a, b, row / Math.max(1, h - 1)));
    }
  }

  /** Filled triangle (used for roofs). */
  triangle(ax, ay, bx, by, cx, cy, color) {
    const rgb = hex(color);
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(Math.max(ay, by, cy)));
    const edges = [
      [ax, ay, bx, by],
      [bx, by, cx, cy],
      [cx, cy, ax, ay],
    ];
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (const [x0, y0, x1, y1] of edges) {
        if ((y >= y0 && y < y1) || (y >= y1 && y < y0)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      if (xs.length >= 2) {
        const left = Math.min(...xs);
        const right = Math.max(...xs);
        this.rect(left, y, right - left, 1, rgb);
      }
    }
  }

  circle(cx, cy, r, color) {
    const rgb = hex(color);
    for (let y = -r; y <= r; y++) {
      const half = Math.sqrt(r * r - y * y);
      this.rect(cx - half, cy + y, half * 2, 1, rgb);
    }
  }

  window(x, y, w, h, frame = "#ffffff", glass = "#9fd3f0") {
    this.rect(x, y, w, h, frame);
    const t = Math.max(4, Math.round(w / 12));
    const gw = (w - t * 3) / 2;
    const gh = (h - t * 3) / 2;
    for (const [dx, dy] of [
      [t, t],
      [t * 2 + gw, t],
      [t, t * 2 + gh],
      [t * 2 + gw, t * 2 + gh],
    ]) {
      this.gradient(x + dx, y + dy, gw, gh, glass, "#e8f6ff");
    }
  }

  png() {
    const raw = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
    for (let y = 0; y < HEIGHT; y++) {
      raw[y * (WIDTH * 3 + 1)] = 0;
      this.pixels.copy(
        raw,
        y * (WIDTH * 3 + 1) + 1,
        y * WIDTH * 3,
        (y + 1) * WIDTH * 3,
      );
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(WIDTH, 0);
    header.writeUInt32BE(HEIGHT, 4);
    header[8] = 8; // bit depth
    header[9] = 2; // colour type: RGB
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** The front of a house. `style`: wall, roof and door colours, floors. */
export function houseFront({ wall, roof, door, floors = 2, wide = false }) {
  const p = new Picture();
  p.gradient(0, 0, WIDTH, 470, "#7cc3ef", "#d9f0ff");
  p.circle(820, 110, 48, "#ffe38a");
  // Clouds
  for (const [x, y] of [
    [140, 110],
    [190, 95],
    [240, 112],
    [560, 70],
    [605, 58],
  ]) {
    p.circle(x, y, 34, "#ffffff");
  }
  p.rect(0, 470, WIDTH, 170, "#6fbf5a");
  p.rect(0, 560, WIDTH, 80, "#9a9a9a");
  p.rect(0, 556, WIDTH, 6, "#c9c9c9");

  const houseW = wide ? 640 : 480;
  const x = (WIDTH - houseW) / 2;
  const floorH = 130;
  const top = 500 - floorH * floors;
  p.rect(x, top, houseW, floorH * floors, wall);
  p.triangle(x - 30, top, x + houseW + 30, top, WIDTH / 2, top - 150, roof);
  p.rect(x + houseW - 110, top - 120, 44, 90, "#8b4a3a");

  // Windows
  const columns = wide ? 4 : 3;
  const gap = houseW / columns;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < columns; c++) {
      if (f === floors - 1 && c === Math.floor(columns / 2)) continue;
      p.window(x + gap * c + gap / 2 - 40, top + 25 + f * floorH, 80, 80);
    }
  }
  // Door and path
  const doorX = x + gap * Math.floor(columns / 2) + gap / 2 - 38;
  p.rect(doorX, 500 - 120, 76, 120, door);
  p.circle(doorX + 60, 500 - 60, 5, "#f2d27a");
  p.rect(doorX - 10, 500, 96, 56, "#d8cbb0");
  // Hedge
  p.rect(x - 60, 460, 110, 40, "#3f8f3a");
  p.rect(x + houseW - 50, 460, 110, 40, "#3f8f3a");
  return p.png();
}

/** A bedroom. */
export function bedroom({ wall, bedding }) {
  const p = new Picture();
  p.rect(0, 0, WIDTH, 440, wall);
  p.gradient(0, 440, WIDTH, 200, "#c79a6b", "#a87b50");
  p.rect(0, 432, WIDTH, 10, "#ffffff");
  p.window(620, 90, 220, 200);
  // Bed
  p.rect(120, 250, 380, 120, "#7a5233");
  p.rect(100, 350, 440, 120, bedding);
  p.rect(130, 320, 140, 60, "#ffffff");
  p.rect(300, 320, 140, 60, "#ffffff");
  p.rect(100, 470, 20, 40, "#5d3c22");
  p.rect(520, 470, 20, 40, "#5d3c22");
  // Bedside table and lamp
  p.rect(560, 380, 90, 100, "#8a6142");
  p.rect(595, 330, 20, 50, "#444444");
  p.triangle(565, 330, 645, 330, 605, 280, "#ffe9a8");
  return p.png();
}

/** A kitchen. */
export function kitchen({ wall, units }) {
  const p = new Picture();
  p.rect(0, 0, WIDTH, 460, wall);
  p.rect(0, 460, WIDTH, 180, "#d9d4cc");
  for (let x = 0; x < WIDTH; x += 80) p.rect(x, 460, 2, 180, "#c4beb4");
  // Wall cupboards
  for (let i = 0; i < 4; i++) p.rect(80 + i * 130, 80, 120, 130, units);
  p.window(640, 90, 220, 170);
  // Worktop and base units
  p.rect(60, 330, 840, 22, "#3d3d3d");
  for (let i = 0; i < 6; i++) {
    p.rect(70 + i * 138, 352, 130, 150, units);
    p.rect(125 + i * 138, 370, 20, 6, "#cccccc");
  }
  // Hob and tap
  p.rect(150, 318, 160, 12, "#222222");
  p.rect(730, 280, 10, 50, "#b5b5b5");
  p.rect(700, 280, 40, 10, "#b5b5b5");
  return p.png();
}

/** A living room. */
export function livingRoom({ wall, sofa }) {
  const p = new Picture();
  p.rect(0, 0, WIDTH, 450, wall);
  p.gradient(0, 450, WIDTH, 190, "#9c7a5b", "#7f6047");
  p.rect(180, 470, 600, 120, "#d8c3a5");
  p.window(80, 80, 240, 210);
  // Picture frame
  p.rect(560, 100, 200, 140, "#5a4632");
  p.gradient(575, 115, 170, 110, "#f4a259", "#f7d488");
  // Sofa
  p.rect(380, 300, 440, 110, sofa);
  p.rect(350, 360, 500, 110, sofa);
  p.rect(350, 470, 20, 30, "#3b3b3b");
  p.rect(830, 470, 20, 30, "#3b3b3b");
  // Plant
  p.rect(150, 400, 60, 80, "#b5651d");
  p.circle(180, 370, 50, "#3f8f3a");
  return p.png();
}
