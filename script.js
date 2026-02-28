import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let chatHistory = [];
let currentKelas = null;
let globalKelasList = [];

// ================================
// AUTH
// ================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists()) {
    const nama = userDoc.data().nama || 'Pengguna';
    const welcomeEl = document.getElementById('welcomeMsg');
    if (welcomeEl) welcomeEl.textContent = `👋 Halo, ${nama}!`;
  }
  initApp();
});

window.logoutUser = async function() {
  await signOut(auth);
  window.location.href = 'login.html';
}

// ================================
// LOAD DATA FIREBASE
// ================================
async function loadDataFromFirebase() {
  const kelasSnap = await getDocs(query(collection(db, 'kelas'), orderBy('nama')));
  const materiSnap = await getDocs(collection(db, 'materi'));

  const kelasList = [];
  kelasSnap.docs.forEach(d => {
    if (d.data().visible) {
      kelasList.push({ id: d.id, ...d.data(), materi: [] });
    }
  });

  materiSnap.docs.forEach(d => {
    const m = d.data();
    if (!m.visible) return;
    const kelas = kelasList.find(k => k.id === m.kelasId);
    if (kelas) kelas.materi.push({ id: d.id, ...m });
  });

  return kelasList;
}

// ================================
// RENDER NAVBAR TABS
// ================================
function renderNavTabs(kelasList) {
  const navTabs = document.getElementById('navTabs');
  if (kelasList.length === 0) { navTabs.innerHTML = ''; return; }
  navTabs.innerHTML = kelasList.map((k, i) => `
    <button class="tab-btn ${i === 0 ? 'active' : ''}" onclick="window.showKelas('${k.id}')">
      ${k.nama}
    </button>
  `).join('');
}

// ================================
// RENDER MATERI
// ================================
function renderMateri(kelasId, kelasList) {
  const kelas = kelasList.find(k => k.id === kelasId);
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
        <div class="materi-card" onclick="window.showMateri('${m.id}', '${kelasId}')">
          <div class="materi-icon">${m.icon}</div>
          <div class="materi-title">${m.nama}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ================================
// INIT APP
// ================================
async function initApp() {
  globalKelasList = await loadDataFromFirebase();
  renderNavTabs(globalKelasList);
  if (globalKelasList.length > 0) {
    currentKelas = globalKelasList[0].id;
    renderMateri(currentKelas, globalKelasList);
  } else {
    document.getElementById('kelasContent').innerHTML = `<div class="empty-state">📭 Belum ada kelas.</div>`;
  }
}

// ================================
// SHOW KELAS
// ================================
window.showKelas = function(kelasId) {
  document.getElementById('materi-desc').innerHTML = '';
  document.getElementById('page-materi').style.display = 'none';
  document.getElementById('homePage').style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  currentKelas = kelasId;
  renderMateri(kelasId, globalKelasList);
}

// ================================
// SHOW MATERI
// ================================
window.showMateri = function(materiId, kelasId) {
  const kelas = globalKelasList.find(k => k.id === kelasId);
  const materi = kelas.materi.find(m => m.id === materiId);

  document.getElementById('homePage').style.display = 'none';
  document.getElementById('page-materi').style.display = 'block';
  document.getElementById('materi-title').textContent = materi.nama + ' - ' + kelas.nama;

  const bloks = materi.bloks || [];
  if (bloks.length === 0) {
    document.getElementById('materi-desc').innerHTML = '🚧 Konten segera hadir!';
    return;
  }

  document.getElementById('materi-desc').innerHTML = bloks.map(b => {
    if (b.tipe === 'judul') return `<h3 style="color:#4f46e5;margin:20px 0 10px;">${b.teks}</h3>`;
    if (b.tipe === 'teks') return `<p style="margin-bottom:12px;line-height:1.7;">${b.teks.replace(/\n/g, '<br>')}</p>`;
    if (b.tipe === 'video') {
      const videoId = b.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
      if (!videoId) return '';
      return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;margin:16px 0;">
        <iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe>
      </div>`;
    }
    if (b.tipe === 'soal') return `
      <div style="background:#f8f9ff;border:1px solid #e0e0e0;border-radius:10px;padding:16px;margin:12px 0;">
        <p><b>Soal:</b> ${b.soal}</p>
        <details style="margin-top:8px;">
          <summary style="color:#4f46e5;cursor:pointer;">Lihat Pembahasan</summary>
          <div style="margin-top:8px;padding:10px;background:#ede9fe;border-radius:8px;">${b.pembahasan}</div>
        </details>
      </div>`;
    if (b.tipe === 'gambar') return `<img src="${b.url}" style="max-width:100%;border-radius:10px;margin:12px 0;">`;
    if (b.tipe === 'file') return `
      <a href="${b.url}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:#f0f4ff;color:#4f46e5;border-radius:10px;text-decoration:none;margin:8px 0;border:1px solid #c7d2fe;">
        📎 ${b.namaFile || 'Download File'}
      </a>`;
    return '';
  }).join('');
}

// ================================
// BACK & HOME
// ================================
window.backToKelas = function() {
  document.getElementById('materi-desc').innerHTML = '';
  document.getElementById('page-materi').style.display = 'none';
  document.getElementById('homePage').style.display = 'block';
}

window.goHome = function() {
  document.getElementById('materi-desc').innerHTML = '';
  document.getElementById('page-materi').style.display = 'none';
  document.getElementById('homePage').style.display = 'block';
}

// ================================
// CHAT
// ================================
window.toggleChat = function() {
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
    // Pake API route Vercel biar API key aman
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: `Kamu adalah asisten matematika. Jawab dalam bahasa Indonesia. Jawab singkat maksimal 3-4 kalimat. Jika pertanyaan melibatkan fungsi matematika yang bisa digrafik, tambahkan di akhir jawaban: [GRAPH: tulis ekspresi latexnya saja].` }]
        },
        contents: chatHistory
      })
    });

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