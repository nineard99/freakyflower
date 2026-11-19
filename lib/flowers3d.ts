import * as THREE from 'three';

/* โมเดลหัวดอกไม้ 3D (สร้างจากสูตร ไม่ใช้ไฟล์โมเดล) — ใช้ในโหมด 3D ของหน้าจัดช่อเอง
   ทุกดอกสร้างให้รัศมีราว 1 หน่วย หันหน้าไปทาง +Y โคนดอกอยู่ที่จุด (0, 0, 0) แล้วค่อยขยาย/หมุนตอนวางในฉาก
   สีอยู่ใน vertex color (ไล่เข้มที่โคนกลีบ อ่อนที่ปลาย) → ทั้งดอกเป็น mesh เดียว ใช้ material ร่วมกันได้
   เพิ่มดอกชนิดใหม่: เขียนฟังก์ชันสร้างรูปทรง แล้วเพิ่มใน MODELS ท้ายไฟล์ */

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rng = (seed: number) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const col = (hex: string) => new THREE.Color(hex);

// สีเงา: เข้มลงและอมแดงเล็กน้อย (สีอ่อนมากเข้มน้อยกว่า จะได้ไม่ออกเทา)
function deep(c: THREE.Color, amt: number) {
  const lum = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
  return c.clone().lerp(c.clone().multiply(new THREE.Color(0.42, 0.3, 0.34)), amt * (1 - 0.45 * lum * lum));
}
const light = (c: THREE.Color, amt: number) => c.clone().lerp(new THREE.Color(1, 1, 1), amt);

type Paint = (u: number, v: number, out: THREE.Color) => void;

class Mesher {
  private pos: number[] = [];
  private rgb: number[] = [];
  private idx: number[] = [];
  private p = new THREE.Vector3();
  private c = new THREE.Color();

  // แผ่นตาราง: u = 0..1 (โคน→ปลาย), v = -1..1 (ซ้าย→ขวา)
  grid(nu: number, nv: number, at: (u: number, v: number, out: THREE.Vector3) => void, paint: Paint) {
    const base = this.pos.length / 3;
    for (let i = 0; i <= nu; i++) {
      for (let j = 0; j <= nv; j++) {
        const u = i / nu, v = (j / nv) * 2 - 1;
        at(u, v, this.p);
        paint(u, v, this.c);
        this.pos.push(this.p.x, this.p.y, this.p.z);
        this.rgb.push(this.c.r, this.c.g, this.c.b);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = base + i * (nv + 1) + j, b = a + nv + 1;
        this.idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  // รูปทรงสำเร็จ (ทรงกลม ทรงกระบอก ฯลฯ) สีเดียว
  solid(g: THREE.BufferGeometry, color: THREE.Color, m: THREE.Matrix4) {
    const base = this.pos.length / 3, pa = g.getAttribute('position');
    for (let i = 0; i < pa.count; i++) {
      this.p.fromBufferAttribute(pa, i).applyMatrix4(m);
      this.pos.push(this.p.x, this.p.y, this.p.z);
      this.rgb.push(color.r, color.g, color.b);
    }
    const ix = g.getIndex();
    if (ix) for (let i = 0; i < ix.count; i++) this.idx.push(base + ix.getX(i));
    else for (let i = 0; i < pa.count; i++) this.idx.push(base + i);
    g.dispose();
  }

  // กิ่งเล็ก: แท่งสามเหลี่ยมจาก a ไป b
  twig(a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number, color: THREE.Color) {
    const base = this.pos.length / 3;
    const dir = b.clone().sub(a).normalize();
    const side = new THREE.Vector3(1, 0, 0);
    if (Math.abs(dir.x) > 0.8) side.set(0, 0, 1);
    const n1 = side.cross(dir).normalize(), n2 = dir.clone().cross(n1);
    for (const [pt, r] of [[a, ra], [b, rb]] as const) {
      for (let k = 0; k < 3; k++) {
        const an = (k / 3) * TAU;
        this.pos.push(pt.x + (n1.x * Math.cos(an) + n2.x * Math.sin(an)) * r, pt.y + (n1.y * Math.cos(an) + n2.y * Math.sin(an)) * r, pt.z + (n1.z * Math.cos(an) + n2.z * Math.sin(an)) * r);
        this.rgb.push(color.r, color.g, color.b);
      }
    }
    for (let k = 0; k < 3; k++) {
      const k2 = (k + 1) % 3;
      this.idx.push(base + k, base + 3 + k, base + k2, base + k2, base + 3 + k, base + 3 + k2);
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.rgb, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

/* ---------- กลีบแบบโอบรอบแกน (กุหลาบ คาร์เนชัน): ชิ้นส่วนของผิวหมุนรอบแกน ---------- */
type Wrap = {
  az: number; // มุมกลางกลีบรอบแกน
  span: number; // ความกว้างเชิงมุม (rad)
  r0: number; y0: number; // โคนกลีบ
  len: number;
  a0: number; a1: number; // มุมเงยจากแนวราบ ที่โคน → ที่ปลาย (π/2 = ตั้งตรง, ติดลบ = ปลายงุ้มลง)
  round?: number; // ปลายมน
  flare?: number; // ขอบกลีบม้วนออก
  ruffle?: number; waves?: number; phase?: number; // ระบายย่น
  fringe?: number; // ปลายหยักซี่
  lip?: number; // ปลายกลีบม้วนออก
  fan?: boolean; // กว้างเท่ากันทั้งกลีบ (รูปพัด) แทนโคนสอบ
};

function wrapPetal(m: Mesher, o: Wrap, nu: number, nv: number, paint: Paint) {
  const K = 16, R: number[] = [o.r0], Y: number[] = [o.y0], A: number[] = [o.a0];
  for (let k = 1; k <= K; k++) {
    const a = o.a0 + (o.a1 - o.a0) * ((k - 0.5) / K) ** 1.5;
    R.push(R[k - 1] + (Math.cos(a) * o.len) / K);
    Y.push(Y[k - 1] + (Math.sin(a) * o.len) / K);
    A.push(a);
  }
  const { round = 0.15, flare = 0, ruffle = 0, waves = 9, phase = 0, fringe = 0, lip = 0 } = o;
  m.grid(nu, nv, (u, v, out) => {
    const zig = fringe ? Math.abs(Math.sin(v * Math.PI * 6.5 + phase)) : 0;
    const t = clamp(u * (1 - round * v * v - fringe * zig * u), 0, 1) * K;
    const k = Math.min(K - 1, Math.floor(t)), f = t - k, tt = t / K;
    const a = A[k] + (A[k + 1] - A[k]) * f;
    const push = flare * v * v * tt * tt + lip * clamp((tt - 0.7) / 0.3, 0, 1) ** 2 + ruffle * tt * Math.sin(v * waves + phase); // ตั้งฉากผิวกลีบ ออกด้านนอก
    const r = R[k] + (R[k + 1] - R[k]) * f + Math.sin(a) * push;
    const y = Y[k] + (Y[k + 1] - Y[k]) * f - Math.cos(a) * push;
    const w = o.fan ? 1 : 0.45 + 0.55 * Math.sin(Math.min(1, tt * 1.25) * (Math.PI / 2));
    const th = o.az + (v * o.span * w) / 2;
    out.set(Math.cos(th) * r, y, Math.sin(th) * r);
  }, paint);
}

/* ---------- กลีบแบน (ทานตะวัน เยอบีร่า เดซี่ กลีบเลี้ยง) ---------- */
type Ray = {
  az: number; r0: number; y0: number; len: number;
  half: number; // ครึ่งความกว้างสูงสุด
  lift: number; droop: number; // เชิดขึ้นที่โคน / โค้งลงที่ปลาย (สัดส่วนของความยาว)
  cup?: number; // ร่องกลางกลีบ
  tip?: number; // 1 = ปลายแหลม, 0.45 = ปลายมน
  twist?: number;
};

function rayPetal(m: Mesher, o: Ray, nu: number, nv: number, paint: Paint) {
  const { cup = 0.5, tip = 1, twist = 0 } = o, ca = Math.cos(o.az), sa = Math.sin(o.az);
  m.grid(nu, nv, (u, v, out) => {
    const t = 0.05 + 0.95 * (1 - (1 - u) ** 1.8); // จุดถี่ขึ้นที่ปลายกลีบ ให้ปลายมนได้
    const w = o.half * Math.sin(Math.PI * t ** 0.75) ** tip;
    let s = v * w, h = cup * o.half * (v * v) * (w / o.half) ** 2;
    if (twist) { const c = Math.cos(twist * t), k = Math.sin(twist * t); [s, h] = [s * c - h * k, s * k + h * c]; }
    const rad = o.r0 + o.len * t;
    out.set(rad * ca - s * sa, o.y0 + o.len * (o.lift * t - o.droop * t * t) + h, rad * sa + s * ca);
  }, paint);
}

// แผ่นกลมนูน (เกสรกลางดอก / ฐานรองดอก): u = ระยะจากกลาง
function disc(m: Mesher, R: number, y0: number, h: number, rings: number, segs: number, paint: Paint, bump = 0) {
  m.grid(rings, segs, (u, v, out) => {
    const th = (v + 1) * Math.PI, b = bump * Math.sin(th * 21 + u * 26) * Math.sin(u * 40) * u;
    out.set(Math.cos(th) * R * u, y0 + h * (1 - u * u) + b, Math.sin(th) * R * u);
  }, paint);
}

const GREEN = col('#4f7d36'), GREEN_DARK = col('#35602a'), SAGE = col('#7aa08a');
const M4 = (x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
const greenPaint: Paint = (u, _v, out) => { out.copy(GREEN_DARK).lerp(GREEN, u); };

/* ---------- กุหลาบ ---------- */
function rose(hex: string) {
  const m = new Mesher(), c = col(hex), rnd = rng(11);
  const layers = [
    { n: 3, r0: 0.03, y0: 0.14, len: 0.88, a0: 1.52, a1: 1.42, span: 3.7, flare: 0, lip: 0.02 },
    { n: 4, r0: 0.07, y0: 0.1, len: 0.93, a0: 1.44, a1: 1.16, span: 2.7, flare: 0.04, lip: 0.05 },
    { n: 5, r0: 0.1, y0: 0.05, len: 0.96, a0: 1.32, a1: 0.82, span: 2.25, flare: 0.08, lip: 0.09 },
    { n: 5, r0: 0.12, y0: 0.02, len: 0.98, a0: 1.16, a1: 0.36, span: 2.05, flare: 0.12, lip: 0.12 },
    { n: 5, r0: 0.12, y0: 0, len: 0.96, a0: 0.98, a1: -0.15, span: 1.85, flare: 0.15, lip: 0.12 },
  ];
  layers.forEach((L, li) => {
    const depth = 1 - li / (layers.length - 1); // 1 = ใจกลางดอก
    const base = deep(c, 0.85), body = deep(c, 0.08 + 0.5 * depth), edge = light(c, 0.1);
    for (let i = 0; i < L.n; i++) {
      const tone = 0.92 + rnd() * 0.14; // แต่ละกลีบเข้ม-อ่อนต่างกันนิด ให้เห็นเป็นกลีบๆ
      wrapPetal(m, {
        az: (i / L.n) * TAU + li * 0.9 + (rnd() - 0.5) * 0.25, span: L.span, r0: L.r0, y0: L.y0,
        len: L.len * (0.94 + rnd() * 0.1), a0: L.a0, a1: L.a1 + (rnd() - 0.5) * 0.15, flare: L.flare, lip: L.lip, round: 0.24,
        ruffle: 0.014, waves: 5, phase: rnd() * 6,
      }, 9, 10, (u, v, out) => {
        const rim = Math.max(u ** 5, Math.abs(v) ** 5 * u); // ขอบกลีบสว่าง
        out.copy(base).lerp(body, Math.min(1, u / 0.5)).lerp(edge, rim * 0.7).multiplyScalar(tone);
      });
    }
  });
  // กลีบเลี้ยง + ฐานรองดอก
  for (let i = 0; i < 5; i++) rayPetal(m, { az: (i / 5) * TAU + 0.3, r0: 0.06, y0: 0.02, len: 0.55, half: 0.085, lift: -0.15, droop: 0.5, tip: 1.2 }, 5, 4, greenPaint);
  m.solid(new THREE.SphereGeometry(0.15, 10, 8), GREEN, M4(0, -0.06, 0, 1, 1.25, 1));
  return m.build();
}

/* ---------- ทานตะวัน ---------- */
function sunflower(hex: string) {
  const m = new Mesher(), c = col(hex), rnd = rng(23);
  const base = c.clone().lerp(col('#d9730b'), 0.55), tipC = light(c, 0.12);
  const paint: Paint = (u, v, out) => { out.copy(base).lerp(c, Math.min(1, u * 2.2)).lerp(tipC, u * u * 0.6).multiplyScalar(1 - 0.12 * (1 - v * v) * (1 - u)); };
  for (let layer = 0; layer < 2; layer++) {
    const n = 21;
    for (let i = 0; i < n; i++) {
      rayPetal(m, {
        az: ((i + layer * 0.5) / n) * TAU + (rnd() - 0.5) * 0.06, r0: 0.38 - layer * 0.02, y0: 0.04 - layer * 0.035,
        len: (layer ? 0.56 : 0.63) * (0.92 + rnd() * 0.14), half: 0.105, lift: 0.14 + (rnd() - 0.5) * 0.1, droop: 0.24,
        cup: 0.55, tip: 1.05, twist: (rnd() - 0.5) * 0.5,
      }, 5, 4, paint);
    }
  }
  const c0 = col('#6a5a1f'), c1 = col('#3a2311'), c2 = col('#8a5a17');
  disc(m, 0.45, 0.05, 0.075, 12, 48, (u, _v, out) => {
    if (u < 0.55) out.copy(c0).lerp(c1, clamp((u - 0.2) / 0.35, 0, 1));
    else out.copy(c1).lerp(c2, (u - 0.55) / 0.45);
  }, 0.016);
  // ฐานรองดอกสีเขียว + กลีบเลี้ยงด้านหลัง
  disc(m, 0.5, -0.19, 0.17, 4, 20, (u, _v, out) => { out.copy(GREEN_DARK).lerp(GREEN, u); });
  for (let i = 0; i < 16; i++) rayPetal(m, { az: (i / 16) * TAU, r0: 0.3, y0: -0.06, len: 0.4, half: 0.075, lift: -0.02, droop: 0.12, tip: 1.2 }, 3, 2, greenPaint);
  return m.build();
}

/* ---------- เยอบีร่า / เดซี่ ---------- */
function gerbera(hex: string) {
  const m = new Mesher(), c = col(hex), rnd = rng(37);
  const ring = (n: number, r0: number, y0: number, len: number, half: number, lift: number, droop: number, dark: number, off: number) => {
    const base = deep(c, 0.3 + dark), body = deep(c, dark), tipC = light(body, 0.14);
    for (let i = 0; i < n; i++) {
      const tone = 0.93 + rnd() * 0.12;
      rayPetal(m, {
        az: ((i + off) / n) * TAU + (rnd() - 0.5) * 0.05, r0, y0, len: len * (0.93 + rnd() * 0.12), half,
        lift: lift + (rnd() - 0.5) * 0.06, droop, cup: 0.45, tip: 0.42, twist: (rnd() - 0.5) * 0.3,
      }, 5, 4, (u, v, out) => { out.copy(base).lerp(body, Math.min(1, u * 2.5)).lerp(tipC, u * u * 0.7).multiplyScalar((1 - 0.14 * (1 - v * v)) * tone); });
    }
  };
  ring(24, 0.15, 0, 0.85, 0.09, 0.1, 0.18, 0, 0); // กลีบยาวชั้นนอก
  ring(24, 0.15, 0.035, 0.72, 0.084, 0.14, 0.16, 0.05, 0.5);
  ring(22, 0.14, 0.07, 0.38, 0.05, 0.42, 0.2, 0.14, 0.25); // กลีบสั้นรอบเกสร
  ring(18, 0.12, 0.09, 0.2, 0.03, 0.75, 0.25, 0.2, 0.6);
  const c0 = col('#9db53a'), c1 = col('#d9c23a'), c2 = deep(c, 0.25);
  disc(m, 0.2, 0.1, 0.05, 6, 24, (u, _v, out) => {
    if (u < 0.6) out.copy(c0).lerp(c1, u / 0.6);
    else out.copy(c1).lerp(c2, (u - 0.6) / 0.4);
  }, 0.02);
  disc(m, 0.3, -0.15, 0.14, 3, 16, (u, _v, out) => { out.copy(GREEN_DARK).lerp(GREEN, u); });
  return m.build();
}

function daisy(hex: string) {
  const m = new Mesher(), c = col(hex), rnd = rng(41);
  const base = c.clone().lerp(col('#b9c79a'), 0.55), shadeC = c.clone().multiplyScalar(0.9);
  for (let layer = 0; layer < 2; layer++) {
    const n = layer ? 13 : 21;
    for (let i = 0; i < n; i++) {
      rayPetal(m, {
        az: ((i + layer * 0.37) / n) * TAU + (rnd() - 0.5) * 0.08, r0: 0.24, y0: 0.03 - layer * 0.04,
        len: 0.76 * (0.92 + rnd() * 0.12), half: 0.105, lift: 0.08 + (rnd() - 0.5) * 0.08, droop: 0.12, cup: 0.4, tip: 0.42,
      }, 5, 4, (u, v, out) => { out.copy(base).lerp(layer ? shadeC : c, Math.min(1, u * 3)).multiplyScalar(1 - 0.08 * (1 - v * v)); });
    }
  }
  const y0 = col('#c98f12'), y1 = col('#f4c62a');
  disc(m, 0.3, 0.04, 0.15, 6, 24, (u, _v, out) => { out.copy(y1).lerp(y0, u * u); }, 0.02);
  disc(m, 0.3, -0.13, 0.12, 3, 16, (u, _v, out) => { out.copy(GREEN_DARK).lerp(GREEN, u); });
  return m.build();
}

/* ---------- คาร์เนชัน: กลีบพัดปลายหยัก ย่นเป็นระบาย ซ้อนเป็นพุ่มกลม ---------- */
function carnation(hex: string, colorId: string) {
  const m = new Mesher(), c = col(hex), rnd = rng(53);
  const picotee = colorId === 'white' ? col('#c2356f') : null; // ขาวขอบชมพู
  const layers = [
    { n: 5, pol: 0.2, len: 0.78 }, { n: 7, pol: 0.48, len: 0.86 }, { n: 9, pol: 0.78, len: 0.94 },
    { n: 11, pol: 1.08, len: 1.0 }, { n: 12, pol: 1.36, len: 1.0 },
  ];
  layers.forEach((L, li) => {
    const depth = 1 - li / (layers.length - 1);
    const base = deep(c, 0.5 + 0.2 * depth), body = deep(c, 0.22 * depth), edge = picotee ?? light(body, 0.16);
    for (let i = 0; i < L.n; i++) {
      wrapPetal(m, {
        az: (i / L.n) * TAU + li * 0.7 + (rnd() - 0.5) * 0.3, span: (TAU / L.n) * 1.55, r0: 0.03, y0: 0.02,
        len: L.len * (0.9 + rnd() * 0.16), a0: Math.PI / 2 - L.pol * 0.75, a1: Math.PI / 2 - L.pol - 0.45,
        round: 0.1, ruffle: 0.075, waves: 8 + li, phase: rnd() * 6, fringe: 0.1, fan: true,
      }, 6, 12, (u, v, out) => {
        out.copy(base).lerp(body, Math.min(1, u * 1.8));
        const e = clamp((u - (picotee ? 0.86 : 0.7)) / (picotee ? 0.14 : 0.3), 0, 1);
        out.lerp(edge, picotee ? e : e * 0.7).multiplyScalar(1 - 0.1 * Math.abs(Math.sin(v * 9)) * (1 - u));
      });
    }
  });
  // กระเปาะกลีบเลี้ยงยาว
  m.solid(new THREE.CylinderGeometry(0.17, 0.1, 0.6, 10, 1), SAGE, M4(0, -0.26, 0));
  return m.build();
}

/* ---------- ยิปโซ: กิ่งแตกแขนง ปลายเป็นดอกจิ๋วสีขาว ---------- */
function gypsophila(hex: string) {
  const m = new Mesher(), rnd = rng(71), white = col(hex), cream = col('#efece0'), bud = col('#c9d4ae'), stemC = col('#6f7f4c');
  const up = new THREE.Vector3(0, 1, 0);
  const sprig = (from: THREE.Vector3, dir: THREE.Vector3, len: number, level: number, thick: number) => {
    const end = from.clone().addScaledVector(dir, len);
    m.twig(from, end, thick, thick * 0.7, stemC);
    if (level === 0) {
      const big = rnd() > 0.22, r = big ? 0.07 + rnd() * 0.04 : 0.04;
      m.solid(new THREE.IcosahedronGeometry(r, big ? 1 : 0), big ? (rnd() > 0.5 ? white : cream) : bud, M4(end.x, end.y, end.z, 1, 0.8, 1));
      return;
    }
    const n = level === 2 ? 3 : 2 + Math.round(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() * 0.5, rnd() - 0.5).multiplyScalar(1.5)).normalize();
      sprig(end, d, len * (0.5 + rnd() * 0.25), level - 1, thick * 0.7);
    }
  };
  for (let i = 0; i < 9; i++) {
    const az = (i / 9) * TAU + rnd() * 0.5, lean = i === 0 ? 0.05 : 0.4 + rnd() * 0.5;
    const d = new THREE.Vector3(Math.cos(az) * lean, 1, Math.sin(az) * lean).normalize();
    sprig(new THREE.Vector3(0, 0.15 + rnd() * 0.25, 0), d, 0.42 + rnd() * 0.15, 2, 0.02);
  }
  m.twig(new THREE.Vector3(0, -0.1, 0), up.clone().multiplyScalar(0.45), 0.03, 0.022, stemC);
  return m.build();
}

/* ---------- สแตติส: ช่อกรวยกระดาษสีม่วง มีดอกจิ๋วสีขาวกลางกรวย ---------- */
function statice(hex: string, colorId: string) {
  const m = new Mesher(), rnd = rng(89), c = col(hex), stemC = col('#5f8c48');
  const rim = light(c, 0.2), dot = col(colorId === 'white' ? '#f1e39a' : '#ffffff');
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const funnel = (at: THREE.Vector3, dir: THREE.Vector3, s: number) => {
    q.setFromUnitVectors(up, dir);
    const mat = new THREE.Matrix4().compose(at, q, new THREE.Vector3(s, s, s));
    const base = deep(c, 0.35);
    m.grid(1, 7, (u, v, out) => {
      const th = (v + 1) * Math.PI, r = 0.25 + 0.75 * u;
      out.set(Math.cos(th) * r * 0.62, u, Math.sin(th) * r * 0.62).applyMatrix4(mat);
    }, (u, _v, out) => { out.copy(base).lerp(rim, u); });
    if (rnd() > 0.45) m.solid(new THREE.IcosahedronGeometry(0.3, 0), dot, new THREE.Matrix4().compose(at.clone().addScaledVector(dir, s * 0.95), q, new THREE.Vector3(s, s * 0.6, s)));
  };
  for (let i = 0; i < 6; i++) {
    const az = (i / 6) * TAU + rnd() * 0.6, lean = i === 0 ? 0.1 : 0.5 + rnd() * 0.35;
    const d = new THREE.Vector3(Math.cos(az) * lean, 1, Math.sin(az) * lean).normalize();
    const from = new THREE.Vector3(0, 0.1 + rnd() * 0.2, 0), tip = from.clone().addScaledVector(d, 0.6 + rnd() * 0.2);
    m.twig(from, tip, 0.035, 0.025, stemC);
    // ช่อดอกเรียงเป็นแผงโค้งที่ปลายกิ่ง
    const side = new THREE.Vector3(-d.z, 0, d.x).normalize();
    for (let k = 0; k < 11; k++) {
      const t = k / 10 - 0.5, row = k % 2 ? 0.07 : -0.07;
      const at = tip.clone().addScaledVector(side, t * 0.62).addScaledVector(d, 0.1 - t * t * 0.5 + rnd() * 0.06).addScaledVector(d.clone().cross(side), row);
      funnel(at, d.clone().addScaledVector(side, t * 0.9).add(new THREE.Vector3((rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3)).normalize(), 0.15 + rnd() * 0.05);
    }
  }
  m.twig(new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0, 0.35, 0), 0.045, 0.035, stemC);
  return m.build();
}

/* ---------- ตารางโมเดล ---------- */
type Model = {
  make: (hex: string, colorId: string) => THREE.BufferGeometry;
  sink: number; // โคนดอกอยู่หลังจุดกลางหัวดอกเท่าไร (หน่วย = รัศมีดอก)
  neck: number; // จุดต่อก้าน ต่ำกว่าโคนดอกเท่าไร
};
const MODELS: Record<string, Model> = {
  rose: { make: rose, sink: 0.45, neck: 0.15 },
  sunflower: { make: sunflower, sink: 0.05, neck: 0.16 },
  gerbera: { make: gerbera, sink: 0.05, neck: 0.12 },
  aster: { make: daisy, sink: 0.05, neck: 0.1 }, // คลัสเตอร์ = ช่อดอกเล็กทรงเดซี่
  carnation: { make: carnation, sink: 0.4, neck: 0.5 },
  gypsophila: { make: gypsophila, sink: 0.85, neck: 0.05 },
  caspia: { make: statice, sink: 0.75, neck: 0.05 }, // แคสเปีย ทรงพุ่มเดียวกับสแตติส
};

const cache = new Map<string, THREE.BufferGeometry>();

// โมเดลหัวดอก (สร้างครั้งเดียวต่อ ชนิด+สี แล้วใช้ซ้ำ) — ชนิดที่ยังไม่มีโมเดลใช้ทรงเยอบีร่าแทน
export function flowerModel(type: string, colorId: string, hex: string) {
  const model = MODELS[type] ?? MODELS.gerbera, key = `${type}|${colorId}`;
  let geometry = cache.get(key);
  if (!geometry) { geometry = model.make(hex, colorId); cache.set(key, geometry); }
  return { geometry, sink: model.sink, neck: model.neck };
}

export function disposeFlowerModels() {
  cache.forEach((g) => g.dispose());
  cache.clear();
}
