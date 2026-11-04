import { getQuiz, submitQuiz, checkPlayer, DEMO } from './api.js';

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
const SCREENS = { home: '#sHome', reg: '#sReg', quiz: '#sQuiz', send: '#sSend', result: '#sResult' };
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
  setTimeout(() => say('สวัสดีครับ! มาตอบคำถามกับน้อง DLTV กัน 🛰️'), 900);
  try {
    S.quiz = await getQuiz();
    $('#hQ').textContent = S.quiz.questions.length;
    $('#hPass').textContent = S.quiz.passScore;
    $('#qTotal').textContent = S.quiz.questions.length;
    $('#groups').innerHTML = S.quiz.groups.map((g) => `<button type="button" role="radio" aria-checked="false">${esc(g)}</button>`).join('');
    const b = $('#bStart'); b.disabled = false; b.querySelector('span').textContent = 'เริ่มภารกิจ 🚀';
  } catch (e) {
    $('#bStart span').textContent = 'โหลดข้อมูลไม่สำเร็จ';
    toast(e.message);
  }
}

$('#bStart').addEventListener('click', () => {
  go('reg'); mascot('play', 'jump');
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
    const r = await submitQuiz({ ...S.player, answers: S.answers, startedAt: S.startedAt });
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
  const C = 2 * Math.PI * 70;
  let html = `<h2>ผลคะแนนของคุณ ${esc(S.player.name)}</h2>
    <div class="ring ${r.passed ? '' : 'fail'}">
      <svg viewBox="0 0 170 170"><defs><linearGradient id="gradY" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffd23f"/><stop offset=".5" stop-color="#ff8a00"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient></defs>
        <circle class="bg" cx="85" cy="85" r="70"/><circle class="fg" cx="85" cy="85" r="70" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
      <div class="val"><div><b id="scoreNum">0</b><small>จาก ${r.total}</small></div></div>
    </div>`;
  if (r.prize) {
    html += `<span class="badge ok">🎉 ยินดีด้วย! คุณได้รับตุ๊กตา DLTV</span>
      <div class="ticket"><small>รหัสรับรางวัล</small><b>${esc(r.code)}</b></div>
      <p class="muted">กรุณาแสดงหน้าจอนี้ต่อเจ้าหน้าที่เพื่อรับตุ๊กตา</p>`;
  } else if (r.passed) {
    html += `<span class="badge ok">ผ่านเกณฑ์ 👏</span><p class="muted">${esc(r.note || '')}</p>`;
  } else {
    html += `<span class="badge bad">อีกนิดเดียว! ต้องได้ ${r.passScore} คะแนนขึ้นไป</span>
      <p class="muted">ข้อที่ยังตอบไม่ถูก: <b>${r.wrong.join(', ')}</b><br>แวะดูข้อมูลที่บูธ DLTV แล้วกลับมาลองใหม่นะครับ</p>`;
  }
  if (r.demo) html += `<p class="muted">(โหมดทดลอง — ผลนี้เป็นตัวอย่าง)</p>`;
  if (r.review) html += `<button class="btn btn-review" id="bReview" aria-expanded="false"><span>📋 ดูเฉลยคำตอบ</span></button><div class="review" id="review" hidden></div>`;
  html += `<div class="row"><button class="btn btn-go" id="bAgain"><span>${r.prize ? 'กลับหน้าแรก' : 'เล่นอีกครั้ง'}</span></button></div>`;
  $('#result').innerHTML = html;
  if (r.review) $('#bReview').onclick = () => toggleReview(r);
  go('result');

  setTimeout(() => {
    const fg = document.querySelector('.ring .fg'); if (fg) fg.style.strokeDashoffset = C * (1 - r.score / r.total);
    countUp($('#scoreNum'), r.score, 1500);
  }, 450);

  if (r.prize) {
    mascot('setMood', 'happy'); mascot('play', 'happy');
    setTimeout(() => { confetti(); mascot('burst', 50); say('เย้! เก่งที่สุดเลย 🎉', 3500); }, 900);
    setTimeout(confetti, 2300);
  } else if (r.passed) {
    mascot('play', 'jump'); say('เก่งมากครับ!', 2500);
  } else {
    mascot('setMood', 'sad'); mascot('play', 'sad');
    setTimeout(() => { say('ไม่เป็นไรนะ ลองใหม่ได้ครับ 💪', 3000); mascot('setMood', 'idle'); mascot('play', 'wave'); }, 2400);
  }
  $('#bAgain').onclick = () => {
    $('#fReg').reset(); [...$('#groups').children].forEach((x) => x.setAttribute('aria-checked', 'false'));
    mascot('setMood', 'idle'); go('home'); mascot('play', 'wave');
  };
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
