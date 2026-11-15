import { MAX_BODY, validateOrder, type OrderResponse } from '@/lib/order';

// รับออเดอร์จากหน้าเว็บ → ตรวจ + คำนวณยอดใหม่ฝั่ง server → ส่งต่อ Google Apps Script (URL และรหัสลับอยู่ใน env ไม่หลุดไปหน้าเว็บ)
// Apps Script เซฟรูปลง Drive หลายรูปใช้เวลาหลายวินาที
export const maxDuration = 60;

const reply = (body: OrderResponse, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.ORDER_SECRET;
  if (!url || !secret) {
    console.error('[order] APPS_SCRIPT_URL / ORDER_SECRET ยังไม่ได้ตั้งค่า');
    return reply({ ok: false, error: 'ร้านยังไม่ได้ตั้งค่าระบบรับออเดอร์ ติดต่อร้านทาง LINE ได้เลย' }, 503);
  }

  const text = await request.text();
  if (text.length > MAX_BODY) return reply({ ok: false, error: 'รูปใหญ่เกินไป ลองแนบสลิปใหม่' }, 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return reply({ ok: false, error: 'ข้อมูลออเดอร์ไม่ถูกต้อง' }, 400); }

  const v = validateOrder(body);
  if ('error' in v) return reply({ ok: false, error: v.error }, 400);

  try {
    // Apps Script ตอบกลับด้วย redirect ไป googleusercontent — fetch ตาม redirect ให้เอง
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...v.order, secret }),
      redirect: 'follow',
      cache: 'no-store',
    });
    const data = (await res.json()) as { ok?: boolean; orderNo?: string; error?: string };
    if (!data.ok || !data.orderNo) {
      console.error('[order] Apps Script ปฏิเสธ:', data.error);
      return reply({ ok: false, error: 'บันทึกออเดอร์ไม่สำเร็จ ลองใหม่อีกครั้ง หรือส่งรูปสลิปให้ร้านทาง LINE' }, 502);
    }
    return reply({ ok: true, orderNo: data.orderNo });
  } catch (err) {
    console.error('[order] ส่งไป Apps Script ไม่สำเร็จ:', err);
    return reply({ ok: false, error: 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือส่งรูปสลิปให้ร้านทาง LINE' }, 502);
  }
}
