/**
 * รับออเดอร์ Pre-order วันลอยกระทง → บันทึกลง Google Sheet + เก็บสลิปใน Google Drive
 * (รูปช่อ = ลิงก์เปิดดูช่อแบบ 3D บนเว็บ ไม่ได้เก็บเป็นไฟล์)
 *
 * ติดตั้ง (ทำครั้งเดียว):
 * 1. สร้าง Google Sheet ใหม่ (ด้วยบัญชีร้าน) → เมนู Extensions → Apps Script → วางโค้ดนี้ทั้งไฟล์ → Save
 * 2. ตั้งรหัสลับ: Project Settings (รูปเฟือง) → Script Properties → Add script property
 *    Property = ORDER_SECRET, Value = ค่าเดียวกับ ORDER_SECRET ใน .env.local / Vercel
 *    (ไม่ตั้ง = รับทุกออเดอร์ ใครรู้ URL ก็ยิงเข้า Sheet ได้ — ตั้งไว้เสมอ)
 * 3. กลับหน้า Editor → เลือกฟังก์ชัน setup ในแถบด้านบน → Run → Authorize
 *    setup จะสร้างแท็บ + หัวตาราง และโฟลเดอร์เก็บสลิปไว้ข้าง Sheet ให้เอง แล้วบอกผลใน Execution log
 *    (ไม่รัน setup ก็ได้ — ออเดอร์แรกจะสร้างโฟลเดอร์ให้เอง แต่รันไว้จะได้เช็กว่าตั้งค่าครบ)
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me   - Who has access: Anyone
 *    กด Authorize แล้วคัดลอก Web app URL (ลงท้าย /exec)
 * 5. ใส่ URL ที่ APPS_SCRIPT_URL ใน .env.local และ Vercel (หน้าเว็บส่งออเดอร์ผ่าน /api/order ของเรา ไม่ได้ยิงมาที่นี่ตรงๆ)
 * แก้โค้ดนี้ทีหลัง ต้อง Deploy → Manage deployments → Edit → New version (URL เดิม)
 */

const SHEET_NAME = 'ลอยกระทง';
// โฟลเดอร์เก็บสลิป — สร้างอัตโนมัติข้าง Sheet แล้วจำ id ไว้ใน Script Property "FOLDER_ID"
// (อยากใช้โฟลเดอร์ที่มีอยู่แล้ว: ใส่ id จาก URL drive.google.com/drive/folders/<id> ใน Script Property FOLDER_ID เอง)
const FOLDER_NAME = 'freakyflower — สลิปและรูปช่อ (ลอยกระทง)';
// เวลารับช่อ (วันที่ 24 พ.ย. วันเดียว) — ต้องตรงกับ PICKUP ใน lib/catalog.ts
const PICKUP_FROM = '14:00';
const PICKUP_TO = '21:30';
// ถ้ามี Sheet เดิมอยู่แล้ว: แทรกคอลัมน์ "เวลารับ" หลัง Instagram เองก่อน (หัวตารางสร้างอัตโนมัติเฉพาะ Sheet ว่าง)
const MAX_DESIGNS = 8; // = CONFIG.maxLines ใน lib/catalog.ts
const HEADERS = ['เลขออเดอร์', 'เวลา', 'ชื่อ', 'เบอร์โทร', 'Instagram', 'เวลารับ (24 พ.ย.)', 'ช่อ', 'ยอด (บาท)', 'รูปช่อ', 'สลิป', 'สถานะ'];
const DESIGN_COL = HEADERS.indexOf('รูปช่อ') + 1;

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('ORDER_SECRET');
    if (secret && d.secret !== secret) throw new Error('unauthorized');
    const name = String(d.name || '').trim().slice(0, 100);
    const phone = String(d.phone || '').replace(/[\s-]/g, '');
    const ig = String(d.ig || '').trim().replace(/^@+/, '').slice(0, 60);
    const pickup = String(d.pickup || '').trim();
    const bouquet = String(d.bouquet || '').slice(0, 4000);
    const count = Math.max(1, Number(d.count) || 1);
    const total = Number(d.total) || 0;
    const slip = parseImage(d.slip);
    // รูปช่อ: ลิงก์ดูช่อ 3D รายการละลิงก์ (server ของเว็บสร้างให้)
    const views = (Array.isArray(d.views) ? d.views : []).slice(0, MAX_DESIGNS).map(String)
      .filter((u) => /^https?:\/\/[^\s]+\/view#[A-Za-z0-9_-]+$/.test(u));
    if (!name) throw new Error('missing name');
    if (!/^0\d{8,9}$/.test(phone)) throw new Error('invalid phone');
    if (!/^\d{2}:\d{2}$/.test(pickup) || pickup < PICKUP_FROM || pickup > PICKUP_TO) throw new Error('invalid pickup time');
    if (!slip) throw new Error('missing slip');

    // จองแถว + เลขออเดอร์ใต้ lock สั้นๆ แล้วค่อยเซฟไฟล์ (เซฟหลายรูปใช้เวลา ไม่ให้ออเดอร์อื่นรอ lock นาน)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    let row, orderNo, folder;
    try {
      ensureHeaders(sh);
      folder = orderFolder();
      orderNo = 'LK-' + String(sh.getLastRow()).padStart(3, '0');
      sh.appendRow([orderNo, new Date(), '', '', '', '', '', '', '', '', 'กำลังบันทึก']);
      row = sh.getLastRow();
    } finally {
      lock.releaseLock();
    }

    const save = (img, suffix) => folder.createFile(Utilities.newBlob(Utilities.base64Decode(img.data), img.type, orderNo + '-' + suffix)).getUrl();
    const slipUrl = save(slip, 'slip');

    sh.getRange(row, 3, 1, 9).setValues([[safe(name), "'" + phone, ig ? '@' + safe(ig) : '', pickup + ' น.', safe(count + ' ช่อ\n' + bouquet), total, '', slipUrl, 'รอตรวจสลิป']]);
    if (views.length) sh.getRange(row, DESIGN_COL).setRichTextValue(linkLines(views));
    return json({ ok: true, orderNo: orderNo });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

// รันครั้งเดียวจาก Editor (เลือก setup → Run): สร้างแท็บ/หัวตาราง/โฟลเดอร์ + ขอสิทธิ์ + เช็กรหัสลับ
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureHeaders(sh);
  const folder = orderFolder();
  const hasSecret = !!PropertiesService.getScriptProperties().getProperty('ORDER_SECRET');
  Logger.log('แท็บ "' + SHEET_NAME + '" พร้อมแล้ว');
  Logger.log('โฟลเดอร์เก็บรูป: ' + folder.getName() + ' → ' + folder.getUrl());
  Logger.log(hasSecret ? 'ORDER_SECRET ตั้งแล้ว ✓ ต่อไป Deploy → New deployment → Web app' : '⚠️ ยังไม่ได้ตั้ง ORDER_SECRET — Project Settings → Script Properties');
}

function ensureHeaders(sh) {
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS).setFrozenRows(1);
}

// หนึ่งเซลล์ หลายลิงก์ บรรทัดละช่อ (เรียงตามรายการในคอลัมน์ "ช่อ") — กดแล้วเปิดหน้าดู 3D
function linkLines(urls) {
  const rt = SpreadsheetApp.newRichTextValue().setText(urls.join('\n'));
  let at = 0;
  urls.forEach((u) => { rt.setLinkUrl(at, at + u.length, u); at += u.length + 1; });
  return rt.build();
}

// โฟลเดอร์เก็บรูป: ใช้ id ที่จำไว้ ถ้าไม่มี/ถูกลบไปแล้ว → สร้างใหม่ข้าง Sheet (เรียกใต้ lock กันสร้างซ้ำ)
function orderFolder() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (err) { /* ไม่มีแล้ว / ไม่มีสิทธิ์ → สร้างใหม่ */ }
  }
  const parents = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const folder = parent.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
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
