// ระบบหลังบ้าน: ดึงสถิติจาก GAS → แดชบอร์ด (กรองช่วงวันที่/ช่วงเวลา) + รายงาน PDF (A4)
import { getStats } from './api.js';

const $ = (s) => document.querySelector(s);
const LETTERS = ['ก', 'ข', 'ค', 'ง'];
const C = { navy: '#2b3990', teal: '#2a9d8f', amber: '#d99a2b', rose: '#c8576f', slate: '#94a3b8', green: '#3a9d6a', violet: '#7466b8', sky: '#4f86c6' };
const SERIES = [C.navy, C.teal, C.amber, C.rose, C.violet, C.sky, '#64748b'];
const GROUP_COLORS = [C.navy, C.teal, C.amber, C.rose, C.slate];
const LEVEL_COLORS = ['#3a9d6a', '#8bbf5a', '#e0b54a', '#e08a4a', '#c8576f']; // 5 → 1
const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

let KEY = sessionStorage.getItem('dltvKey') || '';
let S = null, timer = null, exporting = false;
const charts = {};

if (window.Chart) {
  Chart.defaults.font.family = 'Sarabun, sans-serif';
  Chart.defaults.font.size = 13;
  Chart.defaults.color = '#4b5563';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
}

// ===================================================== login / โหลดข้อมูล
$('#fLogin').addEventListener('submit', (e) => { e.preventDefault(); KEY = $('#iKey').value.trim(); load(true); });
$('#bLogout').onclick = () => { sessionStorage.removeItem('dltvKey'); location.reload(); };
$('#bRefresh').onclick = () => load();
['#fFrom', '#fTo', '#fSlot'].forEach((id) => ($(id).onchange = () => { markQuick(''); fixRange(); render(); }));
$('#fQuick').onclick = (e) => { const b = e.target.closest('button'); if (b) quick(b.dataset.q); };
$('#wSearch').oninput = renderWinners;
$('#wType').onchange = renderWinners;
$('#mask').onchange = renderWinners;
$('#bPdf').onclick = exportPdf;
if (KEY) load(true);

async function load(first) {
  if (first) { $('#bLogin').disabled = true; $('#loginErr').textContent = ''; }
  try {
    S = await getStats(KEY);
    sessionStorage.setItem('dltvKey', KEY);
    $('#login').hidden = true; $('#app').hidden = false;
    fillFilters(first); render();
    clearInterval(timer); timer = setInterval(() => { if (!exporting) load(); }, 60000);
  } catch (e) {
    if (first || !S) { $('#login').hidden = false; $('#app').hidden = true; $('#loginErr').textContent = e.message; sessionStorage.removeItem('dltvKey'); }
  } finally { $('#bLogin').disabled = false; }
}

// ===================================================== ตัวกรอง
const allDates = () => [...new Set([].concat(S.plays, S.claims, S.surveys).map((r) => r[0]))].sort();
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // เวลาไทย
const slotLabels = () => S.slots.map((s) => s.label).concat([S.outsideLabel]);
const OUT = () => S.slots.length; // index ของ "นอกช่วงเวลา" ในกราฟ/ตาราง
const slotKey = (i) => (i < 0 ? OUT() : i);

function fillFilters(first) {
  const dates = allDates();
  const opts = dates.map((d) => `<option value="${d}">${thDate(d)}</option>`).join('') || '<option value="">-</option>';
  const keep = [$('#fFrom').value, $('#fTo').value];
  $('#fFrom').innerHTML = opts; $('#fTo').innerHTML = opts;
  const sl = $('#fSlot').value;
  $('#fSlot').innerHTML = '<option value="">ทุกช่วงเวลา</option>' + slotLabels().map((l, i) => `<option value="${i}">${l}</option>`).join('');
  $('#fSlot').value = sl;
  if (first || !dates.includes(keep[0])) { $('#fFrom').value = dates[0] || ''; $('#fTo').value = dates[dates.length - 1] || ''; markQuick('all'); }
  else { $('#fFrom').value = keep[0]; $('#fTo').value = dates.includes(keep[1]) ? keep[1] : dates[dates.length - 1]; }
  $('#upd').textContent = 'ข้อมูล ณ ' + thStamp(S.updated) + ' · รีเฟรชอัตโนมัติทุก 1 นาที';
}
function quick(q) {
  const dates = allDates(); if (!dates.length) return;
  let d1 = dates[0], d2 = dates[dates.length - 1];
  if (q === 'today') d1 = d2 = today();
  if (q === 'yesterday') { const y = new Date(Date.now() + 7 * 3600e3 - 864e5).toISOString().slice(0, 10); d1 = d2 = y; }
  if (!dates.includes(d1)) { toastNo(q === 'today' ? 'วันนี้' : 'เมื่อวาน'); return; }
  $('#fFrom').value = d1; $('#fTo').value = d2; markQuick(q); render();
}
function toastNo(w) { $('#fSum').textContent = 'ยังไม่มีข้อมูลของ' + w; setTimeout(render, 1600); }
function markQuick(q) { [...$('#fQuick').children].forEach((b) => b.classList.toggle('on', b.dataset.q === q)); }
function fixRange() { if ($('#fFrom').value > $('#fTo').value) $('#fTo').value = $('#fFrom').value; }

function filt() {
  const from = $('#fFrom').value, to = $('#fTo').value, sl = $('#fSlot').value;
  const ok = (r) => r[0] >= from && r[0] <= to && (sl === '' || slotKey(r[1]) === +sl);
  return { from, to, sl, ok, dates: allDates().filter((d) => d >= from && d <= to) };
}

// ===================================================== คำนวณสถิติ (ใช้ร่วมกันทั้งหน้าจอและ PDF)
// plays:   [date, slot, group, score, phone, mask, seconds]
// claims:  [date, slot, 'doll'|'gift', group, score, received, name, phone, code, time]
// surveys: [date, slot, 'p'|'v', group, [r1..r7], suggestion, time]
function compute() {
  const F = filt();
  const P = S.plays.filter(F.ok), CL = S.claims.filter(F.ok), SV = S.surveys.filter(F.ok);
  const labels = slotLabels(), nS = labels.length;
  const usedSlots = labels.map((_, i) => i).filter((i) => i < OUT() || [].concat(S.plays, S.claims).some((r) => r[1] < 0));
  const shownSlots = F.sl === '' ? usedSlots : [+F.sl];
  const people = new Set(P.map((r) => r[4])).size;
  const perfect = P.filter((r) => r[3] >= S.passScore).length;
  const dolls = CL.filter((r) => r[2] === 'doll').length, gifts = CL.filter((r) => r[2] === 'gift').length;
  const received = CL.filter((r) => r[5]).length;

  // ต่อวัน
  const perDay = F.dates.map((d) => {
    const p = P.filter((r) => r[0] === d), c = CL.filter((r) => r[0] === d), s = SV.filter((r) => r[0] === d);
    return { d, n: p.length, people: new Set(p.map((r) => r[4])).size, perfect: p.filter((r) => r[3] >= S.passScore).length,
      dolls: c.filter((r) => r[2] === 'doll').length, gifts: c.filter((r) => r[2] === 'gift').length, rec: c.filter((r) => r[5]).length,
      sv: s.length, sat: s.length ? mean(s.map(rowMean)) : null };
  });
  // ต่อช่วงเวลา
  const bySlot = (arr, d) => labels.map((_, i) => arr.filter((r) => (!d || r[0] === d) && slotKey(r[1]) === i).length);
  const slotTot = bySlot(P);
  const peakI = shownSlots.reduce((a, i) => (slotTot[i] > (slotTot[a] || 0) ? i : a), shownSlots[0]);
  const quota = F.dates.map((d) => ({ d, given: S.slots.map((_, i) => S.claims.filter((r) => r[0] === d && r[1] === i && r[2] === 'doll').length) }));

  const groups = {};
  P.forEach((r) => (groups[r[2]] = (groups[r[2]] || 0) + 1));
  SV.filter((r) => r[2] === 'v').forEach((r) => (groups[r[3]] = (groups[r[3]] || 0) + 1));
  const scores = []; for (let i = 0; i <= S.questions.length; i++) scores.push(P.filter((r) => r[3] === i).length);
  const qs = S.questions.map((q, i) => {
    const cnt = [0, 0, 0, 0, 0]; P.forEach((r) => cnt[Number(r[5][i]) || 0]++);
    const answered = P.length - cnt[0];
    return { q, i, cnt, answered, rate: answered ? cnt[q.answer] / answered : 0 };
  });
  const hard = [...qs].filter((x) => x.answered).sort((a, b) => a.rate - b.rate).slice(0, 3)
    .map((x) => ({ ...x, wrong: [1, 2, 3, 4].filter((k) => k !== x.q.answer).sort((a, b) => x.cnt[b] - x.cnt[a])[0] }));

  // แบบสอบถาม
  const items = S.surveyItems.map((t, i) => {
    const v = SV.map((r) => r[4][i]).filter((x) => x >= 1);
    const dist = [5, 4, 3, 2, 1].map((k) => v.filter((x) => x === k).length);
    return { t, i, n: v.length, mean: v.length ? mean(v) : 0, sd: sd(v), dist };
  });
  const allR = SV.flatMap((r) => r[4].filter((x) => x >= 1));
  const svAll = { n: SV.length, p: SV.filter((r) => r[2] === 'p').length, v: SV.filter((r) => r[2] === 'v').length, mean: allR.length ? mean(allR) : 0, sd: sd(allR) };
  const sug = SV.filter((r) => r[5]).sort((a, b) => (b[0] + b[6]).localeCompare(a[0] + a[6]));

  return { F, P, CL, SV, labels, nS, shownSlots, people, perfect, dolls, gifts, received, perDay, bySlot, slotTot, peakI, quota,
    groups, scores, qs, hard, items, svAll, sug, avg: P.length ? mean(P.map((r) => r[3])) : 0, secs: P.length ? mean(P.map((r) => r[6])) : 0 };
}
const rowMean = (r) => mean(r[4].filter((x) => x >= 1));
function level(m) { return m >= 4.51 ? [5, 'มากที่สุด'] : m >= 3.51 ? [4, 'มาก'] : m >= 2.51 ? [3, 'ปานกลาง'] : m >= 1.51 ? [2, 'น้อย'] : [1, 'น้อยที่สุด']; }

function rangeText(st) {
  const F = st.F, d = F.from === F.to ? 'วันที่ ' + thDate(F.from) : `${thDate(F.from)} – ${thDate(F.to)} (${F.dates.length} วัน)`;
  return d + ' · ' + (F.sl === '' ? 'ทุกช่วงเวลา' : 'ช่วง ' + st.labels[+F.sl]);
}

function kpiList(st) {
  const quotaMax = st.F.dates.length * S.slots.reduce((a, s) => a + s.dolls, 0) / (st.F.sl === '' ? 1 : S.slots.length);
  const lv = level(st.svAll.mean);
  return [
    [C.navy, 'ผู้เล่นเกม', fmt(st.P.length) + ' ครั้ง', fmt(st.people) + ' คน (ไม่ซ้ำเบอร์)'],
    [C.green, 'ได้คะแนนเต็ม 10', fmt(st.perfect), st.P.length ? pct(st.perfect / st.P.length) + ' ของผู้เล่น' : '-'],
    [C.amber, 'แจกตุ๊กตา DLTV', `${fmt(st.dolls)} / ${fmt(Math.round(quotaMax))}`, 'ตามโควตาของช่วงที่เลือก'],
    [C.rose, 'รางวัลปลอบใจ', fmt(st.gifts), 'ชิ้น'],
    [C.teal, 'รับของแล้ว', `${fmt(st.received)} / ${fmt(st.CL.length)}`, 'รอรับ ' + Math.max(st.CL.length - st.received, 0)],
    [C.violet, 'ตอบแบบสอบถาม', fmt(st.svAll.n) + ' คน', `ผู้เล่น ${st.svAll.p} · ผู้เยี่ยมชม ${st.svAll.v}`],
    [C.sky, 'ความพึงพอใจเฉลี่ย', st.svAll.n ? st.svAll.mean.toFixed(2) : '-', st.svAll.n ? 'ระดับ' + lv[1] + ` (S.D. ${st.svAll.sd.toFixed(2)})` : 'ยังไม่มีข้อมูล'],
    [C.slate, 'ช่วงเวลาที่คนเล่นมากที่สุด', st.slotTot[st.peakI] ? st.labels[st.peakI].replace(' น.', '') : '-', st.slotTot[st.peakI] ? st.slotTot[st.peakI] + ' ครั้ง' : ''],
  ];
}
const kpiHtml = (list) => list.map(([c, l, v, s]) => `<div class="kpi" style="--c:${c}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('');

// ===================================================== กราฟ
function area(color, alpha = 0.14) {
  return (ctx) => {
    const { chart: c } = ctx; if (!c.chartArea) return hexA(color, alpha);
    const g = c.ctx.createLinearGradient(0, c.chartArea.top, 0, c.chartArea.bottom);
    g.addColorStop(0, hexA(color, alpha * 1.8)); g.addColorStop(1, hexA(color, 0)); return g;
  };
}
function curve(label, data, color, extra = {}) {
  return { label, data, borderColor: color, backgroundColor: area(color), pointBackgroundColor: '#fff', pointBorderColor: color,
    pointBorderWidth: 2, pointRadius: 3.5, pointHoverRadius: 6, borderWidth: 2.5, tension: 0.4, cubicInterpolationMode: 'monotone', fill: true, ...extra };
}
function lineOpts(legend = true, xTitle, yTitle) {
  return { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: legend, position: 'top', align: 'end' } },
    scales: { x: { grid: { display: false }, title: { display: !!xTitle, text: xTitle } },
              y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef0f3' }, border: { display: false }, title: { display: !!yTitle, text: yTitle } } } };
}
function cfgSlot(st) {
  const idx = st.F.sl === '' ? st.shownSlots : st.shownSlots, labels = idx.map((i) => st.labels[i].replace(' น.', ''));
  const many = st.F.dates.length > 1 && st.F.dates.length <= 7;
  const ds = many
    ? st.F.dates.map((d, k) => { const v = st.bySlot(st.P, d); return curve(thDate(d), idx.map((i) => v[i]), SERIES[k % SERIES.length], { fill: false, pointRadius: 3 }); })
    : [];
  ds.push(curve(many ? 'รวมทุกวันที่เลือก' : 'จำนวนครั้งที่เล่น', idx.map((i) => st.slotTot[i]), many ? C.slate : C.navy,
    many ? { borderDash: [6, 5], fill: false, pointRadius: 0, borderWidth: 2 } : {
      pointRadius: idx.map((i) => (i === st.peakI ? 7 : 3.5)), pointBackgroundColor: idx.map((i) => (i === st.peakI ? C.amber : '#fff')),
      pointBorderColor: idx.map((i) => (i === st.peakI ? C.amber : C.navy)) }));
  ds.push(curve('ได้ตุ๊กตา', idx.map((i) => st.bySlot(st.CL.filter((r) => r[2] === 'doll'))[i]), C.amber, { fill: false, borderWidth: 2 }));
  return { type: 'line', data: { labels, datasets: ds }, options: lineOpts(true, '', 'จำนวน') };
}
function cfgDay(st) {
  const D = st.perDay, labels = D.map((x) => thDate(x.d));
  if (D.length < 2) {
    const bar = (l, k, c) => ({ label: l, data: D.map((x) => x[k]), backgroundColor: hexA(c, 0.85), borderRadius: 6, maxBarThickness: 46 });
    return { type: 'bar', data: { labels, datasets: [bar('ผู้เล่นเกม', 'n', C.navy), bar('ตุ๊กตา', 'dolls', C.amber), bar('รางวัลปลอบใจ', 'gifts', C.rose), bar('แบบสอบถาม', 'sv', C.teal)] }, options: lineOpts(true) };
  }
  return { type: 'line', data: { labels, datasets: [
    curve('ผู้เล่นเกม', D.map((x) => x.n), C.navy),
    curve('ตุ๊กตา', D.map((x) => x.dolls), C.amber, { fill: false }),
    curve('รางวัลปลอบใจ', D.map((x) => x.gifts), C.rose, { fill: false }),
    curve('แบบสอบถาม', D.map((x) => x.sv), C.teal, { fill: false })] }, options: lineOpts(true) };
}
function cfgScore(st) {
  const pass = S.passScore;
  return { type: 'line', data: { labels: st.scores.map((_, i) => String(i)), datasets: [curve('จำนวนครั้ง', st.scores, C.teal, {
      pointBackgroundColor: st.scores.map((_, i) => (i >= pass ? C.green : '#fff')), pointBorderColor: st.scores.map((_, i) => (i >= pass ? C.green : C.teal)),
      pointRadius: st.scores.map((_, i) => (i >= pass ? 6 : 3.5)) })] },
    options: { ...lineOpts(false, 'คะแนน', 'จำนวนครั้ง'), plugins: { legend: { display: false },
      tooltip: { callbacks: { title: (c) => c[0].label + ' คะแนน' + (+c[0].label >= pass ? ' (คะแนนเต็ม)' : '') } } } } };
}
function cfgGroup(st) {
  return { type: 'doughnut', data: { labels: Object.keys(st.groups), datasets: [{ data: Object.values(st.groups), backgroundColor: GROUP_COLORS, borderColor: '#fff', borderWidth: 2 }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right' } } } };
}
function cfgQ(st) {
  return { type: 'bar', data: { labels: st.qs.map((x) => 'ข้อ ' + (x.i + 1)), datasets: [{ label: '% ตอบถูก', data: st.qs.map((x) => +(x.rate * 100).toFixed(1)), borderRadius: 4, barThickness: 14,
      backgroundColor: st.qs.map((x) => hexA(x.rate >= 0.8 ? C.green : x.rate >= 0.6 ? C.amber : C.rose, 0.85)) }] },
    options: { maintainAspectRatio: false, indexAxis: 'y',
      scales: { x: { min: 0, max: 100, ticks: { callback: (v) => v + '%' }, grid: { color: '#eef0f3' }, border: { display: false } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => wrap(st.qs[c[0].dataIndex].q.question), label: (c) => ` ตอบถูก ${c.raw}%` } } } } };
}
function cfgSv(st) {
  return { type: 'bar', data: { labels: st.items.map((x) => 'ข้อ ' + (x.i + 1)), datasets: [{ label: 'ค่าเฉลี่ย', data: st.items.map((x) => +x.mean.toFixed(2)), borderRadius: 4, barThickness: 14,
      backgroundColor: st.items.map((x) => LEVEL_COLORS[5 - level(x.mean)[0]]) }] },
    options: { maintainAspectRatio: false, indexAxis: 'y',
      scales: { x: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: '#eef0f3' }, border: { display: false } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => wrap(st.items[c[0].dataIndex].t), label: (c) => ` ค่าเฉลี่ย ${c.raw} (${level(c.raw)[1]})` } } } } };
}
function cfgSvDist(st) {
  const names = ['มากที่สุด (5)', 'มาก (4)', 'ปานกลาง (3)', 'น้อย (2)', 'น้อยที่สุด (1)'];
  return { type: 'bar', data: { labels: st.items.map((x) => 'ข้อ ' + (x.i + 1)), datasets: names.map((n, k) => ({ label: n, backgroundColor: LEVEL_COLORS[k],
      data: st.items.map((x) => (x.n ? +((x.dist[k] / x.n) * 100).toFixed(1) : 0)), barThickness: 14 })) },
    options: { maintainAspectRatio: false, indexAxis: 'y',
      scales: { x: { stacked: true, max: 100, ticks: { callback: (v) => v + '%' }, grid: { color: '#eef0f3' }, border: { display: false } }, y: { stacked: true, grid: { display: false } } },
      plugins: { legend: { position: 'top', labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw}%` } } } } };
}

// ===================================================== ตาราง (ใช้ร่วมกัน)
function quotaHtml(st) {
  if (!st.quota.length) return '<p class="empty">ยังไม่มีข้อมูล</p>';
  const idx = st.F.sl === '' ? S.slots.map((_, i) => i) : (+st.F.sl < S.slots.length ? [+st.F.sl] : []);
  if (!idx.length) return '<p class="empty">นอกช่วงเวลากิจกรรมไม่มีการแจกตุ๊กตา</p>';
  return '<table><tr><th class="l">วันที่</th>' + idx.map((i) => `<th>${S.slots[i].label}</th>`).join('') + '<th>รวม</th></tr>' +
    st.quota.map((q) => {
      let tot = 0, max = 0;
      const cells = idx.map((i) => { const g = q.given[i], m = S.slots[i].dolls; tot += g; max += m;
        return `<td class="q-cell"><span class="q-num">${g}</span> / ${m}<div class="q-bar"><i class="${g >= m ? 'full' : ''}" style="width:${Math.min(100, (g / m) * 100)}%"></i></div></td>`; }).join('');
      return `<tr><td class="l">${thDate(q.d)}</td>${cells}<td><b>${tot}</b> / ${max}</td></tr>`;
    }).join('') + '</table>';
}
function hardHtml(st) {
  if (!st.hard.length) return '<p class="empty">ยังไม่มีข้อมูล</p>';
  return '<div class="hard">' + st.hard.map((x) => `<article>
    <div><span class="no">ข้อ ${x.i + 1}</span><span class="rate">${pct(x.rate)}</span> <small>ตอบถูก</small></div>
    <p>${esc(x.q.question)}</p>
    <p class="rightpick">เฉลย: ${LETTERS[x.q.answer - 1]}. ${esc(x.q.choices[x.q.answer - 1])}</p>
    <p class="wrongpick">ตอบผิดบ่อยที่สุด: ${LETTERS[x.wrong - 1]}. ${esc(x.q.choices[x.wrong - 1])} (${x.cnt[x.wrong]} คน)</p></article>`).join('') + '</div>';
}
function svTableHtml(st) {
  if (!st.svAll.n) return '<p class="empty">ยังไม่มีผู้ตอบแบบสอบถาม</p>';
  const row = (no, t, x) => { const lv = level(x.mean); return `<tr><td>${no}</td><td class="l">${esc(t)}</td>${x.dist.map((d) => `<td>${d}</td>`).join('')}
    <td class="mean">${x.mean.toFixed(2)}</td><td>${x.sd.toFixed(2)}</td><td><span class="lvl l${lv[0]}">${lv[1]}</span></td></tr>`; };
  const tot = { mean: st.svAll.mean, sd: st.svAll.sd, dist: [0, 1, 2, 3, 4].map((k) => st.items.reduce((a, x) => a + x.dist[k], 0)) };
  return `<table class="sv-tbl"><tr><th>ข้อ</th><th class="l">รายการประเมิน</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th><th>x̄</th><th>S.D.</th><th>ระดับ</th></tr>` +
    st.items.map((x) => row(x.i + 1, x.t, x)).join('') + `<tr class="tot">${row('', 'ภาพรวม', tot).slice(4)}` + '</table>';
}
function sugHtml(list, limit) {
  const L = limit ? list.slice(0, limit) : list;
  return L.length ? L.map((r) => `<article><small>${thDate(r[0])} ${esc(r[6])} น. · ${r[2] === 'p' ? 'ผู้เล่นกิจกรรม' : 'ผู้เยี่ยมชมบูธ'} · ${esc(r[3])}</small>${esc(r[5])}</article>`).join('')
    : '<p class="empty">ยังไม่มีข้อเสนอแนะ</p>';
}
function dailyHtml(st) {
  const R = st.perDay; if (!R.length) return '<p class="empty">ยังไม่มีข้อมูล</p>';
  const sum = (k) => R.reduce((a, x) => a + x[k], 0);
  const sat = st.svAll.n ? st.svAll.mean.toFixed(2) : '-';
  return `<table><tr><th class="l">วันที่</th><th>ผู้เล่นเกม</th><th>จำนวนคน</th><th>คะแนนเต็ม</th><th>ตุ๊กตา</th><th>รางวัลปลอบใจ</th><th>รับของแล้ว</th><th>แบบสอบถาม</th><th>ความพึงพอใจ</th></tr>` +
    R.map((x) => `<tr><td class="l">${thDate(x.d)}</td><td>${x.n}</td><td>${x.people}</td><td>${x.perfect}</td><td>${x.dolls}</td><td>${x.gifts}</td><td>${x.rec}</td><td>${x.sv}</td><td>${x.sat === null ? '-' : x.sat.toFixed(2)}</td></tr>`).join('') +
    (R.length > 1 ? `<tr class="tot"><td class="l">รวม</td><td>${sum('n')}</td><td>${st.people}</td><td>${sum('perfect')}</td><td>${sum('dolls')}</td><td>${sum('gifts')}</td><td>${sum('rec')}</td><td>${sum('sv')}</td><td>${sat}</td></tr>` : '') + '</table>';
}
function winnersHtml(W, mask, start = 0) {
  return `<table><tr><th>#</th><th class="l">วันที่ / เวลา</th><th class="l">ช่วงเวลา</th><th class="l">ชื่อ-สกุล</th><th>เบอร์โทร</th><th class="l">กลุ่ม</th><th>คะแนน</th><th class="l">รางวัล</th><th>รหัสรางวัล</th><th>สถานะ</th></tr>` +
    W.map((w, i) => `<tr><td>${start + i + 1}</td><td class="l">${thDate(w[0])} ${esc(w[9])}</td><td class="l">${esc(slotLabels()[slotKey(w[1])])}</td><td class="l">${esc(w[6])}</td>
      <td>${phone(w[7], mask)}</td><td class="l">${esc(w[3])}</td><td>${w[4]}</td><td class="l">${w[2] === 'doll' ? 'ตุ๊กตา DLTV' : 'รางวัลปลอบใจ'}</td><td><b>${esc(w[8])}</b></td>
      <td>${w[5] ? '<span class="pill ok">รับแล้ว</span>' : '<span class="pill wait">รอรับ</span>'}</td></tr>`).join('') + '</table>';
}

// ===================================================== แสดงผลบนหน้าจอ
function render() {
  const st = compute();
  $('#fSum').textContent = rangeText(st);
  $('#kpis').innerHTML = kpiHtml(kpiList(st));
  $('#peak').innerHTML = st.slotTot[st.peakI] ? `ช่วงที่คนเล่นมากที่สุด <b>${st.labels[st.peakI]}</b> (${st.slotTot[st.peakI]} ครั้ง)` : '';
  draw('cSlot', cfgSlot(st)); draw('cDay', cfgDay(st)); draw('cScore', cfgScore(st)); draw('cGroup', cfgGroup(st)); draw('cQ', cfgQ(st));
  draw('cSv', cfgSv(st)); draw('cSvDist', cfgSvDist(st));
  $('#quota').innerHTML = quotaHtml(st);
  $('#hard').innerHTML = hardHtml(st);
  $('#svNote').innerHTML = st.svAll.n ? `ผู้ตอบ ${st.svAll.n} คน · ค่าเฉลี่ยรวม <b>${st.svAll.mean.toFixed(2)}</b> (${level(st.svAll.mean)[1]})` : '';
  $('#svTable').innerHTML = svTableHtml(st);
  $('#sugCount').textContent = st.sug.length + ' รายการ';
  $('#sug').innerHTML = sugHtml(st.sug);
  $('#daily').innerHTML = dailyHtml(st);
  renderWinners();
}
function winnersList() {
  const q = $('#wSearch').value.trim().toLowerCase(), t = $('#wType').value;
  return compute().CL.filter((w) => (!t || w[2] === t) && (!q || [w[6], w[7], w[8]].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (a[0] + a[9]).localeCompare(b[0] + b[9]));
}
function renderWinners() {
  if (!S) return;
  const W = winnersList();
  $('#winCount').textContent = W.length + ' คน';
  $('#winners').innerHTML = W.length ? winnersHtml(W, $('#mask').checked) : '<p class="empty">ยังไม่มีผู้ขอรับรางวัล</p>';
}
function draw(id, cfg) {
  if (!window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), cfg);
}

// ===================================================== Export PDF
// สร้างรายงานแยก (กว้าง 760px) → จับภาพทีละส่วน → วางลง A4 เอง (ไม่มีส่วนใดถูกตัดครึ่งหน้า)
async function exportPdf() {
  if (!S || exporting) return;
  if (!window.html2canvas || !window.jspdf) { alert('โหลดไลบรารีสร้าง PDF ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'); return; }
  exporting = true; $('#busy').hidden = false; $('#busyText').textContent = 'กำลังสร้าง PDF…';
  const root = $('#pdfRoot'), made = [];
  const scrollY = window.scrollY; window.scrollTo(0, 0);
  try {
    const st = compute();
    const meta = `ข้อมูล: ${rangeText(st)} · ข้อมูล ณ ${thStamp(S.updated)}`;
    const box = (id, w, h, title, note = '') => `<div class="panel"><h2>${title}</h2>${note ? `<p>${note}</p>` : ''}<canvas id="${id}" width="${w}" height="${h}"></canvas></div>`;
    let html = `
      <div data-block="first" class="rp-head">
        <img src="assets/img/foundation-logo.png" alt="">
        <div><h1>รายงานสรุปผลกิจกรรมตอบคำถามชิงตุ๊กตา DLTV<br>และความพึงพอใจต่อการจัดแสดงนิทรรศการ</h1>
          <p>มูลนิธิการศึกษาทางไกลผ่านดาวเทียม ในพระบรมราชูปถัมภ์</p><p class="meta">${meta}</p></div>
        <img class="dl" src="assets/img/dltv-logo.png" alt="">
      </div>
      <div data-block="run" class="rp-run"><b>รายงานสรุปผลกิจกรรม DLTV</b><span>${meta}</span></div>
      <div data-block><h2>ภาพรวม</h2><div class="k4">${kpiHtml(kpiList(st))}</div></div>
      <div data-block>${box('pSlot', 734, 220, 'จำนวนผู้เล่นเกมตามช่วงเวลา', st.slotTot[st.peakI] ? `ช่วงที่คนเล่นมากที่สุด ${st.labels[st.peakI]} (${st.slotTot[st.peakI]} ครั้ง)` : '')}</div>
      <div data-block><h2>การแจกตุ๊กตา DLTV ตามช่วงเวลา (โควตา 5 ตัว/ช่วง · 20 ตัว/วัน)</h2>${quotaHtml(st)}</div>
      <div data-block class="two">${box('pDay', 346, 190, 'จำนวนผู้เข้าร่วมรายวัน')}${box('pScore', 346, 190, 'การกระจายคะแนน')}</div>
      <div data-block class="two">${box('pGroup', 346, 190, 'กลุ่มผู้เข้าร่วม')}${box('pQ', 346, 190, 'อัตราตอบถูกรายข้อ')}</div>
      <div data-block><h2>ข้อที่ตอบผิดมากที่สุด</h2>${hardHtml(st)}</div>
      <div data-block><h2>ผลแบบสอบถามความพึงพอใจ${st.svAll.n ? ` (ผู้ตอบ ${st.svAll.n} คน: ผู้เล่น ${st.svAll.p} · ผู้เยี่ยมชม ${st.svAll.v})` : ''}</h2>${svTableHtml(st)}
        <p class="muted" style="margin:6px 0 0">เกณฑ์: 4.51–5.00 มากที่สุด · 3.51–4.50 มาก · 2.51–3.50 ปานกลาง · 1.51–2.50 น้อย · 1.00–1.50 น้อยที่สุด</p></div>
      <div data-block class="two">${box('pSv', 346, 200, 'ค่าเฉลี่ยความพึงพอใจรายข้อ')}${box('pSvDist', 346, 200, 'การกระจายระดับความพึงพอใจ')}</div>`;
    for (let i = 0; i < Math.max(st.sug.length, 1); i += 24) {
      html += `<div data-block><h2>ข้อเสนอแนะเพิ่มเติม${i ? ' (ต่อ)' : ` (${st.sug.length} รายการ)`}</h2><div class="sug">${sugHtml(st.sug.slice(i, i + 24))}</div></div>`;
    }
    html += `<div data-block><h2>สรุปรายวัน</h2>${dailyHtml(st)}</div>`;
    const W = winnersList();
    if ($('#incWin').checked && W.length) {
      for (let i = 0; i < W.length; i += 30) {
        html += `<div data-block><h2>รายชื่อผู้ขอรับรางวัล${i ? ' (ต่อ)' : ` (${W.length} คน)`}</h2>${winnersHtml(W.slice(i, i + 30), $('#mask').checked, i)}</div>`;
      }
    }
    root.innerHTML = html;

    const fixed = (cfg) => { cfg.options = { ...cfg.options, responsive: false, animation: false, devicePixelRatio: 2, maintainAspectRatio: false }; return cfg; };
    [['pSlot', cfgSlot], ['pDay', cfgDay], ['pScore', cfgScore], ['pGroup', cfgGroup], ['pQ', cfgQ], ['pSv', cfgSv], ['pSvDist', cfgSvDist]]
      .forEach(([id, fn]) => made.push(new Chart(document.getElementById(id), fixed(fn(st)))));

    await Promise.all([...root.querySelectorAll('img')].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    if (document.fonts) await document.fonts.ready;
    await sleep(150);

    const shot = (el) => html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, scrollX: 0, scrollY: 0, windowWidth: 1200 });
    const blocks = [...root.querySelectorAll('[data-block]')], imgs = [];
    for (let i = 0; i < blocks.length; i++) {
      $('#busyText').textContent = `กำลังสร้าง PDF… ${Math.round(((i + 1) / blocks.length) * 100)}%`;
      imgs.push({ kind: blocks[i].dataset.block, canvas: await shot(blocks[i]) });
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const M = 12, Wd = 210 - M * 2, top = M, bottom = 297 - 14;
    const mm = (cv) => (cv.height / cv.width) * Wd;
    const put = (cv, y) => { pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', M, y, Wd, mm(cv)); return y + mm(cv); };
    const run = imgs.find((x) => x.kind === 'run').canvas;
    let y = top;
    imgs.filter((x) => x.kind !== 'run').forEach((x, i) => {
      if (i > 0 && y + mm(x.canvas) > bottom) { pdf.addPage(); y = put(run, top) + 1; }
      y = put(x.canvas, y);
    });
    const pages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      pdf.setPage(p); pdf.setDrawColor(229, 231, 235); pdf.line(M, 297 - 10, 210 - M, 297 - 10);
      pdf.setFontSize(8.5); pdf.setTextColor(120);
      pdf.text('DLTV Quiz & Satisfaction Report', M, 297 - 6);
      pdf.text(`${p} / ${pages}`, 210 - M, 297 - 6, { align: 'right' });
    }
    pdf.save(`DLTV-สรุปผล-${st.F.from === st.F.to ? st.F.from : st.F.from + '_' + st.F.to}.pdf`);
  } catch (e) {
    console.error(e); alert('สร้าง PDF ไม่สำเร็จ: ' + e.message);
  } finally {
    made.forEach((c) => c.destroy()); root.innerHTML = '';
    window.scrollTo(0, scrollY); $('#busy').hidden = true; exporting = false;
  }
}

// ===================================================== helpers
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function sd(a) { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function pct(x) { return (x * 100).toFixed(1) + '%'; }
function fmt(n) { return Number(n).toLocaleString('th-TH'); }
function thDate(d) { const p = String(d).split('-'); return p.length === 3 ? `${+p[2]} ${TH_MONTH[+p[1] - 1]} ${+p[0] + 543}` : d; }
function thStamp(s) {
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})/);
  return m ? `${+m[1]} ${TH_MONTH[+m[2] - 1]} ${+m[3] + (+m[3] < 2400 ? 543 : 0)} ${m[4]} น.` : s;
}
function phone(p, mask) { return mask ? String(p).replace(/^(\d{3})\d{3}(\d{4})$/, '$1-xxx-$2') : String(p).replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3'); }
function wrap(s) { return String(s).match(/.{1,48}/g) || [s]; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
