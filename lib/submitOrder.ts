import type { CartLine, ResolvedLine } from './cart';
import { designToImage } from './exportImage';
import { shrinkImage } from './image';
import type { OrderRequest, OrderResponse } from './order';

type Input = { name: string; phone: string; ig: string; pickup: string; film: boolean; lines: CartLine[]; resolved: ResolvedLine[]; slip: File };

// ส่งออเดอร์ไป /api/order (server ตรวจซ้ำและคำนวณยอดเอง) — คืนเลขออเดอร์ หรือ throw ข้อความที่แสดงให้ลูกค้าได้
export async function submitOrder({ resolved, slip, ...rest }: Input): Promise<string> {
  // วาดรูปทีละช่อ (มือถือไม่ค้าง) — รายการละหนึ่งรูป ไม่ใช่ช่อละรูป
  const designs: string[] = [];
  for (const r of resolved) designs.push(await designToImage(r.design));
  const body: OrderRequest = { ...rest, designs, slip: await shrinkImage(slip) };

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
