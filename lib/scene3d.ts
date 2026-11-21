import * as THREE from 'three';
import { FLOWERS, PAPERS, RIBBONS, sizeOf, type Design, type Item, type StemKind } from './catalog';
import { disposeFlowerModels, flowerModel } from './flowers3d';
import { shade, TONE, WIDTH } from './wrap';

/* โหมด 3D ของหน้าจัดช่อเอง (three.js) — ใช้ข้อมูลช่อชุดเดียวกับ 2D (x, y, r บนพื้นที่ 400×520)
   แปลงตำแหน่ง 2D → 3D: x = ซ้าย/ขวา, y = หลัง/หน้า (ยิ่งล่างยิ่งอยู่หน้า) แล้ววางหัวดอกบนโดมเหนือจุดรวบก้าน
   หน่วยในฉาก = px ของพื้นที่ 2D · จุดรวบก้าน (ริบบิ้น) อยู่ที่ (0, 0, 0) · +Z คือด้านหน้าช่อ
   ทุกชิ้นเป็นโมเดล 3D จริง หมุนดูได้รอบ: หัวดอก (lib/flowers3d.ts) ก้าน กระดาษ ริบบิ้น */

const CX = 200, CY = 195; // กลางพุ่มดอกบนพื้นที่ 2D
const DOME_TOP = 190, DOME_K = 0.0022, DOME_MIN = 70;
const HEAD = 40; // รัศมีหัวดอกที่ขนาด 1 (เท่ากับ lib/wrap.ts)
const NECK = 15; // รัศมีกระดาษตรงจุดรวบ
const REACH = 150; // ลากดอกใน 3D ได้ไกลสุดจากกลางช่อ
const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0), FRONT_AXIS = new THREE.Vector3(0, 0, 1);
const FORWARD = new THREE.Vector3(0, 0, 0.8); // หัวดอกเอนมาด้านหน้าช่อเท่าไร (0 = ชี้ตามก้านตรงๆ)

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const domeY = (X: number, Z: number) => Math.max(DOME_MIN, DOME_TOP - DOME_K * (X * X + Z * Z));
const to3d = (x: number, y: number) => new THREE.Vector3(x - CX, domeY(x - CX, y - CY), y - CY);

export type Scene3D = {
  update: (design: Design, selected: number | null) => void;
  stagePoint: (clientX: number, clientY: number) => { x: number; y: number } | null; // จุดบนโดม → พิกัด 2D
  resetView: () => void;
  dispose: () => void;
};
// readOnly = หน้าดูช่อของร้าน (/view): ลากตรงไหนก็หมุนกล้อง ไม่เลือก/ย้ายดอก
type Handlers = { onSelect: (id: number | null) => void; onMove: (id: number, x: number, y: number) => void; readOnly?: boolean };

/* ---------- textures ---------- */
function newsTexture(base: string) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let row = 0; row < 2; row++) {
    const y0 = row * 256;
    g.fillStyle = 'rgba(59,46,34,.62)';
    g.font = '700 26px Georgia, "Times New Roman", serif';
    g.fillText(['MEANWHILE', 'Original'][row], 14, y0 + 34);
    g.fillRect(14, y0 + 42, 484, 2);
    g.fillStyle = 'rgba(74,58,42,.38)';
    for (let col = 0; col < 4; col++) {
      for (let y = y0 + 54; y < y0 + 246; y += 7) {
        if (rnd() < 0.07) continue; // ขึ้นย่อหน้า
        g.fillRect(14 + col * 124, y, 110 * (rnd() < 0.12 ? 0.3 + rnd() * 0.5 : 1), 2.6);
      }
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// รอยยับกระดาษ (bump map): ริ้วแนวตั้ง (ตามแนวจีบที่ลากจากจุดรวบขึ้นขอบ) + จุดยับเล็กๆ
function crinkleTexture() {
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S, w = 1 + rnd() * 5, lean = (rnd() - 0.5) * 40, v = Math.round(60 + rnd() * 140);
    g.strokeStyle = `rgba(${v},${v},${v},${(0.25 + rnd() * 0.4).toFixed(2)})`;
    g.lineWidth = w;
    for (const dx of [-S, 0, S]) { // วาดซ้ำซ้าย/ขวา ให้ต่อกันไร้รอยต่อ
      g.beginPath();
      g.moveTo(x + dx, -10);
      g.quadraticCurveTo(x + dx + lean * 2, S / 2, x + dx + lean, S + 10);
      g.stroke();
    }
  }
  for (let i = 0; i < 260; i++) {
    const v = Math.round(rnd() * 255);
    g.fillStyle = `rgba(${v},${v},${v},.18)`;
    g.beginPath();
    g.ellipse(rnd() * S, rnd() * S, 2 + rnd() * 6, 6 + rnd() * 16, (rnd() - 0.5) * 0.6, 0, TAU);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function ringTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  g.strokeStyle = '#151412'; // Thermal ink
  g.lineWidth = 5;
  g.setLineDash([16, 12]);
  g.beginPath();
  g.arc(128, 128, 122, 0, TAU);
  g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- กระดาษห่อ: กรวยจากจุดรวบขึ้นไปถึงขอบ (ขอบหน้าเตี้ย ขอบหลังสูง) ---------- */
type Rim = { r: (th: number) => number; h: (th: number) => number };

// th = มุมรอบแกนตั้ง, 0 = ด้านหน้า (+Z)
// กรวยตรงจากจุดรวบ ลาดเท่าที่พอโอบดอกนอกสุด แล้วตัดขอบเฉียง: หน้าเตี้ย (เห็นดอก) หลังสูง (พนักกระดาษ)
// cone = ทรงกรวย: ลาดน้อยกว่า กระดาษแนบช่อ
function rimOf(items: Item[], cone = false): Rim {
  const heads = items.map((it) => {
    const p = to3d(it.x, it.y);
    return { p, r: HEAD * sizeOf(it.type), d: Math.hypot(p.x, p.z) };
  });
  const hFront = heads.length ? clamp(Math.min(...heads.map((h) => h.p.y - h.r * 0.5)) - 4, 62, 160) : 120;
  const hBack = heads.length ? Math.max(hFront + 50, Math.max(...heads.map((h) => h.p.y + h.r * 0.6)) + 14) : 200;
  const slope = cone ? 0.3 : clamp(Math.max(0, ...heads.map((h) => (h.d + h.r * 0.5 - NECK) / h.p.y)), 0.42, 1.05); // ดอกที่วางไกลมากจะโผล่พ้นกระดาษ แทนที่กระดาษจะบานตาม
  const back = (th: number) => (1 - Math.cos(th)) / 2; // 0 = หน้า, 1 = หลัง
  const h = (th: number) => hFront + (hBack - hFront) * smooth(0.3, 0.85, back(th)) + 5 * Math.sin(6 * th + 0.7) + 3 * Math.sin(11 * th);
  const wave = (th: number) => (1 + 0.1 * back(th)) * (1 + 0.035 * Math.sin(5 * th + 1.3));
  return { h, r: (th) => NECK + slope * h(th) * wave(th) };
}

// fold = ความลึกรอยจีบ (0 = เรียบ ใช้กับฟิล์มใส): ผิวกรวยเป็นลอนตามแนวรวบ ลึกขึ้นเมื่อไกลจากจุดรวบ
function coneGeometry(rim: Rim, grow = 1, lift = 0, fold = 1) {
  const pleat = (th: number) =>
    0.55 * Math.sin(13 * th + 0.4) + 0.3 * Math.sin(23 * th + 2.1) + 0.15 * Math.abs(Math.sin(7 * th + 1.2)) * 2 - 0.15;
  const N = 192, M = 8, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * TAU, R = rim.r(th) * grow, H = rim.h(th) + lift;
    for (let j = 0; j <= M; j++) {
      const k = j / M, rad = NECK + (R - NECK) * k + fold * pleat(th) * 6 * Math.pow(k, 0.8);
      pos.push(Math.sin(th) * rad, H * k, Math.cos(th) * rad);
      uv.push((i / N) * 4, (k * H) / 130);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + M + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------- scene ---------- */
export function createScene3D(canvas: HTMLCanvasElement, handlers: Handlers): Scene3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 400 / 520, 10, 5000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cedb, 2.3));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.2);
  sun.position.set(-260, 520, 420);
  scene.add(sun);

  const bouquet = new THREE.Group();
  scene.add(bouquet);

  const ringMap = ringTexture();
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringMap, depthTest: false, transparent: true }));
  ring.renderOrder = 30;
  ring.visible = false;
  scene.add(ring);

  let dirty = true;
  const invalidate = () => { dirty = true; };

  const petalMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); // ใช้ร่วมกันทุกดอก (สีอยู่ใน vertex)
  let news: [THREE.Texture, THREE.Texture] | null = null; // [ด้านนอก, ด้านใน]
  const crinkle = crinkleTexture();

  const stemMats = new Map<StemKind, THREE.Material>();
  const stemMat = (kind: StemKind) => {
    let m = stemMats.get(kind);
    if (!m) { m = new THREE.MeshLambertMaterial({ color: TONE[kind][1] }); stemMats.set(kind, m); }
    return m;
  };

  /* ----- สร้างช่อใหม่ทุกครั้งที่ข้อมูลช่อเปลี่ยน (ไม่เกิน 45 ดอก — เบามาก) ----- */
  let design: Design | null = null;
  let headsAt = new Map<number, { p: THREE.Vector3; size: number }>();
  const owned: { dispose: () => void }[] = []; // geometry/material ที่สร้างเฉพาะรอบนี้

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, ownMat = true) => {
    owned.push(g);
    if (ownMat) owned.push(m);
    const o = new THREE.Mesh(g, m);
    bouquet.add(o);
    return o;
  };

  function rebuild(d: Design) {
    bouquet.clear();
    owned.splice(0).forEach((o) => o.dispose());
    headsAt = new Map();

    const paper = PAPERS[d.paper] ?? PAPERS[0];
    const rb = (RIBBONS[d.ribbon] ?? RIBBONS[0])[1];
    const rim = rimOf(d.items, d.style === 'cone');

    // กระดาษ: กรวยบน + หางใต้ริบบิ้น
    const isNews = paper.kind === 'news';
    if (isNews && !news) {
      const out = newsTexture(paper.color), inn = out.clone();
      inn.repeat.x = -1; // ด้านในมองจากอีกฝั่ง → กลับซ้ายขวาให้ตัวหนังสือไม่กลับด้าน
      news = [out, inn];
    }
    const bump = { bumpMap: crinkle, bumpScale: 1.6 };
    const paperMat = new THREE.MeshLambertMaterial({ color: isNews ? '#ffffff' : paper.color, map: isNews ? news![0] : null, ...bump });
    const innerMat = new THREE.MeshLambertMaterial({ color: isNews ? '#efe9e2' : shade(paper.color, -0.07), map: isNews ? news![1] : null, side: THREE.BackSide, ...bump });
    const cone = coneGeometry(rim);
    mesh(cone, paperMat);
    bouquet.add(new THREE.Mesh(cone, innerMat));
    owned.push(innerMat);
    paperMat.side = THREE.FrontSide;
    const tailMat = new THREE.MeshLambertMaterial({ color: paperMat.color, map: paperMat.map, side: THREE.DoubleSide, ...bump });
    mesh(new THREE.CylinderGeometry(NECK, 27, 132, 40, 1, true), tailMat).position.y = -66;
    if (d.film) {
      // ห่อใส: วาดก่อนหัวดอก (ดอกไม่โดนฟิล์มขาวทับ) + เส้นขอบขาวให้เห็นว่ามีพลาสติก
      const cello = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
      mesh(coneGeometry(rim, 1.07, 20, 0.3), cello).renderOrder = -2;
      mesh(new THREE.CylinderGeometry(NECK + 3, 31, 138, 40, 1, true), cello, false).position.y = -69;
      const edge = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => {
        const th = (i / 96) * TAU, R = rim.r(th) * 1.07;
        return new THREE.Vector3(Math.sin(th) * R, rim.h(th) + 20, Math.cos(th) * R);
      }));
      const edgeMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 });
      owned.push(edge, edgeMat);
      const line = new THREE.LineLoop(edge, edgeMat);
      line.renderOrder = -1;
      bouquet.add(line);
    }

    // ริบบิ้น: แถบรัดรอบ + โบว์ด้านหน้า (ทรงเดียวกับโบว์ใน 2D ดันให้นูน) + หาง 2 เส้น
    const rbMat = new THREE.MeshLambertMaterial({ color: rb === '#ffffff' ? '#f1edf2' : rb }); // ขาวล้วนจะจมกับพื้นหลัง
    const band = mesh(new THREE.TorusGeometry(NECK + 1.5, 3, 10, 40), rbMat);
    band.rotation.x = Math.PI / 2;
    band.scale.z = 2; // แกน z ของวง = แนวตั้งหลังหมุน → แถบแบนสูงราว 12
    const bow = new THREE.Group();
    bow.position.set(0, 0, NECK + 11);
    bow.rotation.z = 0.1;
    bow.scale.setScalar(1.3);
    bouquet.add(bow);
    const puff = (shape: THREE.Shape) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.4, bevelSegments: 3, curveSegments: 18 });
      owned.push(g);
      const o = new THREE.Mesh(g, rbMat);
      bow.add(o);
      return o;
    };
    for (const k of [-1, 1]) {
      const loop = new THREE.Shape();
      loop.moveTo(0, 0);
      loop.bezierCurveTo(k * 12, 24, k * 50, 26, k * 48, 4);
      loop.bezierCurveTo(k * 46, -14, k * 16, -12, 0, 0);
      puff(loop).rotation.set(-0.18, k * 0.3, 0); // ปลายห่วงเอนไปด้านหลังเล็กน้อย
    }
    const tailL = new THREE.Shape();
    tailL.moveTo(-3, -3);
    tailL.bezierCurveTo(-12, -30, -34, -52, -26, -104);
    tailL.lineTo(-16, -101);
    tailL.bezierCurveTo(-22, -56, -2, -34, 4, -6);
    const tailR = new THREE.Shape();
    tailR.moveTo(3, -3);
    tailR.bezierCurveTo(16, -26, 40, -40, 38, -88);
    tailR.lineTo(28, -90);
    tailR.bezierCurveTo(28, -50, 10, -30, -3, -6);
    for (const t of [tailL, tailR]) {
      const o = puff(t);
      o.rotation.x = -0.07;
      o.position.z = -2;
    }
    const knot = mesh(new THREE.SphereGeometry(8, 18, 12), rbMat, false);
    bow.add(knot);
    knot.scale.set(1, 0.9, 0.6);
    knot.position.z = 3;

    // ดอกไม้: หัวดอก 3D หันออกตามแนวก้าน (เอนมาด้านหน้าช่อ) + ก้านโค้งจากจุดรวบไปต่อที่โคนดอก
    d.items.forEach((it) => {
      const f = FLOWERS[it.type];
      if (!f) return;
      const z = f.size, p = to3d(it.x, it.y), S = HEAD * z * 1.18;
      headsAt.set(it.id, { p, size: z });

      // ค่า "เอียง" ของดอก = เอนหัวดอกไปซ้าย/ขวา (เมื่อมองจากหน้าช่อ) เหมือนใน 2D
      const face = p.clone().normalize().add(FORWARD).normalize().applyAxisAngle(FRONT_AXIS, (-it.r * Math.PI) / 180);
      const model = flowerModel(it.type, it.color, f.colors.find((c) => c.id === it.color)?.hex ?? f.colors[0].hex);
      const base = p.clone().addScaledVector(face, -model.sink * S);
      const head = new THREE.Mesh(model.geometry, petalMat);
      head.position.copy(base);
      head.scale.setScalar(S);
      // หมุนรอบแกนดอกไม่เท่ากันแต่ละดอก ดอกชนิดเดียวกันจะได้ไม่เหมือนกันเป๊ะ
      head.quaternion.setFromUnitVectors(UP, face).multiply(new THREE.Quaternion().setFromAxisAngle(UP, it.id * 2.399));
      bouquet.add(head);

      const top = base.clone().addScaledVector(face, -model.neck * S);
      const curve = new THREE.CatmullRomCurve3([
        top,
        top.clone().addScaledVector(face, -0.45 * S), // คอดอก: ก้านเข้าหาโคนดอกจากด้านหลัง
        new THREE.Vector3(p.x * 0.42, p.y * 0.5, p.z * 0.42), // โค้งเข้าแกนกลางเล็กน้อย
        new THREE.Vector3(p.x * 0.05, 4, p.z * 0.05),
        new THREE.Vector3(p.x * 0.1, -128, p.z * 0.1),
      ]);
      mesh(new THREE.TubeGeometry(curve, 22, (WIDTH[f.stem] * Math.max(0.8, z)) / 2, 6), stemMat(f.stem), false);
    });
  }

  /* ----- กล้อง: หมุนรอบช่อ ----- */
  const HOME = { az: 0.38, el: 0.45 };
  const view = { az: HOME.az, el: HOME.el, zoom: 1 };
  const target = new THREE.Vector3(0, 56, 0);

  function placeCamera() {
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(440 / (2 * half), 400 / (2 * half * camera.aspect)) / view.zoom;
    camera.position.set(
      target.x + dist * Math.cos(view.el) * Math.sin(view.az),
      target.y + dist * Math.sin(view.el),
      target.z + dist * Math.cos(view.el) * Math.cos(view.az),
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // เปิดมาหมุนเข้าหามุมเริ่มต้นเล็กน้อย ให้รู้ว่าหมุนดูได้
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let anim: { from: number; fromEl: number; t0: number; ms: number } | null = null;
  const glideHome = (fromAz: number, fromEl: number, ms: number) => {
    if (still) { view.az = HOME.az; view.el = HOME.el; anim = null; invalidate(); return; }
    anim = { from: fromAz, fromEl, t0: performance.now(), ms };
  };
  glideHome(HOME.az - 1.1, HOME.el + 0.25, 1100);

  /* ----- ชี้/ลาก ----- */
  const ray = new THREE.Raycaster();
  const ndc = (cx: number, cy: number) => {
    const b = canvas.getBoundingClientRect();
    return new THREE.Vector2(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1);
  };

  // รังสีจากกล้องตัดกับโดมที่หัวดอกวางอยู่ → พิกัด 2D ของพื้นที่จัดช่อ
  function stagePoint(cx: number, cy: number) {
    ray.setFromCamera(ndc(cx, cy), camera);
    const o = ray.ray.origin, v = ray.ray.direction;
    const a = DOME_K * (v.x * v.x + v.z * v.z);
    const b = DOME_K * 2 * (o.x * v.x + o.z * v.z) + v.y;
    const c = DOME_K * (o.x * o.x + o.z * o.z) + o.y - DOME_TOP;
    let t = -1;
    if (a < 1e-9) t = -c / b;
    else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) t = (-b - Math.sqrt(disc)) / (2 * a);
    }
    // นอกโดม (หรือชี้ต่ำกว่าขอบโดม) → ใช้ระนาบขอบโดมแทน
    if ((t <= 0 || o.y + v.y * t < DOME_MIN) && v.y < 0) t = (DOME_MIN - o.y) / v.y;
    const flat = Math.hypot(v.x, v.z);
    if (!(t > 0) && flat < 1e-6) return null;
    // ชี้เลยขอบช่อ (หรือเลยยอดโดมขึ้นฟ้า) → ตรึงไว้ที่ขอบช่อในทิศนั้น ดอกจะไม่กระโดดไปไกล
    let X = t > 0 ? o.x + v.x * t : (v.x / flat) * REACH, Z = t > 0 ? o.z + v.z * t : (v.z / flat) * REACH;
    const d = Math.hypot(X, Z);
    if (d > REACH) { X *= REACH / d; Z *= REACH / d; }
    return { x: Math.round(clamp(X + CX, 20, 380)), y: Math.round(clamp(Z + CY, 20, 480)) };
  }

  // ดอกที่อยู่ใต้นิ้ว/เมาส์ (เลือกดอกที่ใกล้กล้องที่สุด)
  function pick(cx: number, cy: number): number | null {
    const b = canvas.getBoundingClientRect();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const px = (v: THREE.Vector3) => { const q = v.clone().project(camera); return { x: b.left + ((q.x + 1) / 2) * b.width, y: b.top + ((1 - q.y) / 2) * b.height }; };
    let best: number | null = null, bestDist = Infinity;
    headsAt.forEach(({ p, size }, id) => {
      const c0 = px(p), edge = px(p.clone().addScaledVector(right, 42 * size));
      if (Math.hypot(cx - c0.x, cy - c0.y) > Math.hypot(edge.x - c0.x, edge.y - c0.y)) return;
      const dist = camera.position.distanceTo(p);
      if (dist < bestDist) { bestDist = dist; best = id; }
    });
    return best;
  }

  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { id: number; dx: number; dy: number } | null = null;
  let orbit: { x: number; y: number; moved: boolean } | null = null;
  let pinch = 0;

  const onDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    anim = null;
    if (pointers.size === 2) { // สองนิ้ว = ซูม
      const [p1, p2] = [...pointers.values()];
      pinch = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      drag = null; orbit = null;
      return;
    }
    const id = handlers.readOnly ? null : pick(e.clientX, e.clientY);
    if (id !== null && design) {
      const it = design.items.find((x) => x.id === id)!;
      const hit = stagePoint(e.clientX, e.clientY);
      drag = { id, dx: hit ? it.x - hit.x : 0, dy: hit ? it.y - hit.y : 0 };
      handlers.onSelect(id);
    } else {
      orbit = { x: e.clientX, y: e.clientY, moved: false };
    }
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) { canvas.style.cursor = !handlers.readOnly && pick(e.clientX, e.clientY) !== null ? 'grab' : ''; return; }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const [p1, p2] = [...pointers.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      view.zoom = clamp((view.zoom * dist) / pinch, 0.6, 2.2);
      pinch = dist;
      invalidate();
    } else if (drag) {
      const hit = stagePoint(e.clientX, e.clientY);
      if (hit) handlers.onMove(drag.id, Math.round(clamp(hit.x + drag.dx, 20, 380)), Math.round(clamp(hit.y + drag.dy, 20, 480)));
    } else if (orbit) {
      const dx = e.clientX - orbit.x, dy = e.clientY - orbit.y;
      if (!orbit.moved && Math.hypot(dx, dy) < 4) return;
      orbit = { x: e.clientX, y: e.clientY, moved: true };
      view.az -= dx * 0.008;
      view.el = clamp(view.el + dy * 0.006, 0.06, 1.45);
      invalidate();
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (orbit && !orbit.moved && e.type === 'pointerup') handlers.onSelect(null); // แตะที่ว่าง = เลิกเลือก
    drag = null; orbit = null; pinch = 0;
  };
  // ซูม: บีบนิ้วบนทัชแพด / Ctrl+ล้อเมาส์ (ล้อเมาส์เฉยๆ ยังเลื่อนหน้าได้ตามปกติ)
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    view.zoom = clamp(view.zoom * Math.exp(-e.deltaY * 0.01), 0.6, 2.2);
    invalidate();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  /* ----- render เฉพาะตอนมีอะไรเปลี่ยน ----- */
  let selected: number | null = null;
  let raf = requestAnimationFrame(function frame(now) {
    raf = requestAnimationFrame(frame);
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.ms), e = 1 - (1 - k) ** 3;
      view.az = anim.from + (HOME.az - anim.from) * e;
      view.el = anim.fromEl + (HOME.el - anim.fromEl) * e;
      if (k >= 1) anim = null;
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    placeCamera();
    const sel = selected !== null ? headsAt.get(selected) : undefined;
    ring.visible = !!sel;
    if (sel) { ring.position.copy(sel.p); ring.scale.setScalar(112 * sel.size); }
    renderer.render(scene, camera);
  });
  placeCamera();

  return {
    update(d, sel) {
      if (d !== design) { design = d; rebuild(d); }
      selected = sel;
      invalidate();
    },
    stagePoint,
    resetView() {
      view.zoom = 1;
      // หมุนกลับทางที่ใกล้ที่สุด
      const turns = Math.round((view.az - HOME.az) / TAU);
      glideHome(view.az - turns * TAU, view.el, 500);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      bouquet.clear();
      owned.splice(0).forEach((o) => o.dispose());
      stemMats.forEach((m) => m.dispose());
      petalMat.dispose();
      disposeFlowerModels();
      news?.forEach((t) => t.dispose());
      crinkle.dispose();
      ringMap.dispose();
      ring.material.dispose();
      renderer.dispose();
    },
  };
}
