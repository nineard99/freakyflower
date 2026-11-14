/**
 * รับออเดอร์ Pre-order วันลอยกระทง → บันทึกลง Google Sheet + เก็บรูปช่อและสลิปใน Google Drive
 *
 * ติดตั้ง (ทำครั้งเดียว):
 * 1. สร้าง Google Sheet ใหม่ → เมนู Extensions → Apps Script → วางโค้ดนี้ทั้งไฟล์
 * 2. (แนะนำ) สร้างโฟลเดอร์ใน Drive สำหรับสลิป แล้วเอา id จาก URL มาใส่ FOLDER_ID
 *    เช่น drive.google.com/drive/folders/<FOLDER_ID>
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me   - Who has access: Anyone
 *    กด Authorize แล้วคัดลอก Web app URL (ลงท้าย /exec)
 * 4. ใส่ URL ที่ LOYKRATHONG.endpoint ใน lib/catalog.ts
 * แก้โค้ดนี้ทีหลัง ต้อง Deploy → Manage deployments → Edit → New version (URL เดิม)
 */

const SHEET_NAME = 'ลอยกระทง';
const FOLDER_ID = ''; // ว่าง = เก็บที่ My Drive
// เวลารับช่อ (วันที่ 24 พ.ย. วันเดียว) — ต้องตรงกับ PICKUP ใน lib/catalog.ts
const PICKUP_FROM = '14:00';
const PICKUP_TO = '21:30';
// ถ้ามี Sheet เดิมอยู่แล้ว: แทรกคอลัมน์ "เวลารับ" หลัง Instagram เองก่อน (หัวตารางสร้างอัตโนมัติเฉพาะ Sheet ว่าง)
const HEADERS = ['เลขออเดอร์', 'เวลา', 'ชื่อ', 'เบอร์โทร', 'Instagram', 'เวลารับ (24 พ.ย.)', 'ช่อ', 'ยอด (บาท)', 'รูปช่อ', 'สลิป', 'สถานะ'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const name = String(d.name || '').trim().slice(0, 100);
    const phone = String(d.phone || '').replace(/[\s-]/g, '');
    const ig = String(d.ig || '').trim().replace(/^@+/, '').slice(0, 60);
    const pickup = String(d.pickup || '').trim();
    const bouquet = String(d.bouquet || '').slice(0, 2000);
    const total = Number(d.total) || 0;
    const slip = parseImage(d.slip);
    const design = parseImage(d.design);
    if (!name) throw new Error('missing name');
    if (!/^0\d{8,9}$/.test(phone)) throw new Error('invalid phone');
    if (!/^\d{2}:\d{2}$/.test(pickup) || pickup < PICKUP_FROM || pickup > PICKUP_TO) throw new Error('invalid pickup time');
    if (!slip) throw new Error('missing slip');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS).setFrozenRows(1);

    const orderNo = 'LK-' + String(sh.getLastRow()).padStart(3, '0');
    const folder = FOLDER_ID ? DriveApp.getFolderById(FOLDER_ID) : DriveApp.getRootFolder();
    const save = (img, suffix) => folder.createFile(Utilities.newBlob(Utilities.base64Decode(img.data), img.type, orderNo + '-' + suffix)).getUrl();
    const slipUrl = save(slip, 'slip');
    const designUrl = design ? save(design, 'bouquet') : '';

    sh.appendRow([orderNo, new Date(), safe(name), "'" + phone, ig ? '@' + safe(ig) : '', pickup + ' น.', safe(bouquet), total, designUrl, slipUrl, 'รอตรวจสลิป']);
    return json({ ok: true, orderNo: orderNo });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// data URL รูป → { type, data } (รับเฉพาะ jpeg/png/webp)
function parseImage(s) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s || '');
  return m ? { type: m[1], data: m[2] } : null;
}

// กันข้อความที่ขึ้นต้นด้วย = + - @ ถูกตีความเป็นสูตรใน Sheet
function safe(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
