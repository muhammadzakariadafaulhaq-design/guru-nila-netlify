import { getValue, setValue, addChatMessage, getRecentChat } from './storage.js';
import { listenArabic, speakArabic, speechRecognitionAvailable } from './voice.js';

const $ = (selector) => document.querySelector(selector);
const loginScreen = $('#login-screen');
const appScreen = $('#app-screen');
const toastNode = $('#toast');
let timerInterval = null;
let timerSeconds = 25 * 60;
let activeRecognition = null;

const tasks = [
  ['04:00', 'Bangun, persiapan ibadah malam dan Subuh'],
  ['Subuh', 'Shalat Subuh dan dzikir pagi'],
  ['06:00', 'Sarapan'],
  ['06:30', 'Murajaah Al-Qur’an sesi pertama'],
  ['08:00', 'Mendengar bahasa Arab dan shadowing'],
  ['09:10', 'Nahwu, sharaf, atau qira’ah'],
  ['12:00', 'Istirahat dan shalat sesuai waktu'],
  ['14:00', 'Makan siang / makan sore'],
  ['14:30', 'Murajaah Al-Qur’an sesi kedua'],
  ['Ashar', 'Dzikir petang dan kegiatan ringan'],
  ['16:00', 'Olahraga ringan dan peregangan'],
  ['19:15', 'Skincare dan persiapan tidur'],
  ['20:00', 'Tidur dan istirahat'],
];
const juzLabels = ['Juz 30', 'Juz 29', ...Array.from({ length: 14 }, (_, i) => `Juz ${i + 1}`)];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toast(message) {
  toastNode.textContent = message;
  toastNode.classList.add('show');
  window.setTimeout(() => toastNode.classList.remove('show'), 2500);
}

function sound(freq = 660, duration = 0.12, volume = 0.045) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = freq;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.onended = () => context.close();
  } catch { /* Sound is a decorative enhancement; the app remains usable without it. */ }
}

function celebration() {
  sound(880, 0.16);
  window.setTimeout(() => sound(1175, 0.22), 100);
  toast('BOOM! Satu langkah baik sudah selesai ✨');
  for (let i = 0; i < 18; i += 1) {
    const dot = document.createElement('span');
    dot.textContent = ['✦', '✧', '·'][i % 3];
    dot.style.cssText = `position:fixed;z-index:20;left:${46 + Math.random() * 8}%;top:${44 + Math.random() * 12}%;color:${['#9a82cb','#d5a6bd','#d9ad60'][i % 3]};font-size:${12 + Math.random() * 18}px;pointer-events:none;transition:transform .8s ease,opacity .8s ease;`;
    document.body.append(dot);
    requestAnimationFrame(() => { dot.style.transform = `translate(${(Math.random() - .5) * 260}px,${(Math.random() - .5) * 240}px) rotate(${Math.random() * 360}deg)`; dot.style.opacity = '0'; });
    window.setTimeout(() => dot.remove(), 900);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Permintaan gagal (${response.status}).`);
  return payload;
}

async function checkSession() {
  try {
    const result = await requestJson('/api/me', { method: 'GET', headers: {} });
    showApp(Boolean(result.authenticated));
  } catch { showApp(false); }
}

function showApp(isLoggedIn) {
  loginScreen.classList.toggle('hidden', isLoggedIn);
  appScreen.classList.toggle('hidden', !isLoggedIn);
  if (isLoggedIn) initialiseApp();
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  const error = $('#login-error');
  button.disabled = true;
  error.textContent = '';
  try {
    await requestJson('/api/login', { method: 'POST', body: JSON.stringify({ password: $('#login-password').value }) });
    $('#login-password').value = '';
    showApp(true);
  } catch (err) { error.textContent = err.message; }
  finally { button.disabled = false; }
});

$('#logout-button').addEventListener('click', async () => {
  try { await requestJson('/api/logout', { method: 'POST', body: '{}' }); } catch { /* Clear visible session regardless. */ }
  window.speechSynthesis?.cancel();
  showApp(false);
});

function setActiveTab(name) {
  document.querySelectorAll('.tab-button').forEach((button) => button.classList.toggle('active', button.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('hidden', panel.id !== `tab-${name}`));
}
document.querySelectorAll('.tab-button').forEach((button) => button.addEventListener('click', () => setActiveTab(button.dataset.tab)));

async function renderTasks() {
  const today = localDateKey();
  $('#today-date').textContent = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date());
  const saved = await getValue('tasks', today, {});
  const list = $('#task-list');
  list.replaceChildren();
  tasks.forEach(([time, title], index) => {
    const id = `${today}-${index}`;
    const label = document.createElement('label');
    label.className = `task-item ${saved[id] ? 'done' : ''}`;
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = Boolean(saved[id]);
    const timeNode = document.createElement('span'); timeNode.className = 'task-time'; timeNode.textContent = time;
    const nameNode = document.createElement('span'); nameNode.className = 'task-name'; nameNode.textContent = title;
    input.addEventListener('change', async () => {
      saved[id] = input.checked;
      await setValue('tasks', today, saved);
      label.classList.toggle('done', input.checked);
      updateStats(saved);
      if (input.checked) celebration();
    });
    label.append(input, timeNode, nameNode);
    list.append(label);
  });
  updateStats(saved);
}

async function renderJuz() {
  const saved = await getValue('juz', 'completed', {});
  const list = $('#juz-list');
  list.replaceChildren();
  juzLabels.forEach((label, index) => {
    const item = document.createElement('label'); item.className = 'juz-item';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(saved[index]);
    const text = document.createElement('span'); text.textContent = label;
    input.addEventListener('change', async () => {
      saved[index] = input.checked; await setValue('juz', 'completed', saved); updateJuzStats(saved);
      if (input.checked) celebration();
    });
    item.append(input, text); list.append(item);
  });
  updateJuzStats(saved);
  $('#murajaah-notes').value = await getValue('settings', 'murajaahNotes', '');
}

function updateStats(saved) {
  const complete = Object.values(saved).filter(Boolean).length;
  $('#task-progress').textContent = `${complete}/${tasks.length}`;
}
function updateJuzStats(saved) {
  const complete = Object.values(saved).filter(Boolean).length;
  $('#juz-progress').textContent = `${complete}/16`;
  $('#juz-progress-bar').style.width = `${complete / 16 * 100}%`;
}

$('#save-notes').addEventListener('click', async () => {
  await setValue('settings', 'murajaahNotes', $('#murajaah-notes').value.slice(0, 5000));
  $('#notes-status').textContent = 'Catatan tersimpan di browser perangkat ini.';
  toast('Catatan murajaah tersimpan.');
});

function updateTimer() { $('#timer-display').textContent = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`; }
$('#timer-start').addEventListener('click', () => {
  if (timerInterval) {
    clearInterval(timerInterval); timerInterval = null; $('#timer-start').textContent = 'Lanjutkan'; return;
  }
  sound(560, .13); $('#timer-start').textContent = 'Jeda';
  timerInterval = window.setInterval(() => {
    timerSeconds -= 1; updateTimer();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval); timerInterval = null; timerSeconds = 0; updateTimer();
      sound(900, .3, .08); window.setTimeout(() => sound(700, .35, .08), 250);
      $('#timer-start').textContent = 'Mulai lagi'; toast('Sesi fokus selesai. Saatnya jeda sebentar.');
    }
  }, 1000);
});
$('#timer-reset').addEventListener('click', () => { clearInterval(timerInterval); timerInterval = null; timerSeconds = 25 * 60; updateTimer(); $('#timer-start').textContent = 'Mulai'; });

function addMessage(role, text) {
  const box = document.createElement('div'); box.className = `message ${role}`;
  const title = document.createElement('strong'); title.textContent = role === 'assistant' ? 'Guru Nila 🦉' : 'Hilyah';
  const paragraph = document.createElement('p'); paragraph.textContent = text;
  if (role === 'assistant' && /[\u0600-\u06FF]/.test(text)) paragraph.dir = 'rtl';
  box.append(title, paragraph);
  if (role === 'assistant') {
    const speakButton = document.createElement('button'); speakButton.className = 'speak-button'; speakButton.type = 'button'; speakButton.textContent = '🔊 Dengarkan';
    speakButton.addEventListener('click', () => speakArabic(text, (status) => { $('#voice-status').textContent = status; }));
    box.append(speakButton);
  }
  $('#chat-messages').append(box);
  $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
}

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chat-input'); const message = input.value.trim();
  if (!message) return;
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true; input.value = ''; addMessage('user', message);
  try {
    const previous = (await getRecentChat(8)).map(({ role, text }) => ({ role: role === 'assistant' ? 'model' : 'user', text }));
    const weakTopics = await getValue('settings', 'weakTopics', []);
    const history = previous.slice(-6);
    const response = await requestJson('/api/guru-chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history,
        academicContext: { currentLevel: 'Arabic learner; adjust to demonstrated ability', focus: 'الفصحى، النحو، الصرف، القراءة والمحادثة', weakTopics },
      }),
    });
    addMessage('assistant', response.reply);
    await addChatMessage('user', message); await addChatMessage('assistant', response.reply);
  } catch (error) {
    addMessage('assistant', `عُذْرًا، ${error.message}`);
  } finally { submit.disabled = false; input.focus(); }
});

$('#mic-button').addEventListener('click', () => {
  if (!speechRecognitionAvailable()) { $('#voice-status').textContent = 'Browser ini belum mendukung pengenal suara. Ketik pesan sebagai alternatif.'; return; }
  $('#mic-button').disabled = true;
  activeRecognition = listenArabic({
    onText: (text) => { $('#chat-input').value = text; $('#voice-status').textContent = 'Ucapan dikenali. Periksa teks lalu tekan Kirim.'; },
    onStatus: (status) => { $('#voice-status').textContent = status; if (status.startsWith('Selesai')) $('#mic-button').disabled = false; },
    onError: (error) => { $('#voice-status').textContent = error; $('#mic-button').disabled = false; },
  });
  window.setTimeout(() => { $('#mic-button').disabled = false; }, 12000);
});

// Restore a small recent chat window for the visible history. Full academic notes stay local.
async function restoreChat() {
  const entries = await getRecentChat(12);
  if (!entries.length) return;
  $('#chat-messages').replaceChildren();
  entries.forEach((entry) => addMessage(entry.role, entry.text));
}

async function initialiseApp() {
  await renderTasks();
  await renderJuz();
  await restoreChat();
  updateTimer();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
checkSession();
