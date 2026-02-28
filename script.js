import { auth, db } from './firebase.js';

// API Key dari Google AI Studio
const API_KEY = 'AIzaSyDrxOBWDdf5O4CYgbR9pfqHmVBAVS4zVYc';
let chatHistory = [];
let currentKelas = null;

// ================================
// DATA KELAS & MATERI
// Nanti ini diambil dari database
// Sekarang masih hardcode kosong
// ================================
const data = {
  kelas: [] // nanti diisi dari database
};

// ================================
// RENDER NAVBAR TABS
// ================================
function renderNavTabs() {
  const navTabs = document.getElementById('navTabs');
  if (data.kelas.length === 0) {
    navTabs.innerHTML = '';
    return;
  }
  navTabs.innerHTML = data.kelas.map((k, i) => `
    <button class="tab-btn ${i === 0 ? 'active' : ''}" onclick="showKelas('${k.id}', this)">
      ${k.nama}
    </button>
  `).join('');
}

// ================================
// RENDER MATERI GRID
// ================================
function renderMateri(kelasId) {
  const kelas = data.kelas.find(k => k.id === kelasId);
  const kelasContent = document.getElementById('kelasContent');

  if (!kelas || kelas.materi.length === 0) {
    kelasContent.innerHTML = `
      <h2 class="kelas-header">${kelas ? kelas.nama : ''}</h2>
      <div class="empty-state">📭 Belum ada materi untuk kelas ini.</div>
    `;
    return;
  }

  kelasContent.innerHTML = `
    <h2 class="kelas-header">${kelas.nama}</h2>
    <div class="materi-grid">
      ${kelas.materi.map(m => `
        <div class="materi-card" onclick="showMateri('${m.id}', '${kelasId}')">
          <div class="materi-icon">${m.icon}</div>
          <div class="materi-title">${m.nama}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ================================
// SHOW KELAS
// ================================
function showKelas(kelasId, el) {
  document.getElementById('materi-desc').innerHTML = '';
  document.getElementById('page-materi').style.display = 'none';
  document.getElementById('homePage').style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  currentKelas = kelasId;
  renderMateri(kelasId);
}

// ================================
// SHOW MATERI
// ================================
function showMateri(materiId, kelasId) {
  const kelas = data.kelas.find(k => k.id === kelasId);
  const materi = kelas.materi.find(m => m.id === materiId);

  document.getElementById('homePage').style.display = 'none';
  document.getElementById('page-materi').style.display = 'block';
  document.getElementById('materi-title').textContent = materi.nama + ' - ' + kelas.nama;
  document.getElementById('materi-desc').innerHTML = materi.konten || '🚧 Konten segera hadir!';
}

// ================================
// BACK & HOME
// ================================
function backToKelas() {
  document.getElementById('materi-desc').innerHTML = '';
  document.getElementById('page-materi').style.display = 'none';
  document.getElementById('homePage').style.display = 'block';
}

function goHome() {
  document.getElementById('materi-desc').innerHTML = '';
  document.getElementById('page-materi').style.display = 'none';
  document.getElementById('homePage').style.display = 'block';
}

// ================================
// LANDING PAGE
// ================================
function masukApp() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  localStorage.setItem('sudahMasuk', 'true');
  // Load kelas pertama kalau ada
  if (data.kelas.length > 0) {
    currentKelas = data.kelas[0].id;
    renderMateri(currentKelas);
  } else {
    document.getElementById('kelasContent').innerHTML = `
      <div class="empty-state">📭 Belum ada kelas. Tambahkan via admin nanti!</div>
    `;
  }
  renderNavTabs();
}

if (localStorage.getItem('sudahMasuk')) {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  if (data.kelas.length > 0) {
    currentKelas = data.kelas[0].id;
    renderMateri(currentKelas);
  } else {
    document.getElementById('kelasContent').innerHTML = `
      <div class="empty-state">📭 Belum ada kelas. Tambahkan via admin nanti!</div>
    `;
  }
  renderNavTabs();
}

// ================================
// CHAT
// ================================
function toggleChat() {
  const chatWindow = document.getElementById('chatWindow');
  chatWindow.style.display = chatWindow.style.display === 'none' ? 'block' : 'none';
}

function showGraph(expression) {
  const graphId = 'graph-' + Date.now();
  const chatBox = document.getElementById('chatBox');
  const graphDiv = document.createElement('div');
  graphDiv.className = 'graph-container';
  graphDiv.id = graphId;
  chatBox.appendChild(graphDiv);

  const tryDesmos = setInterval(() => {
    if (typeof Desmos !== 'undefined') {
      clearInterval(tryDesmos);
      const calculator = Desmos.GraphingCalculator(graphDiv, {
        expressions: false,
        settingsMenu: false,
        zoomButtons: false
      });
      calculator.setExpression({ id: 'graph1', latex: expression });
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }, 200);
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const chatBox = document.getElementById('chatBox');
  const text = input.value.trim();
  if (!text) return;

  chatBox.innerHTML += `<div class="message user">${text}</div>`;
  input.value = '';
  chatHistory.push({ role: 'user', parts: [{ text: text }] });
  chatBox.innerHTML += `<div class="message bot" id="loading">...</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: `Kamu adalah asisten matematika. Jawab dalam bahasa Indonesia. Jawab singkat maksimal 3-4 kalimat. Jika pertanyaan melibatkan fungsi matematika yang bisa digrafik, tambahkan di akhir jawaban: [GRAPH: tulis ekspresi latexnya saja].` }]
          },
          contents: chatHistory
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      document.getElementById('loading').remove();
      chatHistory.pop();
      if (data.error.code === 429) {
        chatBox.innerHTML += `<div class="message bot">⚠️ Batas request habis, coba lagi nanti!</div>`;
      } else {
        chatBox.innerHTML += `<div class="message bot">⚠️ Error: ${data.error.message}</div>`;
      }
      chatBox.scrollTop = chatBox.scrollHeight;
      return;
    }

    const botReply = data.candidates[0].content.parts[0].text;
    chatHistory.push({ role: 'model', parts: [{ text: botReply }] });

    const graphMatch = botReply.match(/\[GRAPH:\s*(.+?)\]/);
    const cleanReply = botReply.replace(/\[GRAPH:\s*(.+?)\]/, '').trim();

    document.getElementById('loading').remove();

    const botDiv = document.createElement('div');
    botDiv.className = 'message bot';
    botDiv.innerHTML = cleanReply
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\n/g, '<br>');
    chatBox.appendChild(botDiv);
    MathJax.typesetPromise([botDiv]);

    if (graphMatch) showGraph(graphMatch[1]);

  } catch (error) {
    document.getElementById('loading').remove();
    chatBox.innerHTML += `<div class="message bot">Error: ${error.message}</div>`;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') sendMessage();
});