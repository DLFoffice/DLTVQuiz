// เชื่อมต่อ Google Apps Script API (ถ้ายังไม่ตั้ง API_URL ใน config.js จะใช้โหมดทดลอง)
const CFG = window.DLTV_CONFIG || {};
export const DEMO = !CFG.API_URL;

// ข้อคำถาม (ไม่มีเฉลย — เฉลยอยู่ใน GAS ฝั่งเซิร์ฟเวอร์)
// โหลดจากไฟล์นี้โดยตรงเพื่อลดภาระ GAS — ถ้าแก้ข้อคำถาม ต้องแก้ทั้งที่นี่และใน Code.gs ให้ตรงกัน
const QUIZ = {
 "passScore": 10,
 "groups": [
  "นักเรียน/นักศึกษา",
  "ครู/บุคลากรทางการศึกษา",
  "ผู้ปกครอง/บุคคลทั่วไป"
 ],
 "questions": [
  {
   "id": 1,
   "question": "พระราชปณิธานของในหลวง รัชกาลที่ ๙ ในการจัดตั้งมูลนิธิการศึกษาทางไกลผ่านดาวเทียม ในพระบรมราชูปถัมภ์ (ซึ่งตรงกับวัตถุประสงค์ของมูลนิธิ ฯ) คืออะไร ?",
   "choices": [
    "ลดความเหลื่อมล้ำทางการศึกษา",
    "แก้ปัญหาขาดแคลนครู",
    "แก้ปัญหาครูไม่ครบชั้น ครูสอนไม่ตรงสาขาวิชา",
    "ถูกทุกข้อ"
   ]
  },
  {
   "id": 2,
   "question": "ในหลวงรัชกาลที่ 9 ทรงพระกรุณาโปรดเกล้า ฯ ให้เชิญตราสัญลักษณ์เนื่องในโอกาสใดให้เป็นเครื่องหมายของมูลนิธิ ฯ",
   "choices": [
    "งานฉลองสิริราชสมบัติครบ 60 ปี",
    "งานฉลองสิริราชสมบัติครบ 50 ปี",
    "พระราชพิธีมหามงคลเฉลิมพระชนมพรรษา 5 รอบ",
    "พระราชพิธีมหามงคลเฉลิมพระชนมพรรษา 6 รอบ"
   ]
  },
  {
   "id": 3,
   "question": "ในหลวงรัชกาลที่ 9 ได้พระราชทานรายการศึกษาทัศน์ และทรงสอนนักเรียนในรายการศึกษาทัศน์ด้วยพระองค์เอง ถึง 3 ครั้ง ข้อใดกล่าว<u>ถูกต้อง</u> ?",
   "choices": [
    "ทรงสอนเกี่ยวการปรับปรุงบำรุงดิน โดยใช้ทฤษฎี แกล้งดิน ณ โครงการอ่างเก็บน้ำเขาเต่า อันเนื่องมาจากพระราชดำริ",
    "ทรงสอนเกี่ยวกับการทำฝนเทียม ณ ศูนย์ปฏิบัติการฝนหลวงหัวหิน ท่าอากาศยานหัวหิน",
    "ทรงสอนเกี่ยวกับการบริหารจัดการน้ำและการบำบัดน้ำเสีย ณ โครงการศึกษาวิจัยและพัฒนาสิ่งแวดล้อมแหลมผักเบี้ย อันเนื่องมาจากพระราชดำริ ตำบลแหลมผักเบี้ย",
    "ถูกทุกข้อ"
   ]
  },
  {
   "id": 4,
   "question": "การศึกษาต้องสร้างให้คนไทยมีคุณลักษณะ 4 ประการ ตามพระบรมราโชบาย<u>ด้านการศึกษา</u>ของพระบาทสมเด็จพระเจ้าอยู่หัว ข้อใด<u>ถูกต้อง</u> ?",
   "choices": [
    "มีทัศนคติที่ดีและถูกต้อง, มีพื้นฐานชีวิตที่มั่นคงเข้มแข็ง, มีอาชีพ มีงานทำ, เป็นพลเมืองดี มีระเบียบวินัย",
    "มีทัศนคติที่ดีและถูกต้อง, ทำนุบำรุงศิลปวัฒนธรรม, มีอาชีพ มีงานทำ, เป็นพลเมืองดี มีระเบียบวินัย",
    "มีทัศนคติที่ดีและถูกต้อง, มีพื้นฐานชีวิตที่มั่นคงเข้มแข็ง, ทำนุบำรุงศิลปวัฒนธรรม, เป็นพลเมืองดี มีระเบียบวินัย",
    "มีทัศนคติที่ดีและถูกต้อง, มีพื้นฐานชีวิตที่มั่นคงเข้มแข็ง, มีอาชีพ มีงานทำ, ทำนุบำรุงศิลปวัฒนธรรม"
   ]
  },
  {
   "id": 5,
   "question": "ข้อใด<u>ไม่ถูกต้อง</u> เกี่ยวกับการเปลี่ยนแปลง 5 ประการ หลังจากที่พระบาทสมเด็จพระเจ้าอยู่หัว ได้พระราชทานพระบรมราชานุญาตให้พัฒนา ต่อยอดการดำเนินงานของมูลนิธิ ฯ ?",
   "choices": [
    "เปลี่ยนระบบ High Definition (HD) เป็น Standard Definition (SD)",
    "ปรับปรุงสถานี ห้องเรียน สื่อการสอนให้ทันสมัย",
    "เปลี่ยนการถ่ายทอดสดเป็นบันทึกเทป",
    "เพิ่มช่องทางออกอากาศ (Website, Application, Youtube)"
   ]
  },
  {
   "id": 6,
   "question": "ข้อใด<u>กล่าวถูกต้อง</u>เกี่ยวกับการออกอากาศรายการ ของสถานีวิทยุโทรทัศน์การศึกษาทางไกลผ่านดาวเทียม ช่อง DLTV 1 – 15 ?",
   "choices": [
    "มูลนิธิ ฯ บันทึกเทปและออกอากาศระดับชั้นอนุบาลปีที่ 1 ถึง มัธยมศึกษาปีที่ 3 (DLTV 1 – 12)",
    "มูลนิธิ ฯ ออกอากาศรายการอาชีวศึกษา รายการอุดมศึกษา และรายการพัฒนาวิชาชีพครู (DLTV13 – 15)",
    "มูลนิธิ ฯ ออกอากาศรายการเรียนรู้ตลอดชีวิต ในห้วงนอกเวลาเรียน เป็นรายการความรู้ทั่วไป",
    "ถูกทุกข้อ"
   ]
  },
  {
   "id": 7,
   "question": "มีจำนวนโรงเรียนและสถานศึกษาผู้ใช้บริการการศึกษาทางไกลผ่านดาวเทียม DLTV กี่แห่ง ?",
   "choices": [
    "กว่า 15,000 แห่ง",
    "กว่า 20,000 แห่ง",
    "กว่า 25,000 แห่ง",
    "กว่า 33,000 แห่ง"
   ]
  },
  {
   "id": 8,
   "question": "มีจำนวนผู้เข้าถึงและได้รับประโยชน์จากการศึกษาทางไกลผ่านดาวเทียม จำนวนเท่าใด ?",
   "choices": [
    "กว่า 1,000,000 คน",
    "กว่า 1,200,000 คน",
    "กว่า 2,300,000 คน",
    "กว่า 3,000,000 คน"
   ]
  },
  {
   "id": 9,
   "question": "ข้อใดต่อไปนี้<u>ไม่ใช่</u>กลุ่มผู้ใช้บริการ DLTV ?",
   "choices": [
    "โรงเรียนขนาดเล็กในพื้นที่ห่างไกล",
    "โรงเรียนสังกัดตำรวจตระเวนชายแดน",
    "โรงเรียนประจำจังหวัด ที่มีครูครบชั้น",
    "โรงเรียนที่ประสบปัญหาขาดแคลนครู"
   ]
  },
  {
   "id": 10,
   "question": "ท่านสามารถรับชมการศึกษาทางไกล DLTV ผ่านช่องทางใดบ้าง ?",
   "choices": [
    "โทรทัศน์ดาวเทียม Ku-Band (ช่อง 186 – 200)",
    "เว็บไซต์ www.dltv.ac.th",
    "ช่อง ยูทูป",
    "ถูกทุกข้อ"
   ]
  }
 ]
};

async function call(method, params, body, tries = 4) {
  const url = new URL(CFG.API_URL);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  for (let i = 1; ; i++) {
    let retry = false, err;
    try {
      // POST แบบ text/plain (ค่าเริ่มต้นของ fetch) เพื่อไม่ให้เกิด CORS preflight กับ Apps Script
      const res = await fetch(url, method === 'POST' ? { method, body: JSON.stringify(body), redirect: 'follow' } : { redirect: 'follow' });
      if (!res.ok) { retry = res.status === 429 || res.status >= 500; throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ (' + res.status + ')'); }
      const json = await res.json();
      if (json.ok) return json.data;
      retry = /^BUSY:|too many|Service invoked/i.test(json.error || '');
      throw new Error((json.error || 'เกิดข้อผิดพลาด').replace(/^BUSY:\s*/, ''));
    } catch (e) {
      err = e;
      if (e instanceof TypeError) retry = true; // เน็ตหลุด / timeout
    }
    if (!retry || i >= tries) throw err;
    await wait(800 * 2 ** (i - 1) + Math.random() * 600); // รอแล้วลองใหม่: ~1, 2, 4 วินาที
  }
}

/** ช่วงเวลาปัจจุบัน + ตุ๊กตาคงเหลือ (เรียกตอนเปิดหน้าเว็บ — ช่วยปลุกเซิร์ฟเวอร์ GAS ด้วย) */
export async function getStatus() {
  if (DEMO) return { todayLeft: 13, todayTotal: 20, todayGiven: 7, slotLabel: '15.00–16.59 น.' };
  return call('GET', { action: 'status' }, null, 2);
}

export async function getQuiz() {
  return structuredClone(QUIZ);
}

/** ตรวจว่าชื่อ/เบอร์นี้เคยได้รางวัลแล้วหรือยัง */
export async function checkPlayer(name, phone) {
  if (DEMO) { await wait(500); return { alreadyWon: false, reason: '' }; }
  return call('POST', {}, { action: 'check', name, phone });
}

export async function submitQuiz(payload) {
  if (DEMO) {
    await wait(1200);
    // โหมดทดลอง: สมมติว่าตอบถูกทุกข้อ
    return { score: 10, total: 10, perfect: true, passScore: 10, wrong: [], review: null, demo: true,
      reward: { type: 'doll', reward: 'ตุ๊กตา DLTV', code: 'DLTV-DEMO-08', note: '', already: '', dollsLeft: 12 } };
  }
  return call('POST', {}, { action: 'submit', ...payload });
}

/** ส่งแบบสอบถามความพึงพอใจ */
export async function submitSurvey(payload) {
  if (DEMO) { await wait(700); return { saved: true }; }
  return call('POST', {}, { action: 'survey', ...payload });
}

/** เจ้าหน้าที่ยืนยัน/ยกเลิกการรับของ (หน้า admin) */
export async function setReceived(key, code, received) {
  if (DEMO) throw new Error('ยังไม่ได้ตั้งค่า API_URL ใน assets/js/config.js');
  return call('POST', {}, { action: 'receive', key, code, received });
}

export async function getStats(key) {
  if (DEMO) throw new Error('ยังไม่ได้ตั้งค่า API_URL ใน assets/js/config.js');
  return call('GET', { action: 'stats', key });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
