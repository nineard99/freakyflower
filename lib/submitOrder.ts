import { shrinkImage } from './image';
import type { OrderRequest, OrderResponse } from './order';

type Input = Omit<OrderRequest, 'slip'> & { slip: File };

// ส่งไม่สำเร็จ — message แสดงให้ลูกค้าได้ · code 'queue' = คิวมัดเพิ่งเต็ม ต้องกลับไปเลือกใหม่
export class OrderError extends Error {
  constructor(message: string, public code?: 'queue') { super(message); }
}

// ส่งออเดอร์ไป /api/order (server ตรวจซ้ำและคำนวณยอดเอง) — คืนเลขออเดอร์ หรือ throw OrderError
// รูปช่อไม่ต้องส่ง — server สร้างลิงก์ดูช่อ 3D จากรายการช่อเอง
export async function submitOrder({ slip, ...rest }: Input): Promise<string> {
  const body: OrderRequest = { ...rest, slip: await shrinkImage(slip) };

  let data: OrderResponse;
  try {
    const res = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    data = await res.json();
  } catch {
    throw new OrderError('ส่งไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองใหม่ หรือส่งรูปสลิปให้ร้านทาง LINE');
  }
  if (!data.ok) throw new OrderError(data.error, data.code);
  return data.orderNo;
}

// คิวมัดพวงมาลัยที่ถูกจองไปแล้ว — โหลดไม่ได้ก็คืน [] (server เช็กซ้ำตอนส่งอยู่แล้ว)
export async function fetchTakenQueue(): Promise<string[]> {
  try {
    const res = await fetch('/api/queue', { cache: 'no-store' });
    const data = (await res.json()) as { taken?: unknown };
    return Array.isArray(data.taken) ? data.taken.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}
