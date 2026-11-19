import { sanitizeDesign } from './cart';
import { toWrapStyle, type Design } from './catalog';

/* ลิงก์ดูช่อแบบ 3D สำหรับร้าน (หน้า /view#<code>) — ฝังข้อมูลช่อทั้งช่อไว้ในลิงก์เลย ไม่ต้องเก็บไฟล์ที่ไหน
   code = JSON แบบย่อ → deflate-raw → base64url (CompressionStream มีทั้งใน Node 18+ และเบราว์เซอร์)
   อยู่หลัง # → ไม่ถูกส่งไป server / ไม่ติด log */

export type SharedBouquet = { name: string; qty: number; design: Design };

// [ชื่อ, จำนวน, กระดาษ, ริบบิ้น, ฟิล์ม 0/1, [[ชนิด, สี, x, y, องศา], ...], ทรงการห่อ (ลิงก์รุ่นเก่าไม่มี = ทรงบาน)]
type Packed = [string, number, number, number, 0 | 1, [string, string, number, number, number][], string?];

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const toB64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function encodeBouquet({ name, qty, design: d }: SharedBouquet): Promise<string> {
  const packed: Packed = [name, qty, d.paper, d.ribbon, d.film ? 1 : 0,
    d.items.map((it) => [it.type, it.color, Math.round(it.x), Math.round(it.y), Math.round(it.r)]), toWrapStyle(d.style)];
  return toB64url(await pipe(new TextEncoder().encode(JSON.stringify(packed)), new CompressionStream('deflate-raw')));
}

// ลิงก์พัง/ถูกแก้ → null (ข้อมูลผ่าน sanitizeDesign เสมอ ชนิด/สีที่ไม่มีในร้านถูกตัดทิ้ง)
export async function decodeBouquet(code: string): Promise<SharedBouquet | null> {
  try {
    const json = new TextDecoder().decode(await pipe(fromB64url(code), new DecompressionStream('deflate-raw')));
    const [name, qty, paper, ribbon, film, items, style] = JSON.parse(json) as Packed;
    const design = sanitizeDesign({
      paper, ribbon,
      items: items.map(([type, color, x, y, r], id) => ({ id, type: String(type), color: String(color), x: Number(x) || 0, y: Number(y) || 0, r: Number(r) || 0 })),
    });
    return { name: String(name).slice(0, 60), qty: Math.max(1, Number(qty) || 1), design: { ...design, film: film === 1, style: toWrapStyle(style) } };
  } catch {
    return null;
  }
}
