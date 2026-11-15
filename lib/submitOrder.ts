import type { CartLine } from './cart';
import { shrinkImage } from './image';
import type { OrderRequest, OrderResponse } from './order';

type Input = { name: string; phone: string; ig: string; pickup: string; film: boolean; lines: CartLine[]; slip: File };

// ส่งออเดอร์ไป /api/order (server ตรวจซ้ำและคำนวณยอดเอง) — คืนเลขออเดอร์ หรือ throw ข้อความที่แสดงให้ลูกค้าได้
// รูปช่อไม่ต้องส่ง — server สร้างลิงก์ดูช่อ 3D จากรายการช่อเอง
export async function submitOrder({ slip, ...rest }: Input): Promise<string> {
  const body: OrderRequest = { ...rest, slip: await shrinkImage(slip) };

  let data: OrderResponse;
  try {
    const res = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    data = await res.json();
  } catch {
    throw new Error('ส่งไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองใหม่ หรือส่งรูปสลิปให้ร้านทาง LINE');
  }
  if (!data.ok) throw new Error(data.error);
  return data.orderNo;
}
