// ภาษาไทย / English — ข้อความหน้าจอ + คำแปลข้อคำถาม/แบบสอบถาม
// ข้อมูลที่ส่งไปเซิร์ฟเวอร์ยังเป็นค่าเดิม (รหัสข้อ, เลขตัวเลือก, ชื่อกลุ่มภาษาไทย) → ตรวจคะแนน/สถิติเหมือนเดิมทุกอย่าง
export const LANGS = ['th', 'en'];

const D = {
  th: {
    title: 'ตอบคำถามชิงตุ๊กตา DLTV',
    found1: 'มูลนิธิการศึกษาทางไกลผ่านดาวเทียม', found2: 'ในพระบรมราชูปถัมภ์',
    h1: 'ตอบคำถาม<br><span>ชิงตุ๊กตา DLTV</span>',
    chipQ: 'คำถาม', chipDoll: 'ถูกครบ 10 ข้อ<br>รับตุ๊กตา DLTV', chipGift: 'ร่วมสนุก<br>รับรางวัลปลอบใจ',
    dollsToday: 'วันนี้เหลือตุ๊กตา DLTV', unit: 'ตัว',
    dollsNote: 'แจกไปแล้ว {n} ตัว · ตอบถูกครบ 10 ข้อ รับเลย! (แจกจนกว่าจะหมด)', dollsOut: 'ตุ๊กตาของวันนี้หมดแล้ว · ร่วมสนุกรับรางวัลปลอบใจได้ครับ',
    regDolls: '🧸 วันนี้เหลือตุ๊กตา <b>{n}</b> ตัว', regDollsOut: '🧸 ตุ๊กตาของวันนี้หมดแล้ว · ยังร่วมสนุกรับรางวัลปลอบใจได้',
    loading: 'กำลังโหลด…', start: 'เริ่มภารกิจ 🚀', loadFail: 'โหลดข้อมูลไม่สำเร็จ',
    visitor: 'ผู้เยี่ยมชมบูธ · ทำแบบสอบถามความพึงพอใจ', hint: 'แตะที่น้อง DLTV หรือปัดซ้าย-ขวาเพื่อหมุนตัว',
    regTitle: 'ลงทะเบียนก่อนเริ่มภารกิจ 🚀', name: 'ชื่อ-สกุล (ไม่ต้องใส่คำนำหน้า)', youAre: 'ท่านเป็น',
    phone: 'เบอร์มือถือ 10 หลัก', phoneOpt: 'เบอร์มือถือ (ไม่บังคับสำหรับนักเรียน)',
    fine: '* 1 คน (ชื่อ-สกุล / เบอร์โทรศัพท์) รับรางวัลได้ 1 ครั้ง · นักเรียน/นักศึกษาไม่ต้องใส่เบอร์ก็ได้ · ข้อมูลใช้เพื่อการจัดกิจกรรมเท่านั้น',
    back: 'ย้อนกลับ', startQuiz: 'เริ่มตอบคำถาม', checking: 'กำลังตรวจสอบ…',
    qNo: 'คำถามข้อที่', next: 'ถัดไป', submit: 'ส่งคำตอบ ✔', sending: 'กำลังส่งคำตอบผ่านดาวเทียม…',
    svTitle: 'แบบสอบถามความพึงพอใจ', svSub: 'ต่อการจัดแสดงนิทรรศการของมูลนิธิฯ',
    svHelp: 'โปรดเลือกระดับความพึงพอใจที่ตรงกับความคิดเห็นของท่านมากที่สุด<br><span>5 = มากที่สุด · 4 = มาก · 3 = ปานกลาง · 2 = น้อย · 1 = น้อยที่สุด</span>',
    svSuggest: 'ข้อเสนอแนะเพิ่มเติม <small>(ไม่บังคับ)</small>', svPh: 'พิมพ์ข้อเสนอแนะของท่าน…', svSend: 'ส่งแบบสอบถาม', svSending: 'กำลังส่ง…',
    svProgress: 'ตอบแล้ว {n}/{t} ข้อ', svRate: 'กรุณาให้คะแนนข้อ {n}',
    mTitle: 'คุณได้รับรางวัลไปแล้ว', mBack: 'กลับ', mGo: 'เล่นเพื่อทดสอบความรู้', mText: '{r}<br>จึงไม่สามารถรับรางวัลซ้ำได้ แต่ยังร่วมสนุกทดสอบความรู้ได้นะครับ',
    demo: 'โหมดทดลอง · ยังไม่ได้เชื่อมต่อ Google Apps Script', demoResult: '(โหมดทดลอง — ผลนี้เป็นตัวอย่าง)',
    errName: 'กรุณากรอกชื่อ-สกุล', errNameChar: 'ชื่อ-สกุลต้องเป็นตัวอักษรไทยหรืออังกฤษเท่านั้น', errNameFull: 'กรุณากรอกทั้งชื่อและนามสกุล (เว้นวรรค 1 ช่อง)',
    errGroup: 'กรุณาเลือกกลุ่มผู้เข้าร่วม', errPhoneEmpty: 'กรุณากรอกเบอร์มือถือ', errPhone: 'กรุณากรอกเบอร์มือถือ 10 หลักให้ถูกต้อง',
    errPick: 'คุณยังไม่ได้เลือกคำตอบ', sendFail: 'ส่งคำตอบไม่สำเร็จ', retry: 'ลองส่งอีกครั้ง',
    resultOf: 'ผลคะแนนของคุณ {name}', of: 'จาก {n}',
    greatPerfect: 'เก่งมาก! คะแนนเต็ม', thanksPlay: 'ขอบคุณที่ร่วมสนุก', oncePer: '(รับรางวัลได้ 1 ครั้งต่อคน)',
    gotDoll: '🎉 คะแนนเต็ม! คุณได้รับตุ๊กตา DLTV', perfect: '🎉 คะแนนเต็ม!', gotGift: '🎁 คุณได้รับรางวัลปลอบใจ', insteadGift: '{note} จึงได้รับรางวัลปลอบใจแทน',
    step: '<b>ขั้นตอนสุดท้าย</b> ตอบแบบสอบถามความพึงพอใจ 7 ข้อ (ประมาณ 1 นาที)<br>แล้วแสดงหน้าจอสุดท้ายแก่เจ้าหน้าที่เพื่อรับ{reward}',
    doSurvey: 'ทำแบบสอบถาม ▶', home: 'กลับหน้าแรก', confirmHome: 'ยังไม่ได้ทำแบบสอบถาม ต้องการกลับหน้าแรกหรือไม่?',
    code: 'รหัสรับรางวัล', thanksTitle: 'ขอบคุณที่ร่วมกิจกรรมครับ', showStaff: 'กรุณา<b>แสดงหน้าจอนี้แก่เจ้าหน้าที่</b>เพื่อรับ{reward}',
    thanksSv: 'ขอบคุณสำหรับความคิดเห็นครับ', thanksSvText: 'ความคิดเห็นของท่านจะนำไปพัฒนาการจัดนิทรรศการของมูลนิธิฯ ต่อไป',
    rewardDoll: 'ตุ๊กตา DLTV', rewardGift: 'รางวัลปลอบใจ',
    sayHello: 'สวัสดีครับ! มาตอบคำถามกับน้อง DLTV กัน 🛰️', sayName: 'บอกชื่อน้องหน่อยนะครับ 😊', sayGo: 'สู้ ๆ นะครับ! ✨', sayPick: 'เลือกคำตอบก่อนนะครับ 🙏',
    cheers: ['เยี่ยมไปเลย!', 'ไปต่อกัน!', 'เก่งมากครับ 👍', 'อีกนิดเดียว!', 'ใกล้แล้ว ๆ'], saySend: 'กำลังส่งสัญญาณ…',
    sayPerfect: 'คะแนนเต็ม! เก่งที่สุดเลย 🎉', sayScore: 'ได้ {n} คะแนน เก่งมากครับ 👏', sayVisitor: 'ขอบคุณที่แวะมาเยี่ยมชมบูธครับ 😊', sayRate: 'เลือกได้เลยครับ 1–5', sayThanks: 'ขอบคุณมากครับ 💛',
    letters: ['ก', 'ข', 'ค', 'ง'],
    levels: ['มากที่สุด', 'มาก', 'ปานกลาง', 'น้อย', 'น้อยที่สุด'],
  },
  en: {
    title: 'DLTV Quiz — Win a DLTV Doll',
    found1: 'Distance Learning Foundation', found2: 'under the Royal Patronage',
    h1: 'Answer the Quiz<br><span>Win a DLTV Doll</span>',
    chipQ: 'questions', chipDoll: 'All 10 correct<br>= DLTV doll', chipGift: 'Join the fun<br>= consolation prize',
    dollsToday: 'DLTV dolls left today', unit: '',
    dollsNote: '{n} given out · Get all 10 right to win one! (while stocks last)', dollsOut: "Today's dolls are all gone · You can still win a consolation prize",
    regDolls: '🧸 <b>{n}</b> DLTV dolls left today', regDollsOut: "🧸 Today's dolls are all gone · Consolation prizes still available",
    loading: 'Loading…', start: 'Start the mission 🚀', loadFail: 'Could not load data',
    visitor: 'Booth visitor · Satisfaction survey', hint: 'Tap the DLTV astronaut or swipe left/right to spin it',
    regTitle: 'Register to start the mission 🚀', name: 'First name and last name', youAre: 'You are a',
    phone: 'Mobile number (10 digits, Thai)', phoneOpt: 'Mobile number (optional for students)',
    fine: '* One prize per person (name / phone number) · Students may skip the phone number · Data is used for this activity only',
    back: 'Back', startQuiz: 'Start the quiz', checking: 'Checking…',
    qNo: 'Question', next: 'Next', submit: 'Submit ✔', sending: 'Sending your answers via satellite…',
    svTitle: 'Satisfaction Survey', svSub: "on the Foundation's exhibition",
    svHelp: 'Please choose the level that best matches your opinion<br><span>5 = Highest · 4 = High · 3 = Moderate · 2 = Low · 1 = Lowest</span>',
    svSuggest: 'Additional suggestions <small>(optional)</small>', svPh: 'Type your suggestions…', svSend: 'Submit survey', svSending: 'Sending…',
    svProgress: '{n}/{t} answered', svRate: 'Please rate item {n}',
    mTitle: 'You have already received a prize', mBack: 'Back', mGo: 'Play for fun', mText: '{r}<br>Each person can receive only one prize, but you are welcome to play for fun.',
    demo: 'Demo mode · Not connected to Google Apps Script', demoResult: '(Demo mode — sample result)',
    errName: 'Please enter your name', errNameChar: 'Please use Thai or English letters only', errNameFull: 'Please enter both first and last name (separated by a space)',
    errGroup: 'Please select your group', errPhoneEmpty: 'Please enter your mobile number', errPhone: 'Please enter a valid 10-digit Thai mobile number',
    errPick: 'Please choose an answer', sendFail: 'Could not submit your answers', retry: 'Try again',
    resultOf: 'Your score, {name}', of: 'out of {n}',
    greatPerfect: 'Great job! Perfect score', thanksPlay: 'Thanks for playing', oncePer: '(one prize per person)',
    gotDoll: '🎉 Perfect score! You won a DLTV doll', perfect: '🎉 Perfect score!', gotGift: '🎁 You won a consolation prize', insteadGift: '{note}, so you receive a consolation prize instead.',
    step: '<b>Last step</b> Complete the 7-item satisfaction survey (about 1 minute)<br>then show the final screen to our staff to receive your {reward}',
    doSurvey: 'Take the survey ▶', home: 'Back to home', confirmHome: 'You have not completed the survey yet. Go back to the home page?',
    code: 'Prize code', thanksTitle: 'Thank you for joining!', showStaff: 'Please <b>show this screen to our staff</b> to receive your {reward}',
    thanksSv: 'Thank you for your feedback!', thanksSvText: "Your feedback will help us improve the Foundation's exhibitions.",
    rewardDoll: 'DLTV doll', rewardGift: 'consolation prize',
    sayHello: "Hi there! Let's answer some questions together 🛰️", sayName: "What's your name? 😊", sayGo: 'You can do it! ✨', sayPick: 'Please pick an answer first 🙏',
    cheers: ['Awesome!', 'Keep going!', 'Great job 👍', 'Almost there!', 'So close!'], saySend: 'Sending signal…',
    sayPerfect: "Perfect score! You're amazing 🎉", sayScore: 'You got {n} points. Well done 👏', sayVisitor: 'Thanks for visiting our booth 😊', sayRate: 'Choose from 1 to 5', sayThanks: 'Thank you so much 💛',
    letters: ['A', 'B', 'C', 'D'],
    levels: ['Highest', 'High', 'Moderate', 'Low', 'Lowest'],
  },
};

// ---------- คำแปลข้อคำถาม (ตามรหัสข้อ, ตัวเลือกตามลำดับเดิม) ----------
const Q_EN = {
  1: { q: "What was King Rama IX's royal intention in establishing the Distance Learning Foundation under the Royal Patronage (which matches the Foundation's objectives)?",
       c: ['To reduce educational inequality', 'To solve the teacher shortage', 'To solve the problems of too few teachers per grade and teachers teaching outside their subjects', 'All of the above'] },
  2: { q: "On which occasion did King Rama IX graciously grant the use of the royal emblem as the Foundation's symbol?",
       c: ["The 60th Anniversary Celebrations of His Majesty's Accession to the Throne", "The 50th Anniversary Celebrations of His Majesty's Accession to the Throne",
           "His Majesty's 5th Cycle (60th) Birthday Anniversary", "His Majesty's 6th Cycle (72nd) Birthday Anniversary"] },
  3: { q: "King Rama IX granted the \"Suksathat\" program and personally taught students in it 3 times. Which statement is <u>correct</u>?",
       c: ['He taught soil improvement using the "Klaeng Din" (soil-provoking) theory at the Khao Tao Reservoir Project initiated by His Majesty',
           'He taught artificial rainmaking at the Hua Hin Royal Rainmaking Operations Center, Hua Hin Airport',
           'He taught water management and wastewater treatment at the Laem Phak Bia Environmental Research and Development Project initiated by His Majesty, Laem Phak Bia Subdistrict',
           'All of the above'] },
  4: { q: "According to His Majesty the King's <u>royal policy on education</u>, education must build 4 qualities in Thai people. Which is <u>correct</u>?",
       c: ['Good and correct attitudes, a strong and stable foundation for life, having a career and a job, being a good and disciplined citizen',
           'Good and correct attitudes, preserving arts and culture, having a career and a job, being a good and disciplined citizen',
           'Good and correct attitudes, a strong and stable foundation for life, preserving arts and culture, being a good and disciplined citizen',
           'Good and correct attitudes, a strong and stable foundation for life, having a career and a job, preserving arts and culture'] },
  5: { q: "Which statement is <u>NOT correct</u> about the 5 changes made after His Majesty the King granted royal permission to develop and extend the Foundation's work?",
       c: ['Switching from High Definition (HD) to Standard Definition (SD)', 'Modernizing studios, classrooms and teaching media',
           'Changing from live broadcasts to recorded programs', 'Adding broadcast channels (Website, Application, YouTube)'] },
  6: { q: 'Which statement is <u>correct</u> about the programs broadcast on the Distance Learning Television channels DLTV 1–15?',
       c: ['The Foundation records and broadcasts lessons from Kindergarten 1 to Grade 9 (DLTV 1–12)',
           'The Foundation broadcasts vocational, higher education and teacher professional development programs (DLTV 13–15)',
           'The Foundation broadcasts lifelong-learning programs with general knowledge outside school hours', 'All of the above'] },
  7: { q: 'How many schools and educational institutions use the DLTV distance learning service?',
       c: ['Over 15,000', 'Over 20,000', 'Over 25,000', 'Over 33,000'] },
  8: { q: 'How many people have access to and benefit from distance learning via satellite?',
       c: ['Over 1,000,000 people', 'Over 1,200,000 people', 'Over 2,300,000 people', 'Over 3,000,000 people'] },
  9: { q: 'Which of the following is <u>NOT</u> a user group of DLTV?',
       c: ['Small schools in remote areas', 'Border Patrol Police schools', 'Provincial schools with a full set of teachers for every grade', 'Schools facing teacher shortages'] },
  10: { q: 'Through which channels can you watch DLTV distance learning?',
        c: ['Ku-Band satellite TV (channels 186–200)', 'Website www.dltv.ac.th', 'YouTube channel', 'All of the above'] },
};
const GROUPS_EN = { 'นักเรียน/นักศึกษา': 'Student', 'ครู/บุคลากรทางการศึกษา': 'Teacher / Education staff', 'ผู้ปกครอง/บุคคลทั่วไป': 'Parent / General public' };
const SURVEY_EN = [
  'The exhibition content and information are interesting, easy to understand and suitable for visitors',
  'The exhibition helped you better understand the role, mission and benefits of satellite distance learning',
  'The presentation style, media and activities at the booth are interesting',
  'The layout, information signs and visiting route of the exhibition are convenient and appropriate',
  'The prizes are sufficient for the activity and public relations',
  'Booth staff provided information and assistance politely and appropriately',
  "Overall, you are satisfied with the Foundation's exhibition",
];

// ---------- สถานะภาษา ----------
let lang = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try { const s = localStorage.getItem('dltvLang'); if (LANGS.includes(s)) return s; } catch (e) {}
  return 'th';
})();
export const getLang = () => lang;
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  try { localStorage.setItem('dltvLang', l); } catch (e) {}
  applyStatic();
}

export function t(key, vars) {
  let s = D[lang][key] ?? D.th[key] ?? key;
  if (vars && typeof s === 'string') Object.entries(vars).forEach(([k, v]) => (s = s.split('{' + k + '}').join(v)));
  return s;
}

/** ข้อความในหน้า HTML ที่มี data-i18n / data-i18n-ph */
export function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.innerHTML = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  const b = document.getElementById('langBtn');
  if (b) { b.textContent = lang === 'th' ? 'EN' : 'ไทย'; b.setAttribute('aria-label', lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'); }
}

/** ข้อคำถามตามภาษา (คืน question + choices ตามลำดับเดิม) */
export function localQ(q) {
  if (lang === 'en' && Q_EN[q.id]) return { question: Q_EN[q.id].q, choices: Q_EN[q.id].c };
  return { question: q.question, choices: q.choices };
}
export const groupLabel = (g) => (lang === 'en' ? GROUPS_EN[g] || g : g);
export const surveyItem = (i, th) => (lang === 'en' ? SURVEY_EN[i] || th : th);
export const rewardName = (type) => t(type === 'doll' ? 'rewardDoll' : 'rewardGift');

/** แปลข้อความจากเซิร์ฟเวอร์ (ภาษาไทย) เป็นภาษาอังกฤษ */
export function srv(msg) {
  msg = String(msg || '');
  if (lang !== 'en' || !/[฀-๿]/.test(msg)) return msg;
  const rw = (s) => s.replace('ตุ๊กตา DLTV', 'DLTV doll').replace('รางวัลปลอบใจ', 'consolation prize');
  let m;
  if ((m = msg.match(/^เบอร์โทรศัพท์นี้รับ(.+)ไปแล้ว/))) return `This phone number has already received a ${rw(m[1])}`;
  if ((m = msg.match(/^ชื่อ-สกุลนี้รับ(.+)ไปแล้ว/))) return `This name has already received a ${rw(m[1])}`;
  const map = [
    [/ทั้งชื่อและนามสกุล/, 'Please enter both first and last name'],
    [/ตัวอักษรไทยหรืออังกฤษ/, 'Please use Thai or English letters only'],
    [/เบอร์มือถือ/, 'Please enter a valid 10-digit Thai mobile number'],
    [/ผู้ใช้งานจำนวนมาก/, 'The system is busy. Please try again.'],
    [/ตุ๊กตาของวันนี้หมด/, "Perfect score, but today's DLTV dolls have run out"],
    [/ให้คะแนนให้ครบ/, 'Please rate every item'],
    [/เลือกกลุ่ม/, 'Please select your group'],
    [/ข้อมูลไม่ครบ/, 'Incomplete data. Please start again.'],
    [/ไม่พบข้อมูล/, 'Record not found. Please play again.'],
    [/เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ/, 'Could not connect to the server. Please try again.'],
  ];
  for (const [re, en] of map) if (re.test(msg)) return en;
  return 'Something went wrong. Please try again.';
}
