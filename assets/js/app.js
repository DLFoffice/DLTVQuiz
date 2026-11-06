import { getQuiz, submitQuiz, checkPlayer, getStatus, submitSurvey, DEMO } from './api.js';

const $ = (s) => document.querySelector(s);
const CFG = window.DLTV_CONFIG || {};
const S = { quiz: null, idx: 0, answers: {}, player: {}, startedAt: 0, busy: false, mascot: null };
const LETTERS = ['ก', 'ข', 'ค', 'ง'];

// ===================================================== น้อง DLTV 3D
async function initMascot() {
  const stage = $('#stage');
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl');
    const { Mascot } = await import('./mascot3d.js');
    S.mascot = new Mascot(stage, { logoUrl: 'assets/img/dltv-logo.png' });
  } catch (e) {
    console.warn('3D not available, using image', e);
    stage.querySelector('.stage-fallback').hidden = false;
  }
}
const mascot = (fn, ...a) => S.mascot && S.mascot[fn] && S.mascot[fn](...a);

let bubbleTimer;
function say(text, ms = 2600) {
  const b = $('#bubble');
  b.classList.remove('show'); void b.offsetWidth;
  b.textContent = text; b.classList.add('show');
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => b.classList.remove('show'), ms);
}

// ===================================================== หน้าจอ + transition
const SCREENS = { home: '#sHome', reg: '#sReg', quiz: '#sQuiz', send: '#sSend', result: '#sResult', claim: '#sClaim', survey: '#sSurvey', thanks: '#sThanks' };
function go(name) {
  const cur = document.querySelector('.screen.is-active');
  const next = $(SCREENS[name]);
  if (cur === next) return;
  document.body.dataset.screen = name;
  const enter = () => {
    next.querySelectorAll('[data-in]').forEach((el, i) => el.style.setProperty('--i', i));
    next.classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  if (cur) {
    cur.classList.add('is-leaving');
    cur.classList.remove('is-active');
    setTimeout(() => { cur.classList.remove('is-leaving'); enter(); }, 330);
  } else enter();
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000);
}

// ===================================================== หน้าแรก
async function boot() {
  if (DEMO) $('#demo').hidden = false;
  initMascot();
  refreshStatus();
  setTimeout(() => say('สวัสดีครับ! มาตอบคำถามกับน้อง DLTV กัน 🛰️'), 900);
  try {
    S.quiz = await getQuiz();
    $('#hQ').textContent = S.quiz.questions.length;
    $('#qTotal').textContent = S.quiz.questions.length;
    $('#groups').innerHTML = S.quiz.groups.map((g) => `<button type="button" role="radio" aria-checked="false">${esc(g)}</button>`).join('');
    const b = $('#bStart'); b.disabled = false; b.querySelector('span').textContent = 'เริ่มภารกิจ 🚀';
  } catch (e) {
    $('#bStart span').textContent = 'โหลดข้อมูลไม่สำเร็จ';
    toast(e.message);
  }
}

// ตุ๊กตาคงเหลือวันนี้ (แสดงหน้าแรก + หน้าลงทะเบียน) — โหลดตอนเปิดหน้าและทุก 1 นาที (ช่วยปลุกเซิร์ฟเวอร์ด้วย)
let statusTimer;
async function refreshStatus() {
  clearTimeout(statusTimer);
  statusTimer = setTimeout(refreshStatus, 60000);
  if (document.hidden || !['home', 'reg'].includes(document.body.dataset.screen)) return;
  try { renderStatus(await getStatus()); } catch (e) { /* ไม่แสดงถ้าโหลดไม่ได้ */ }
}
function renderStatus(st) {
  if (st.todayTotal === undefined) return;
  const box = $('#dolls');
  countTo($('#dLeft'), st.todayLeft);
  $('#dTotal').textContent = st.todayTotal;
  $('#dBar').style.width = (st.todayTotal ? (st.todayLeft / st.todayTotal) * 100 : 0) + '%';
  box.classList.toggle('out', st.todayLeft === 0);
  $('#dNote').textContent = st.todayLeft
    ? `แจกไปแล้ว ${st.todayGiven} ตัว · ตอบถูกครบ 10 ข้อ รับเลย! (แจกจนกว่าจะหมด)`
    : 'ตุ๊กตาของวันนี้หมดแล้ว · ร่วมสนุกรับรางวัลปลอบใจได้ครับ';
  box.hidden = false;
  const r = $('#regDolls');
  r.innerHTML = st.todayLeft ? `🧸 วันนี้เหลือตุ๊กตา <b>${st.todayLeft}</b> ตัว` : '🧸 ตุ๊กตาของวันนี้หมดแล้ว · ยังร่วมสนุกรับรางวัลปลอบใจได้';
  r.hidden = false;
}
function countTo(el, to) {
  const from = +el.textContent || 0; if (from === to) return;
  const t0 = performance.now();
  const step = (t) => { const p = Math.min((t - t0) / 700, 1); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStatus(); });

$('#bStart').addEventListener('click', () => {
  go('reg'); mascot('play', 'jump'); refreshStatus();
  setTimeout(() => say('บอกชื่อน้องหน่อยนะครับ 😊'), 700);
  setTimeout(() => $('#iName').focus({ preventScroll: true }), 900);
});
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { go('home'); mascot('play', 'wave'); }));

// ===================================================== ลงทะเบียน
$('#groups').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  [...e.currentTarget.children].forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  e.currentTarget.classList.remove('err');
  mascot('play', 'nod');
});
$('#iPhone').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 10); });
document.querySelectorAll('.field input').forEach((i) => i.addEventListener('input', () => i.parentElement.classList.remove('err')));

// ตรวจรูปแบบชื่อ-สกุล (ตรงกับฝั่ง GAS)
const NAME_PREFIX = /^(นาย|นางสาว|นาง|น\.ส\.|นส\.?|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|ดช\.?|ดญ\.?|mr\.?|mrs\.?|ms\.?|miss)\s*/i;
function nameError(raw) {
  const n = raw.replace(/\s+/g, ' ').trim().replace(NAME_PREFIX, '');
  const parts = n.split(' ').filter(Boolean);
  if (!n) return 'กรุณากรอกชื่อ-สกุล';
  if (!/^[\u0E00-\u0E7Fa-zA-Z.\s'-]+$/.test(n)) return 'ชื่อ-สกุลต้องเป็นตัวอักษรไทยหรืออังกฤษเท่านั้น';
  if (parts.length < 2 || parts.some((x) => x.length < 2)) return 'กรุณากรอกทั้งชื่อและนามสกุล (เว้นวรรค 1 ช่อง)';
  return '';
}

$('#fReg').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (S.busy) return;
  const name = $('#iName').value.replace(/\s+/g, ' ').trim();
  const phone = $('#iPhone').value.replace(/\D/g, '');
  const groupBtn = $('#groups [aria-checked="true"]');
  const fail = (el, msg) => { el.classList.remove('err'); void el.offsetWidth; el.classList.add('err'); toast(msg); mascot('play', 'shake'); };
  document.querySelectorAll('.field').forEach((f) => f.classList.remove('err'));
  const ne = nameError(name);
  if (ne) return fail($('#iName').parentElement, ne);
  if (!/^0[689]\d{8}$/.test(phone)) return fail($('#iPhone').parentElement, 'กรุณากรอกเบอร์มือถือ 10 หลักให้ถูกต้อง');
  if (!groupBtn) return fail($('#groups'), 'กรุณาเลือกกลุ่มผู้เข้าร่วม');
  S.player = { name, phone, group: groupBtn.textContent };

  // ตรวจชื่อ/เบอร์ซ้ำกับผู้ที่ได้รับรางวัลแล้ว
  const btn = $('#bReg'), label = btn.querySelector('span').textContent;
  S.busy = true; btn.disabled = true; btn.querySelector('span').textContent = 'กำลังตรวจสอบ…';
  try {
    const r = await checkPlayer(name, phone);
    if (r.alreadyWon) { showModal(r.reason); return; }
    startQuiz();
  } catch (err) {
    toast(err.message); mascot('play', 'shake');
  } finally {
    S.busy = false; btn.disabled = false; btn.querySelector('span').textContent = label;
  }
});

function startQuiz() {
  S.idx = 0; S.answers = {}; S.startedAt = Date.now();
  // รหัสการส่งครั้งนี้: ถ้าระบบต้องส่งซ้ำ (เน็ตหลุด) เซิร์ฟเวอร์จะไม่บันทึกซ้ำ
  S.submitId = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  renderQ(false);
  go('quiz'); mascot('play', 'spin'); mascot('burst', 18);
  setTimeout(() => say('สู้ ๆ นะครับ! ✨', 1800), 800);
}

function showModal(reason) {
  $('#mText').innerHTML = esc(reason) + '<br>จึงไม่สามารถรับรางวัลซ้ำได้ แต่ยังร่วมสนุกทดสอบความรู้ได้นะครับ';
  const m = $('#modal'); m.hidden = false; requestAnimationFrame(() => m.classList.add('show'));
  mascot('play', 'shake');
}
function hideModal() { const m = $('#modal'); m.classList.remove('show'); setTimeout(() => (m.hidden = true), 300); }
$('#mBack').addEventListener('click', hideModal);
$('#mGo').addEventListener('click', () => { hideModal(); startQuiz(); });

// ===================================================== คำถาม
function renderQ(animate = true, back = false) {
  const q = S.quiz.questions[S.idx], n = S.quiz.questions.length;
  const card = $('#qCard');
  const paint = () => {
    const no = $('#qNo'); no.textContent = S.idx + 1; no.classList.remove('pop'); void no.offsetWidth; no.classList.add('pop');
    $('#track').style.width = ((S.idx + 1) / n) * 100 + '%';
    $('#qText').innerHTML = q.question; // ข้อความจากผู้ดูแลระบบ (มีแท็ก <u>)
    $('#qChoices').innerHTML = q.choices.map((c, i) =>
      `<button type="button" class="choice c${i + 1}${S.answers[q.id] === i + 1 ? ' sel' : ''}" style="--i:${i}" data-v="${i + 1}"><span class="k">${LETTERS[i]}</span><span>${esc(c)}</span></button>`).join('');
    $('#bPrev').style.visibility = S.idx ? 'visible' : 'hidden';
    $('#bNext span').textContent = S.idx === n - 1 ? 'ส่งคำตอบ ✔' : 'ถัดไป';
  };
  if (!animate) return paint();
  card.className = 'card qcard out' + (back ? ' back' : '');
  setTimeout(() => {
    paint();
    card.className = 'card qcard in' + (back ? ' back' : '');
    setTimeout(() => (card.className = 'card qcard'), 520);
  }, 260);
}

$('#qChoices').addEventListener('click', (e) => {
  const b = e.target.closest('.choice'); if (!b) return;
  const r = document.createElement('span'); const rect = b.getBoundingClientRect(); const d = Math.max(rect.width, rect.height);
  r.className = 'ripple'; r.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d / 2}px;top:${e.clientY - rect.top - d / 2}px`;
  b.appendChild(r); setTimeout(() => r.remove(), 600);
  S.answers[S.quiz.questions[S.idx].id] = Number(b.dataset.v);
  [...e.currentTarget.children].forEach((x) => x.classList.toggle('sel', x === b));
  mascot('play', 'nod');
  if (navigator.vibrate) navigator.vibrate(12);
});

$('#bPrev').addEventListener('click', () => { if (S.idx > 0) { S.idx--; renderQ(true, true); } });
$('#bNext').addEventListener('click', () => {
  const q = S.quiz.questions[S.idx];
  if (!S.answers[q.id]) {
    const c = $('#qCard'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
    toast('คุณยังไม่ได้เลือกคำตอบ'); mascot('play', 'shake'); say('เลือกคำตอบก่อนนะครับ 🙏', 1600);
    return;
  }
  if (S.idx < S.quiz.questions.length - 1) {
    S.idx++; renderQ(true);
    const cheers = ['เยี่ยมไปเลย!', 'ไปต่อกัน!', 'เก่งมากครับ 👍', 'อีกนิดเดียว!', 'ใกล้แล้ว ๆ'];
    if (S.idx % 3 === 0) say(cheers[(S.idx / 3) % cheers.length | 0], 1500);
    return;
  }
  send();
});

// ===================================================== ส่งคำตอบ
async function send() {
  if (S.busy) return; S.busy = true;
  go('send'); mascot('setSignal', 4); mascot('play', 'wave');
  say('กำลังส่งสัญญาณ…', 1600);
  const t0 = Date.now();
  try {
    const r = await submitQuiz({ ...S.player, answers: S.answers, startedAt: S.startedAt, submitId: S.submitId });
    await new Promise((ok) => setTimeout(ok, Math.max(0, 1500 - (Date.now() - t0)))); // ให้แอนิเมชันเล่นจบ
    showResult(r);
  } catch (e) {
    $('#result').innerHTML = `<h2>ส่งคำตอบไม่สำเร็จ</h2><p class="muted">${esc(e.message)}</p>
      <div class="row"><button class="btn btn-go" id="bRetry"><span>ลองส่งอีกครั้ง</span></button></div>`;
    go('result'); mascot('setMood', 'sad');
    $('#bRetry').onclick = () => { mascot('setMood', 'idle'); send(); };
  } finally { S.busy = false; mascot('setSignal', 1); }
}

// ===================================================== ผลลัพธ์
function showResult(r) {
  S.result = r; S.claim = null;
  // ระบบบันทึกรางวัลแล้ว → ตัวเลขตุ๊กตาคงเหลือหน้าแรกจะอัปเดตเมื่อกลับไป
  const C = 2 * Math.PI * 70, rw = r.reward || {};
  let html = `<h2>ผลคะแนนของคุณ ${esc(S.player.name)}</h2>
    <div class="ring ${r.perfect ? '' : 'fail'}">
      <svg viewBox="0 0 170 170"><defs><linearGradient id="gradY" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffd23f"/><stop offset=".5" stop-color="#ff8a00"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient></defs>
        <circle class="bg" cx="85" cy="85" r="70"/><circle class="fg" cx="85" cy="85" r="70" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
      <div class="val"><div><b id="scoreNum">0</b><small>จาก ${r.total}</small></div></div>
    </div>`;
  if (rw.already) {
    html += `<span class="badge bad">${r.perfect ? 'เก่งมาก! คะแนนเต็ม' : 'ขอบคุณที่ร่วมสนุก'}</span>
      <p class="muted">${esc(rw.already)} (รับรางวัลได้ 1 ครั้งต่อคน)</p>`;
  } else {
    // ระบบบันทึกรางวัลจากคะแนนให้แล้ว → แสดงรางวัล + ไปทำแบบสอบถาม
    S.claim = { type: rw.type, reward: rw.reward, code: rw.code };
    const doll = rw.type === 'doll';
    html += `<span class="badge ok">${doll ? '🎉 คะแนนเต็ม! คุณได้รับตุ๊กตา DLTV' : r.perfect ? '🎉 คะแนนเต็ม!' : '🎁 คุณได้รับรางวัลปลอบใจ'}</span>
      ${rw.note ? `<p class="muted">${esc(rw.note)} จึงได้รับรางวัลปลอบใจแทน</p>` : ''}
      ${!r.perfect ? `<p class="muted">ข้อที่ยังตอบไม่ถูก: <b>${r.wrong.join(', ')}</b></p>` : ''}
      ${ticket(S.claim)}
      <div class="step"><b>ขั้นตอนสุดท้าย</b> ตอบแบบสอบถามความพึงพอใจ 7 ข้อ (ประมาณ 1 นาที)<br>แล้วแสดงหน้าจอสุดท้ายแก่เจ้าหน้าที่เพื่อรับ${esc(rw.reward)}</div>
      <button class="btn btn-claim ${doll ? '' : 'gift'}" id="bToSurvey">${doll ? '<img src="assets/img/mascot.png" alt="">' : '<b>📝</b>'}<span>ทำแบบสอบถาม ▶</span></button>`;
  }
  if (r.demo) html += `<p class="muted">(โหมดทดลอง — ผลนี้เป็นตัวอย่าง)</p>`;
  if (r.review) html += `<button class="btn btn-review" id="bReview" aria-expanded="false"><span>📋 ดูเฉลยคำตอบ</span></button><div class="review" id="review" hidden></div>`;
  html += `<div class="row"><button class="btn btn-ghost-dark" id="bAgain"><span>กลับหน้าแรก</span></button></div>`;
  $('#result').innerHTML = html;
  if (r.review) $('#bReview').onclick = () => toggleReview(r);
  if ($('#bToSurvey')) $('#bToSurvey').onclick = () => openSurvey('player');
  $('#bAgain').onclick = () => (S.claim && !confirm('ยังไม่ได้ทำแบบสอบถาม ต้องการกลับหน้าแรกหรือไม่?') ? null : resetHome());
  go('result');

  setTimeout(() => {
    const fg = document.querySelector('.ring .fg'); if (fg) fg.style.strokeDashoffset = C * (1 - r.score / r.total);
    countUp($('#scoreNum'), r.score, 1500);
  }, 450);
  if (r.perfect) {
    mascot('setMood', 'happy'); mascot('play', 'happy');
    setTimeout(() => { confetti(); mascot('burst', 50); say('คะแนนเต็ม! เก่งที่สุดเลย 🎉', 3500); }, 900);
  } else {
    mascot('play', 'jump');
    setTimeout(() => say('ได้ ' + r.score + ' คะแนน เก่งมากครับ 👏', 3000), 900);
  }
}

function resetHome() {
  $('#fReg').reset(); [...$('#groups').children].forEach((x) => x.setAttribute('aria-checked', 'false'));
  S.result = S.claim = null; S.surveyKind = null;
  mascot('setMood', 'idle'); go('home'); mascot('play', 'wave'); refreshStatus();
}

// ===================================================== บัตรรางวัล
const ticket = (c) => `<div class="ticket ${c.type === 'doll' ? '' : 'gift'}"><small>${esc(c.reward)} · รหัสรับรางวัล</small><b>${esc(c.code)}</b></div>`;

// ===================================================== แบบสอบถามความพึงพอใจ
const SURVEY_ITEMS = [
  'เนื้อหาและข้อมูลในนิทรรศการมีความน่าสนใจ เข้าใจง่าย และเหมาะสมกับผู้เข้าชม',
  'นิทรรศการช่วยให้ท่านเข้าใจบทบาท ภารกิจ และประโยชน์ของการศึกษาทางไกลผ่านดาวเทียมมากขึ้น',
  'รูปแบบการนำเสนอ สื่อประกอบ และกิจกรรมภายในบูธมีความน่าสนใจ',
  'การจัดพื้นที่ ป้ายข้อมูล และลำดับการเข้าชมนิทรรศการมีความสะดวกและเหมาะสม',
  'ของรางวัลเพียงพอสำหรับการจัดกิจกรรมและการประชาสัมพันธ์',
  'เจ้าหน้าที่ประจำบูธให้ข้อมูลและอำนวยความสะดวกได้อย่างสุภาพและเหมาะสม',
  'โดยภาพรวม ท่านมีความพึงพอใจต่อการจัดแสดงนิทรรศการของมูลนิธิฯ',
];
const LEVELS = [[5, 'มากที่สุด'], [4, 'มาก'], [3, 'ปานกลาง'], [2, 'น้อย'], [1, 'น้อยที่สุด']];

function openSurvey(kind) {
  S.surveyKind = kind; S.ratings = new Array(SURVEY_ITEMS.length).fill(0);
  S.surveyId = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  $('#svGroupWrap').hidden = kind !== 'visitor';
  if (kind === 'visitor') $('#svGroups').innerHTML = S.quiz.groups.map((g) => `<button type="button" role="radio" aria-checked="false">${esc(g)}</button>`).join('');
  $('#svItems').innerHTML = SURVEY_ITEMS.map((t, i) => `
    <fieldset class="sv-item" data-i="${i}" data-in>
      <legend><span class="sv-no">${i + 1}</span>${esc(t)}</legend>
      <div class="scale" role="radiogroup">${LEVELS.map(([v, l]) =>
        `<button type="button" role="radio" aria-checked="false" data-v="${v}" class="lv${v}"><b>${v}</b><small>${l}</small></button>`).join('')}</div>
    </fieldset>`).join('');
  $('#svSuggest').value = '';
  svProgress();
  go('survey');
  mascot('play', 'wave');
  setTimeout(() => say(kind === 'visitor' ? 'ขอบคุณที่แวะมาเยี่ยมชมบูธครับ 😊' : 'เลือกได้เลยครับ 1–5', 2500), 800);
}
function svProgress() {
  const n = S.ratings.filter(Boolean).length;
  $('#svProgress').textContent = `ตอบแล้ว ${n}/${SURVEY_ITEMS.length} ข้อ`;
}
$('#svItems').addEventListener('click', (e) => {
  const b = e.target.closest('.scale button'); if (!b) return;
  const fs = b.closest('.sv-item'), i = +fs.dataset.i;
  S.ratings[i] = +b.dataset.v;
  [...b.parentElement.children].forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  fs.classList.remove('err'); fs.classList.add('done');
  svProgress(); mascot('play', 'nod');
  if (navigator.vibrate) navigator.vibrate(10);
});
$('#svGroups').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  [...e.currentTarget.children].forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  $('#svGroupWrap').classList.remove('err');
});
$('#svBack').addEventListener('click', () => (S.surveyKind === 'player' && S.result ? go('result') : resetHome()));
$('#bVisitor').addEventListener('click', () => { if (S.quiz) openSurvey('visitor'); });

$('#fSurvey').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (S.busy) return;
  const group = $('#svGroups [aria-checked="true"]');
  if (S.surveyKind === 'visitor' && !group) {
    const w = $('#svGroupWrap'); w.classList.remove('err'); void w.offsetWidth; w.classList.add('err');
    w.scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('กรุณาเลือกกลุ่มผู้เข้าร่วม');
  }
  const miss = S.ratings.findIndex((x) => !x);
  if (miss >= 0) {
    const f = document.querySelector(`.sv-item[data-i="${miss}"]`); f.classList.remove('err'); void f.offsetWidth; f.classList.add('err');
    f.scrollIntoView({ behavior: 'smooth', block: 'center' }); mascot('play', 'shake');
    return toast(`กรุณาให้คะแนนข้อ ${miss + 1}`);
  }
  const btn = $('#svSend'); S.busy = true; btn.disabled = true; btn.querySelector('span').textContent = 'กำลังส่ง…';
  try {
    await submitSurvey({ surveyId: S.surveyId, kind: S.surveyKind, submitId: S.surveyKind === 'player' ? S.submitId : '',
      group: group ? group.textContent : '', ratings: S.ratings, suggestion: $('#svSuggest').value.trim() });
    showThanks();
  } catch (err) { toast(err.message); }
  finally { S.busy = false; btn.disabled = false; btn.querySelector('span').textContent = 'ส่งแบบสอบถาม'; }
});

function showThanks() {
  const c = S.surveyKind === 'player' ? S.claim : null;
  $('#thanks').innerHTML = c
    ? `<div class="reward-ico ${c.type === 'doll' ? '' : 'gift'}">${c.type === 'doll' ? '<img src="assets/img/mascot.png" alt="">' : '🎁'}</div>
       <h2>ขอบคุณที่ร่วมกิจกรรมครับ</h2>
       <p class="muted">กรุณา<b>แสดงหน้าจอนี้แก่เจ้าหน้าที่</b>เพื่อรับ${esc(c.reward)}</p>
       ${ticket(c)}
       <p class="fine center">${esc(S.player.name)}</p>`
    : `<div class="reward-ico">💙</div><h2>ขอบคุณสำหรับความคิดเห็นครับ</h2>
       <p class="muted">ความคิดเห็นของท่านจะนำไปพัฒนาการจัดนิทรรศการของมูลนิธิฯ ต่อไป</p>`;
  $('#thanks').innerHTML += `<div class="row"><button class="btn btn-go" id="bHome"><span>กลับหน้าแรก</span></button></div>`;
  $('#bHome').onclick = resetHome;
  go('thanks');
  mascot('setMood', 'happy'); mascot('play', 'happy'); mascot('burst', 40);
  setTimeout(() => say('ขอบคุณมากครับ 💛', 3000), 700);
}

// ===================================================== เฉลย
function toggleReview(r) {
  const box = $('#review'), btn = $('#bReview');
  const open = box.hidden;
  btn.setAttribute('aria-expanded', String(open));
  btn.querySelector('span').textContent = open ? '🔼 ซ่อนเฉลย' : '📋 ดูเฉลยคำตอบ';
  if (!open) { box.classList.remove('open'); setTimeout(() => (box.hidden = true), 250); return; }
  const right = r.review.filter((x) => x.your === x.correct).length;
  box.innerHTML = `<div class="rv-sum"><span class="ok">✔ ถูก ${right} ข้อ</span><span class="bad">✘ ผิด ${r.review.length - right} ข้อ</span></div>` +
    r.review.map((x, i) => {
      const q = S.quiz.questions.find((qq) => qq.id === x.id) || { question: '', choices: [] };
      const ok = x.your === x.correct;
      const opt = (n) => (n ? `${LETTERS[n - 1]}. ${esc(q.choices[n - 1] || '')}` : 'ไม่ได้ตอบ');
      return `<article class="rv ${ok ? 'ok' : 'bad'}" style="--i:${i}">
        <header><span class="rv-no">${i + 1}</span><span class="rv-tag">${ok ? 'ถูก' : 'ผิด'}</span></header>
        <p class="rv-q">${q.question}</p>
        ${ok ? `<p class="rv-a good">✔ ${opt(x.your)}</p>`
             : `<p class="rv-a wrong">✘ คำตอบของคุณ: ${opt(x.your)}</p><p class="rv-a good">✔ เฉลย: ${opt(x.correct)}</p>`}
      </article>`;
    }).join('');
  box.hidden = false; requestAnimationFrame(() => box.classList.add('open'));
  setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  mascot('play', 'nod');
}

function countUp(el, to, ms) {
  const t0 = performance.now();
  const step = (t) => { const p = Math.min((t - t0) / ms, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// ===================================================== Confetti
const cf = $('#confetti'), cx = cf.getContext('2d'); let parts = [], cfRun = false;
function confetti() {
  const W = (cf.width = innerWidth * devicePixelRatio), H = (cf.height = innerHeight * devicePixelRatio);
  const cols = ['#fbb900', '#ffd54a', '#ffffff', '#3d4fc4', '#ef4444', '#17b26a', '#38bdf8'];
  for (let i = 0; i < 160; i++) {
    const fromLeft = i % 2 === 0; // ยิงจากมุมล่างซ้าย/ขวา เข้าหากลางจอ
    parts.push({ x: fromLeft ? 0 : W, y: H * 0.75, vx: (8 + Math.random() * 14) * (fromLeft ? 1 : -1) * devicePixelRatio, vy: -(14 + Math.random() * 16) * devicePixelRatio,
      w: (6 + Math.random() * 6) * devicePixelRatio, h: (8 + Math.random() * 10) * devicePixelRatio, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: cols[i % cols.length], life: 0 });
  }
  if (!cfRun) { cfRun = true; requestAnimationFrame(cfTick); }
}
function cfTick() {
  cx.clearRect(0, 0, cf.width, cf.height);
  parts.forEach((p) => {
    p.life++; p.vy += 0.45 * devicePixelRatio; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.scale(1, Math.cos(p.life * 0.15));
    cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
  });
  parts = parts.filter((p) => p.y < cf.height + 40);
  if (parts.length) requestAnimationFrame(cfTick); else { cfRun = false; cx.clearRect(0, 0, cf.width, cf.height); }
}

// ===================================================== ท้องฟ้าดาว
(function sky() {
  const c = $('#sky'), g = c.getContext('2d'); let W, H, stars = [], shoot = null;
  const resize = () => {
    W = c.width = innerWidth * devicePixelRatio; H = c.height = innerHeight * devicePixelRatio;
    stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 5000) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.4 + 0.3) * devicePixelRatio, p: Math.random() * 6, s: 0.5 + Math.random() * 1.5, z: Math.random(),
      c: ['#ffffff', '#ffffff', '#ffffff', '#ffe27a', '#ff9bd2', '#8be9ff', '#c4a8ff'][(Math.random() * 7) | 0] }));
  };
  resize(); addEventListener('resize', resize);
  let my = 0; addEventListener('scroll', () => (my = scrollY), { passive: true });
  const loop = (t) => {
    g.clearRect(0, 0, W, H);
    stars.forEach((s) => {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 1000 * s.s + s.p));
      g.globalAlpha = a; g.fillStyle = s.c;
      g.beginPath(); g.arc(s.x, (s.y - my * s.z * 0.3 * devicePixelRatio + H) % H, s.r, 0, 7); g.fill();
    });
    if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.3, l: 0 };
    if (shoot) {
      shoot.l += 0.025; const len = 140 * devicePixelRatio, x = shoot.x + shoot.l * 500 * devicePixelRatio, y = shoot.y + shoot.l * 250 * devicePixelRatio;
      const gr = g.createLinearGradient(x, y, x - len, y - len / 2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = 1 - shoot.l; g.strokeStyle = gr; g.lineWidth = 2 * devicePixelRatio;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - len, y - len / 2); g.stroke();
      if (shoot.l >= 1) shoot = null;
    }
    g.globalAlpha = 1;
    requestAnimationFrame(loop);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(loop); else loop(0);
})();

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

boot();
