/**
 * DoaPet Web 🐾 — Core Application Logic
 * Conectado diretamente ao mesmo Cloud Firestore e Firebase Auth do app móvel.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Credenciais oficiais do projeto DoaPet
const firebaseConfig = {
  apiKey: "AIzaSyDLhtlUreBHjAr0tMbHMNPM8umAmxWiTPo",
  authDomain: "doapet-b8a55.firebaseapp.com",
  projectId: "doapet-b8a55",
  storageBucket: "doapet-b8a55.firebasestorage.app",
  messagingSenderId: "428930977134",
  appId: "1:428930977134:web:d96019bc0be7623233457f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Estados da Aplicação
let currentUser = null;
let currentProfile = null;
let allPets = [];
let allSosAlerts = [];
let allEvents = [];
let myUserPets = [];
let currentTab = 'vitrine';
let currentSpeciesFilter = 'todos';
let swipeIndex = 0;
let leafletMap = null;
let activeChatId = null;
let unsubscribeMessages = null;
let unsubscribeUserChats = null;
let uploadedBase64Photos = [];
let uploadedSosBase64 = null;

// Filtro de Palavras Ofensivas (idêntico ao app mobile)
const BLOCKED_TERMS = [
  'porra', 'merda', 'caralho', 'puta', 'viado', 'buceta', 'cacete',
  'fdp', 'filhadaputa', 'filhodaputa', 'arrombado', 'babaca', 'idiota',
  'imbecil', 'canalha', 'vagabunda', 'vagabundo', 'piranha', 'safada',
  'safado', 'desgraca', 'desgraçado', 'bosta', 'cuzao', 'vadia',
  'otario', 'corno', 'broxa', 'punheta', 'foder', 'foda', 'fodase',
  'vtnc', 'vsf', 'kct', 'pqp', 'tnc', 'vai tomar no cu',
  'macaco', 'crioulo', 'terrorista',
  'porno', 'sexo explicito', 'strip', 'stripper', 'xota', 'xoxota',
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'crap',
  'whore', 'slut', 'faggot', 'nigger', 'retard', 'moron',
  'porn', 'dick', 'cock', 'pussy', 'boobs'
];

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsOffensive(text) {
  if (!text) return false;
  const norm = normalizeText(text);
  return BLOCKED_TERMS.some(term => {
    const t = normalizeText(term);
    return norm.includes(t);
  });
}

// -------------------------------------------------------------
// INICIALIZAÇÃO E LISTENER DE AUTENTICAÇÃO
// -------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  const authArea = document.getElementById('auth-area');

  if (user) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        currentProfile = userDoc.data();
      } else {
        currentProfile = { name: user.displayName || 'Usuário DoaPet', role: 'user' };
      }
    } catch {
      currentProfile = { name: user.displayName || 'Usuário DoaPet', role: 'user' };
    }

    const avatarUrl = currentProfile.photoUrl || user.photoURL || './logo.png';
    const userName = currentProfile.name || user.displayName || 'Minha Conta';

    authArea.innerHTML = `
      <div class="user-avatar-btn" onclick="switchView('profile')">
        <img src="${avatarUrl}" class="user-avatar-img" alt="Avatar" />
        <span>${userName}</span>
      </div>
    `;

    loadUserChats(user.uid);
    loadMyPets(user.uid);
  } else {
    currentProfile = null;
    authArea.innerHTML = `
      <button class="btn-primary-sm" onclick="openAuthModal('login')">Entrar / Cadastrar</button>
    `;
    if (unsubscribeUserChats) {
      unsubscribeUserChats();
      unsubscribeUserChats = null;
    }
  }

  loadInitialData();
});

// -------------------------------------------------------------
// CARREGAMENTO DE DADOS DO FIRESTORE
// -------------------------------------------------------------
async function loadInitialData() {
  try {
    // 1. Pets disponíveis
    const petsQuery = query(collection(db, 'pets'), where('status', '==', 'available'));
    const petsSnap = await getDocs(petsQuery);
    allPets = petsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Alertas SOS em aberto
    const sosQuery = query(collection(db, 'sos_alerts'), where('status', '==', 'open'));
    const sosSnap = await getDocs(sosQuery);
    allSosAlerts = sosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Eventos
    try {
      const eventsSnap = await getDocs(collection(db, 'events'));
      allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      allEvents = [];
    }

    renderCurrentView();
  } catch (err) {
    console.error("Erro ao carregar Firestore:", err);
  }
}

// -------------------------------------------------------------
// NAVEGAÇÃO ENTRE TELAS / TABS
// -------------------------------------------------------------
window.switchView = function(viewName) {
  currentTab = viewName;

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeNav = document.getElementById(`tab-${viewName}`);
  if (activeNav) activeNav.classList.add('active');

  document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active-view'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active-view');

  if (viewName === 'mapa') {
    initOrUpdateMap();
  } else if (viewName === 'swipe') {
    renderSwipeCard();
  } else if (viewName === 'chat' && !currentUser) {
    openAuthModal('login');
  } else if (viewName === 'profile' && !currentUser) {
    openAuthModal('login');
  } else if (viewName === 'events') {
    renderEvents();
  } else {
    renderCurrentView();
  }
};

window.setSpeciesFilter = function(species) {
  currentSpeciesFilter = species;
  document.querySelectorAll('.chips-group .chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  renderVitrine();
};

// -------------------------------------------------------------
// RENDERIZAÇÃO: VITRINE
// -------------------------------------------------------------
function renderVitrine() {
  const grid = document.getElementById('pets-grid');
  const counter = document.getElementById('counter-pets');

  let filtered = allPets;
  if (currentSpeciesFilter !== 'todos') {
    filtered = allPets.filter(p => (p.species || '').toLowerCase() === currentSpeciesFilter);
  }

  counter.textContent = `${filtered.length} animal(is) disponível(is)`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column: 1/-1;">
        <p style="font-size: 40px; margin-bottom: 10px;">🐾</p>
        <h3>Nenhum animal cadastrado nesta categoria</h3>
        <p>Seja o primeiro a publicar um pet para adoção responsável!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(pet => {
    const photo = (pet.photos && pet.photos[0]) ? pet.photos[0] : './logo.png';
    const speciesBadge = pet.species === 'gato' ? '🐱 Gato' : pet.species === 'cachorro' ? '🐶 Cachorro' : '🐾 Outro';
    const genderText = pet.gender === 'femea' ? 'Fêmea' : 'Macho';

    return `
      <div class="card" onclick="openPetDetails('${pet.id}')" style="cursor: pointer;">
        <div class="card-photo-container">
          <img src="${photo}" alt="${pet.name}" class="card-photo" />
          <span class="species-tag">${speciesBadge}</span>
        </div>
        <div class="card-body">
          <div class="card-header">
            <h3 class="pet-name">${pet.name}</h3>
            <span style="font-size: 13px; font-weight: 700; color: var(--primary);">${genderText}</span>
          </div>
          <p class="pet-meta">${pet.breed || 'SRD'} • Porte ${pet.size || 'médio'}</p>
          <div class="pet-location">📍 ${pet.locationHint || 'Brasil'}</div>
          <p class="pet-desc">${pet.description || 'Sem descrição.'}</p>
          <div class="pet-badges">
            ${pet.medical?.vaccinated ? '<span class="mini-badge">💉 Vacinado</span>' : ''}
            ${pet.medical?.neutered ? '<span class="mini-badge">✂️ Castrado</span>' : ''}
            ${pet.medical?.dewormed ? '<span class="mini-badge">🪱 Vermifugado</span>' : ''}
          </div>
          <button class="btn-action">Ver Detalhes & Adotar 🐾</button>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// RENDERIZAÇÃO: MODO SWIPE (TINDER DE PETS)
// -------------------------------------------------------------
function renderSwipeCard() {
  const container = document.getElementById('swipe-container');

  if (allPets.length === 0 || swipeIndex >= allPets.length) {
    container.innerHTML = `
      <div class="loading-state">
        <p style="font-size: 48px; margin-bottom: 12px;">🐕</p>
        <h2>Sem mais pets por aqui</h2>
        <p style="margin-bottom: 20px;">Você já viu todos os animais disponíveis na fila de adoção.</p>
        <button class="btn-action" onclick="resetSwipe()" style="max-width: 240px;">Ver novamente do início</button>
      </div>
    `;
    return;
  }

  const pet = allPets[swipeIndex];
  const photo = (pet.photos && pet.photos[0]) ? pet.photos[0] : './logo.png';
  const speciesBadge = pet.species === 'gato' ? '🐱 Gato' : pet.species === 'cachorro' ? '🐶 Cachorro' : '🐾 Outro';

  container.innerHTML = `
    <div class="swipe-card-wrapper">
      <img src="${photo}" class="swipe-photo" alt="${pet.name}" />
      <div class="swipe-info">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h2 style="font-size: 22px; font-weight: 800;">${pet.name}</h2>
            <span style="font-size: 13px; font-weight: 700; color: var(--primary);">${speciesBadge}</span>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${pet.breed || 'SRD'} • ${pet.gender === 'femea' ? 'Fêmea' : 'Macho'}</p>
          <p style="font-size: 12px; color: var(--primary-dark); margin-top: 4px; font-weight: 600;">📍 ${pet.locationHint || 'Brasil'}</p>
          <p style="font-size: 13px; color: #475569; margin-top: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${pet.description || ''}</p>
        </div>
        <div class="swipe-actions-row">
          <button class="swipe-btn btn-pass" onclick="handleSwipe('left')" title="Passar">✕</button>
          <button class="swipe-btn btn-match" onclick="handleSwipe('right')" title="Dar Match / Quero Adotar">💚</button>
        </div>
      </div>
    </div>
    <p style="font-size: 13px; color: var(--text-muted); font-weight: 600;">Animal ${swipeIndex + 1} de ${allPets.length}</p>
  `;
}

window.handleSwipe = async function(direction) {
  const pet = allPets[swipeIndex];
  swipeIndex++;

  if (direction === 'right' && pet) {
    if (!currentUser) {
      alert("Para dar Match e adotar, entre com sua conta!");
      openAuthModal('login');
      return;
    }

    try {
      // 1. Registra interesse na coleção 'adoptions'
      await addDoc(collection(db, 'adoptions'), {
        petId: pet.id,
        petName: pet.name,
        petPhoto: pet.photos?.[0] || null,
        petSpecies: pet.species,
        ownerId: pet.ownerId,
        ownerName: pet.ownerName || 'Doador',
        adopterId: currentUser.uid,
        adopterName: currentProfile?.name || currentUser.displayName || 'Adotante',
        adopterEmail: currentUser.email,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // 2. Inicia Chat com Ficha do Adotante
      const chatId = await startAdoptionChat(pet);

      alert(`🎉 DEU MATCH! Você se conectou com o tutor de ${pet.name}! A conversa foi aberta na aba Conversas.`);
      switchView('chat');
      openChatConversation(chatId);
      return;
    } catch (err) {
      console.error("Erro ao registrar match:", err);
    }
  }

  renderSwipeCard();
};

window.resetSwipe = function() {
  swipeIndex = 0;
  renderSwipeCard();
};

// -------------------------------------------------------------
// RENDERIZAÇÃO: ALERTAS SOS RUA
// -------------------------------------------------------------
function renderSosAlerts() {
  const grid = document.getElementById('sos-grid');

  if (allSosAlerts.length === 0) {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column: 1/-1;">
        <p style="font-size: 44px; margin-bottom: 12px;">✅</p>
        <h3>Nenhum animal em risco reportado no momento!</h3>
        <p>A comunidade agradece o cuidado e a união por nossos bichinhos.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = allSosAlerts.map(sos => {
    const photo = (sos.photos && sos.photos[0]) ? sos.photos[0] : './logo.png';
    const isAuthor = currentUser && currentUser.uid === sos.authorId;

    return `
      <div class="card">
        <div class="card-photo-container">
          <img src="${photo}" alt="SOS" class="card-photo" />
          <span class="sos-badge">🆘 RESGATE URGENTE</span>
        </div>
        <div class="card-body">
          <h3 class="pet-name" style="margin-bottom: 6px;">Animal em Risco</h3>
          <div class="pet-location">📍 ${sos.addressHint || 'Ver no mapa'}</div>
          <p class="pet-desc">${sos.description || 'Precisa de resgate.'}</p>
          <div style="display: flex; gap: 8px; margin-top: auto;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${sos.location?.latitude},${sos.location?.longitude}" target="_blank" class="btn-action btn-danger" style="flex: 1;">
              🗺️ Rota GPS
            </a>
            ${!isAuthor ? `
              <button class="btn-action btn-secondary" onclick="openReportModal('${sos.id}', 'sos_alert', 'Alerta SOS: ${sos.description.slice(0,25)}...')" style="width: auto; padding: 12px 14px;" title="Denunciar">
                🚨
              </button>
            ` : `
              <button class="btn-action btn-secondary" onclick="deleteMyAlert('${sos.id}')" style="width: auto; padding: 12px 14px;" title="Excluir Meu Alerta">
                🗑️
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.deleteMyAlert = async function(alertId) {
  if (!confirm("Deseja realmente excluir este alerta SOS?")) return;
  try {
    await deleteDoc(doc(db, 'sos_alerts', alertId));
    allSosAlerts = allSosAlerts.filter(a => a.id !== alertId);
    renderSosAlerts();
    alert("Alerta removido com sucesso!");
  } catch (err) {
    alert("Erro ao excluir alerta: " + err.message);
  }
};

// -------------------------------------------------------------
// RENDERIZAÇÃO: MAPA LEAFLET
// -------------------------------------------------------------
function initOrUpdateMap() {
  const mapContainer = document.getElementById('map-view');
  if (!mapContainer) return;

  if (!leafletMap) {
    leafletMap = L.map('map-view').setView([-22.755, -43.452], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMap);
  }

  // Limpa marcadores
  leafletMap.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
      leafletMap.removeLayer(layer);
    }
  });

  const bounds = [];

  allPets.forEach(p => {
    if (p.location?.latitude && p.location?.longitude) {
      const coords = [p.location.latitude, p.location.longitude];
      bounds.push(coords);
      const icon = p.species === 'gato' ? '🐱' : '🐶';
      L.marker(coords)
        .addTo(leafletMap)
        .bindPopup(`
          <div style="text-align: center; min-width: 140px;">
            <b style="font-size: 15px;">${icon} ${p.name}</b><br>
            <span style="font-size: 12px; color: #64748b;">${p.breed || p.species} • Porte ${p.size || 'médio'}</span><br>
            <p style="font-size: 12px; margin: 6px 0;">📍 ${p.locationHint || ''}</p>
            <button onclick="openPetDetails('${p.id}')" style="background: #0D9488; color: white; border: none; border-radius: 6px; padding: 4px 10px; font-weight: bold; cursor: pointer;">Ver Pet 🐾</button>
          </div>
        `);
    }
  });

  allSosAlerts.forEach(s => {
    if (s.location?.latitude && s.location?.longitude) {
      const coords = [s.location.latitude, s.location.longitude];
      bounds.push(coords);
      L.marker(coords)
        .addTo(leafletMap)
        .bindPopup(`
          <div style="text-align: center; min-width: 140px;">
            <b style="color: #ef4444; font-size: 15px;">🆘 ALERTA RESGATE</b><br>
            <p style="font-size: 12px; margin: 4px 0;">${s.description || ''}</p>
            <span style="font-size: 11px; color: #64748b;">📍 ${s.addressHint || ''}</span>
          </div>
        `);
    }
  });

  if (bounds.length > 0) {
    leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }

  setTimeout(() => {
    leafletMap.invalidateSize();
  }, 200);
}

// -------------------------------------------------------------
// RENDERIZAÇÃO: EVENTOS & FEIRAS
// -------------------------------------------------------------
function renderEvents() {
  const grid = document.getElementById('events-grid');
  if (allEvents.length === 0) {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column: 1/-1;">
        <p style="font-size: 40px; margin-bottom: 12px;">📅</p>
        <h3>Nenhum evento registrado no momento</h3>
        <p>ONGs e abrigos podem divulgar mutirões de vacinação e feiras de adoção pelo aplicativo DoaPet.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = allEvents.map(e => `
    <div class="card">
      <div class="card-body">
        <h3 class="pet-name">${e.title}</h3>
        <p class="pet-meta">Organizado por: ${e.organizerName || 'ONG Parceira'}</p>
        <div class="pet-location">📍 ${e.address || 'Local a confirmar'}</div>
        <p class="pet-desc">${e.description || ''}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address || e.title)}" target="_blank" class="btn-action">
          🗺️ Ver Endereço do Evento
        </a>
      </div>
    </div>
  `).join('');
}

// -------------------------------------------------------------
// RENDERIZAÇÃO: CHATS EM TEMPO REAL
// -------------------------------------------------------------
function loadUserChats(userId) {
  const listContainer = document.getElementById('chat-list-items');
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId)
  );

  if (unsubscribeUserChats) unsubscribeUserChats();

  unsubscribeUserChats = onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (chats.length === 0) {
      listContainer.innerHTML = `<div style="padding: 20px; font-size: 13px; color: var(--text-muted); text-align: center;">Nenhuma conversa ativa no momento.</div>`;
      return;
    }

    listContainer.innerHTML = chats.map(c => `
      <div class="chat-item ${c.id === activeChatId ? 'active' : ''}" onclick="openChatConversation('${c.id}')">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 18px;">🐾</div>
        <div style="flex: 1; overflow: hidden;">
          <div style="font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Conversa #${c.id.slice(-4)}</div>
          <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.lastMessagePreview || 'Clique para conversar'}</div>
        </div>
      </div>
    `).join('');
  });
}

window.openChatConversation = function(chatId) {
  activeChatId = chatId;
  const mainArea = document.getElementById('chat-main-area');

  mainArea.innerHTML = `
    <div class="chat-header">
      <div>
        <h4 style="font-size: 15px; font-weight: 800;">Chat da Adoção 🐾</h4>
        <span style="font-size: 12px; color: var(--primary-dark); font-weight: 600;">Sincronizado em tempo real com o app móvel</span>
      </div>
    </div>
    <div class="chat-messages" id="messages-container">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>
    <form class="chat-input-bar" onsubmit="handleSendMessage(event)">
      <input type="text" id="chat-msg-input" class="chat-input" placeholder="Digite sua mensagem respeitosa..." required />
      <button type="submit" class="btn-primary-sm">Enviar</button>
    </form>
  `;

  if (unsubscribeMessages) unsubscribeMessages();

  const msgQuery = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('sentAt', 'asc'),
    limit(100)
  );

  unsubscribeMessages = onSnapshot(msgQuery, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const container = document.getElementById('messages-container');
    if (!container) return;

    if (messages.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); margin: auto;">Diga olá e inicie o processo de adoção responsável! 🐶</div>`;
      return;
    }

    container.innerHTML = messages.map(m => {
      const isMine = currentUser && m.senderId === currentUser.uid;
      return `
        <div class="message-bubble ${isMine ? 'message-mine' : 'message-theirs'}">
          <div style="font-size: 11px; font-weight: 700; margin-bottom: 2px; opacity: 0.8;">${m.senderName || 'Usuário'}</div>
          <div>${m.text.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  });
};

window.handleSendMessage = async function(e) {
  e.preventDefault();
  const input = document.getElementById('chat-msg-input');
  const text = input.value.trim();
  if (!text || !activeChatId || !currentUser) return;

  // Filtro de palavras ofensivas
  if (containsOffensive(text)) {
    alert("Mensagem bloqueada 🚫: O DoaPet proíbe palavras ofensivas e palavrões no chat para garantir um ambiente seguro.");
    return;
  }

  input.value = '';

  try {
    await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
      senderId: currentUser.uid,
      senderName: currentProfile?.name || currentUser.displayName || 'Usuário',
      text: text,
      sentAt: Date.now()
    });

    await updateDoc(doc(db, 'chats', activeChatId), {
      lastMessagePreview: text,
      lastMessageAt: Date.now()
    });
  } catch (err) {
    alert("Erro ao enviar mensagem: " + err.message);
  }
};

async function startAdoptionChat(pet) {
  const chatsRef = collection(db, 'chats');
  const snap = await getDocs(query(chatsRef, where('participants', 'array-contains', currentUser.uid)));
  const existing = snap.docs.find(d => {
    const data = d.data();
    return data.participants.includes(pet.ownerId) && (!pet.id || data.petId === pet.id);
  });

  if (existing) return existing.id;

  const newChat = await addDoc(chatsRef, {
    participants: [currentUser.uid, pet.ownerId],
    petId: pet.id,
    lastMessagePreview: 'Ficha de adoção enviada',
    lastMessageAt: Date.now()
  });

  const introText =
    `📋 FICHA DE INTERESSE EM ADOÇÃO 🐾\n` +
    `• Adotante: ${currentProfile?.name || currentUser.displayName}\n` +
    `• E-mail: ${currentUser.email}\n` +
    `• Animal: ${pet.name} (${pet.species}, ${pet.gender === 'femea' ? 'Fêmea' : 'Macho'})\n\n` +
    `"Olá! Me interessei pelo pet e gostaria de conversar para dar um lar amoroso a ele!"`;

  await addDoc(collection(db, 'chats', newChat.id, 'messages'), {
    senderId: currentUser.uid,
    senderName: currentProfile?.name || currentUser.displayName,
    text: introText,
    sentAt: Date.now()
  });

  return newChat.id;
}

// -------------------------------------------------------------
// DETALHES DO PET, MODAL & DENÚNCIA
// -------------------------------------------------------------
window.openPetDetails = function(petId) {
  const pet = allPets.find(p => p.id === petId);
  if (!pet) return;

  document.getElementById('detail-pet-name').textContent = pet.name;
  document.getElementById('detail-pet-species').textContent = `${pet.species === 'gato' ? '🐱 Gato' : '🐶 Cachorro'} • ${pet.gender === 'femea' ? 'Fêmea' : 'Macho'}`;
  document.getElementById('detail-pet-location').textContent = `📍 Localização: ${pet.locationHint || 'Brasil'}`;
  document.getElementById('detail-pet-desc').textContent = pet.description || 'Sem história fornecida.';

  const photo = (pet.photos && pet.photos[0]) ? pet.photos[0] : './logo.png';
  document.getElementById('detail-pet-img').src = photo;

  let badgesHtml = '';
  if (pet.medical?.vaccinated) badgesHtml += '<span class="mini-badge">💉 Vacinado</span>';
  if (pet.medical?.neutered) badgesHtml += '<span class="mini-badge">✂️ Castrado</span>';
  if (pet.medical?.dewormed) badgesHtml += '<span class="mini-badge">🪱 Vermifugado</span>';
  document.getElementById('detail-pet-badges').innerHTML = badgesHtml;

  const isOwner = currentUser && currentUser.uid === pet.ownerId;
  let actionsHtml = '';

  if (isOwner) {
    actionsHtml = `
      <div style="background: #ECFDF5; padding: 12px; border-radius: 8px; border: 1px solid #A7F3D0; font-size: 13px; font-weight: 700; color: #065F46;">
        👑 Você é o autor deste anúncio de doação
      </div>
      <button class="btn-action" style="background: #FEF3C7; color: #B45309; border: 1px solid #F59E0B;" onclick="openEditPetModal('${pet.id}')">
        ✏️ Editar Dados da Doação
      </button>
      <button class="btn-action" style="background: #16A34A;" onclick="markPetAdopted('${pet.id}')">
        🎉 Marcar como Adotado
      </button>
      <button class="btn-action btn-danger" onclick="cancelDonation('${pet.id}')">
        ❌ Desistir da Doação
      </button>
    `;
  } else {
    actionsHtml = `
      <button class="btn-action" onclick="handleDirectChatInterest('${pet.id}')">
        💬 Conversar com o Doador no Chat do DoaPet
      </button>
      ${pet.whatsapp ? `
        <a href="https://wa.me/55${pet.whatsapp.replace(/\D/g, '')}?text=Ol%C3%A1!%20Vi%20o%20pet%20${encodeURIComponent(pet.name)}%20no%20DoaPet%20e%20gostaria%20de%20adot%C3%A1-lo!" target="_blank" class="btn-action btn-whatsapp">
          💬 Falar no WhatsApp (${pet.whatsapp})
        </a>
      ` : ''}
      <button class="btn-action btn-secondary" onclick="openReportModal('${pet.id}', 'pet', '${pet.name}')" style="color: var(--danger); font-size: 13px;">
        🚨 Denunciar Anúncio (Conteúdo Ofensivo ou Irregular)
      </button>
    `;
  }

  document.getElementById('detail-pet-actions').innerHTML = actionsHtml;
  document.getElementById('pet-detail-modal').style.display = 'flex';
};

window.handleDirectChatInterest = async function(petId) {
  if (!currentUser) {
    alert("Faça login para conversar com o tutor!");
    openAuthModal('login');
    return;
  }
  const pet = allPets.find(p => p.id === petId);
  if (!pet) return;

  closeAllModals();
  const chatId = await startAdoptionChat(pet);
  switchView('chat');
  openChatConversation(chatId);
};

// -------------------------------------------------------------
// GESTÃO DE DOAÇÃO: EDITAR, ADOTAR, CANCELAR
// -------------------------------------------------------------
window.openEditPetModal = function(petId) {
  closeAllModals();
  const pet = allPets.find(p => p.id === petId);
  if (!pet) return;

  document.getElementById('ep-id').value = pet.id;
  document.getElementById('ep-name').value = pet.name || '';
  document.getElementById('ep-species').value = pet.species || 'cachorro';
  document.getElementById('ep-size').value = pet.size || 'medio';
  document.getElementById('ep-location').value = pet.locationHint || '';
  document.getElementById('ep-whatsapp').value = pet.whatsapp || '';
  document.getElementById('ep-desc').value = pet.description || '';

  document.getElementById('edit-pet-modal').style.display = 'flex';
};

window.handleEditPetSubmit = async function(e) {
  e.preventDefault();
  const petId = document.getElementById('ep-id').value;
  const name = document.getElementById('ep-name').value.trim();
  const species = document.getElementById('ep-species').value;
  const size = document.getElementById('ep-size').value;
  const locationHint = document.getElementById('ep-location').value.trim();
  const whatsapp = document.getElementById('ep-whatsapp').value.trim();
  const desc = document.getElementById('ep-desc').value.trim();

  if (containsOffensive(name) || containsOffensive(desc) || containsOffensive(locationHint)) {
    alert("Conteúdo Bloqueado 🚫: Não é permitido usar termos ofensivos ou impróprios.");
    return;
  }

  try {
    await updateDoc(doc(db, 'pets', petId), {
      name,
      species,
      size,
      locationHint,
      whatsapp,
      description: desc,
      updatedAt: serverTimestamp()
    });

    alert("Anúncio atualizado com sucesso!");
    closeAllModals();
    await loadInitialData();
  } catch (err) {
    alert("Erro ao editar anúncio: " + err.message);
  }
};

window.markPetAdopted = async function(petId) {
  if (!confirm("Confirmar que o pet foi adotado? 🎉")) return;
  try {
    await updateDoc(doc(db, 'pets', petId), { status: 'adopted' });
    alert("Parabéns! O pet foi marcado como adotado!");
    closeAllModals();
    await loadInitialData();
  } catch (err) {
    alert("Erro: " + err.message);
  }
};

window.cancelDonation = async function(petId) {
  if (!confirm("Deseja realmente cancelar e retirar o pet da vitrine?")) return;
  try {
    await updateDoc(doc(db, 'pets', petId), { status: 'removed' });
    alert("Doação cancelada e anúncio removido.");
    closeAllModals();
    await loadInitialData();
  } catch (err) {
    alert("Erro: " + err.message);
  }
};

// -------------------------------------------------------------
// CENTRAL DE DENÚNCIAS
// -------------------------------------------------------------
window.openReportModal = function(targetId, targetType, targetTitle) {
  closeAllModals();
  if (!currentUser) {
    alert("Você precisa estar conectado para registrar uma denúncia.");
    openAuthModal('login');
    return;
  }

  document.getElementById('rep-target-id').value = targetId;
  document.getElementById('rep-target-type').value = targetType;
  document.getElementById('rep-target-title').value = targetTitle;
  document.getElementById('report-modal').style.display = 'flex';
};

window.handleReportSubmit = async function(e) {
  e.preventDefault();
  const targetId = document.getElementById('rep-target-id').value;
  const targetType = document.getElementById('rep-target-type').value;
  const targetTitle = document.getElementById('rep-target-title').value;
  const reason = document.getElementById('rep-reason').value;
  const details = document.getElementById('rep-details').value.trim();

  try {
    await addDoc(collection(db, 'denuncias'), {
      targetId,
      targetType,
      targetTitle,
      reporterId: currentUser.uid,
      reporterName: currentProfile?.name || currentUser.displayName || 'Usuário Web',
      reason,
      details,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    alert("✅ Denúncia registrada com sucesso! A equipe de moderação revisará o conteúdo.");
    closeAllModals();
  } catch (err) {
    alert("Erro ao enviar denúncia: " + err.message);
  }
};

// -------------------------------------------------------------
// CADASTRO DE PET COM BASE64 & CEP PRIORITÁRIO
// -------------------------------------------------------------
window.openCreatePetModal = function() {
  if (!currentUser) {
    alert("Para doar um animal, entre na sua conta!");
    openAuthModal('login');
    return;
  }
  uploadedBase64Photos = [];
  document.getElementById('cp-photo-previews').innerHTML = '';
  document.getElementById('create-pet-modal').style.display = 'flex';
};

window.handlePetPhotosSelected = function(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const container = document.getElementById('cp-photo-previews');

  Array.from(files).slice(0, 5).forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target.result;
      uploadedBase64Photos.push(b64);
      const img = document.createElement('img');
      img.src = b64;
      img.className = 'preview-thumb';
      container.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
};

window.handleCepLookup = async function(cepRaw) {
  const clean = (cepRaw || '').replace(/\D/g, '');
  if (clean.length === 8) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data && !data.erro) {
        document.getElementById('cp-location').value = `${data.bairro}, ${data.localidade} - ${data.uf}`;
      }
    } catch {}
  }
};

window.handleGpsLookup = function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.address) {
          const cep = (data.address.postcode || '').replace(/\D/g, '');
          if (cep) {
            document.getElementById('cp-cep').value = cep;
            await handleCepLookup(cep);
            alert(`📍 CEP identificado automaticamente: ${cep}`);
            return;
          }
          document.getElementById('cp-location').value = data.display_name.split(',').slice(0, 3).join(',');
        }
      } catch {
        alert("Localização capturada pelo navegador.");
      }
    }, () => {
      alert("Permissão de localização negada no navegador.");
    });
  }
};

window.handleCreatePetSubmit = async function(e) {
  e.preventDefault();
  const name = document.getElementById('cp-name').value.trim();
  const species = document.getElementById('cp-species').value;
  const gender = document.getElementById('cp-gender').value;
  const breed = document.getElementById('cp-breed').value.trim() || 'SRD';
  const size = document.getElementById('cp-size').value;
  const ageMonths = parseInt(document.getElementById('cp-age').value, 10) || 12;
  const vaccinated = document.getElementById('cp-vac').checked;
  const neutered = document.getElementById('cp-neu').checked;
  const dewormed = document.getElementById('cp-dew').checked;
  const desc = document.getElementById('cp-desc').value.trim();
  const locationHint = document.getElementById('cp-location').value.trim();
  const whatsapp = document.getElementById('cp-whatsapp').value.trim();
  const instagram = document.getElementById('cp-instagram').value.trim();

  // Filtro de conteúdo ofensivo
  if (containsOffensive(name) || containsOffensive(desc) || containsOffensive(locationHint)) {
    alert("Conteúdo Bloqueado 🚫: Não é permitido cadastrar animais com termos ofensivos ou impróprios.");
    return;
  }

  const submitBtn = document.getElementById('cp-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando no banco de dados...';

  try {
    // Geocodificação pelo endereço/CEP
    let coords = { latitude: -22.755, longitude: -43.452 };
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationHint)}`);
      const geoData = await geoRes.json();
      if (geoData && geoData[0]) {
        coords = { latitude: parseFloat(geoData[0].lat), longitude: parseFloat(geoData[0].lon) };
      }
    } catch {}

    await addDoc(collection(db, 'pets'), {
      ownerId: currentUser.uid,
      ownerName: currentProfile?.name || currentUser.displayName || 'Doador DoaPet',
      ownerRole: currentProfile?.role || 'user',
      name,
      species,
      breed,
      size,
      gender,
      ageMonths,
      medical: { vaccinated, neutered, dewormed },
      description: desc,
      location: coords,
      locationHint,
      whatsapp: whatsapp || null,
      instagram: instagram || null,
      photos: uploadedBase64Photos.length > 0 ? uploadedBase64Photos : ['./logo.png'],
      status: 'available',
      createdAt: serverTimestamp()
    });

    alert("🎉 Pet publicado com sucesso! Ele já está visível na vitrine e no mapa!");
    closeAllModals();
    await loadInitialData();
  } catch (err) {
    alert("Erro ao cadastrar pet: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ Publicar Pet para Doação';
  }
};

// -------------------------------------------------------------
// CRIAR ALERTA SOS RUA
// -------------------------------------------------------------
window.openCreateSosModal = function() {
  if (!currentUser) {
    alert("Faça login para registrar um alerta de resgate!");
    openAuthModal('login');
    return;
  }
  uploadedSosBase64 = null;
  document.getElementById('cs-preview').style.display = 'none';
  document.getElementById('create-sos-modal').style.display = 'flex';
};

window.handleSosPhotoSelected = function(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    uploadedSosBase64 = event.target.result;
    const preview = document.getElementById('cs-preview');
    preview.src = uploadedSosBase64;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
};

window.handleCreateSosSubmit = async function(e) {
  e.preventDefault();
  const desc = document.getElementById('cs-desc').value.trim();
  const address = document.getElementById('cs-address').value.trim();

  if (containsOffensive(desc) || containsOffensive(address)) {
    alert("Descrição Bloqueada 🚫: Termos ofensivos não são permitidos.");
    return;
  }

  const btn = document.getElementById('cs-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Disparando alerta...';

  try {
    let coords = { latitude: -22.755, longitude: -43.452 };
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch {}
    }

    await addDoc(collection(db, 'sos_alerts'), {
      authorId: currentUser.uid,
      authorName: currentProfile?.name || currentUser.displayName || 'Protetor Web',
      description: desc,
      addressHint: address,
      location: coords,
      photos: uploadedSosBase64 ? [uploadedSosBase64] : ['./logo.png'],
      status: 'open',
      createdAt: Date.now()
    });

    alert("🚨 Alerta SOS registrado com sucesso! Protetores da região foram alertados.");
    closeAllModals();
    await loadInitialData();
  } catch (err) {
    alert("Erro ao criar alerta: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚨 Disparar Alerta SOS no Mapa';
  }
};

// -------------------------------------------------------------
// PERFIL DO USUÁRIO & MEUS PETS
// -------------------------------------------------------------
async function loadMyPets(userId) {
  try {
    const q = query(collection(db, 'pets'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    myUserPets = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const list = document.getElementById('my-pets-list');
    if (!list) return;

    if (myUserPets.length === 0) {
      list.innerHTML = `<div style="font-size: 13px; color: var(--text-muted);">Você ainda não cadastrou nenhum pet para doação.</div>`;
      return;
    }

    list.innerHTML = myUserPets.map(p => `
      <div style="display: flex; align-items: center; justify-content: space-between; background: #F8FAFC; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${p.photos?.[0] || './logo.png'}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" />
          <div style="text-align: left;">
            <div style="font-weight: 800; font-size: 14px;">${p.name}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${p.status === 'adopted' ? '🎉 Adotado' : p.status === 'removed' ? '❌ Removido' : '🟢 Disponível'}</div>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-primary-sm" style="background: #FEF3C7; color: #B45309; border: 1px solid #F59E0B; padding: 6px 10px;" onclick="openEditPetModal('${p.id}')">✏️ Editar</button>
        </div>
      </div>
    `).join('');
  } catch {}
}

// -------------------------------------------------------------
// SISTEMA DE LOGIN / CADASTRO
// -------------------------------------------------------------
let authMode = 'login';

window.openAuthModal = function(mode = 'login') {
  authMode = mode;
  toggleAuthMode(mode);
  document.getElementById('auth-modal').style.display = 'flex';
};

window.toggleAuthMode = function(mode) {
  authMode = mode;
  const nameGroup = document.getElementById('group-name');
  const roleGroup = document.getElementById('group-role');
  const title = document.getElementById('auth-modal-title');
  const btnLogin = document.getElementById('btn-tab-login');
  const btnReg = document.getElementById('btn-tab-register');
  const submitBtn = document.getElementById('auth-submit-btn');

  if (mode === 'register') {
    nameGroup.style.display = 'block';
    roleGroup.style.display = 'block';
    title.textContent = 'Criar Nova Conta no DoaPet';
    btnLogin.className = 'btn-action btn-secondary';
    btnReg.className = 'btn-action';
    submitBtn.textContent = 'Criar Conta';
  } else {
    nameGroup.style.display = 'none';
    roleGroup.style.display = 'none';
    title.textContent = 'Entrar no DoaPet';
    btnLogin.className = 'btn-action';
    btnReg.className = 'btn-action btn-secondary';
    submitBtn.textContent = 'Entrar';
  }
};

window.handleAuthSubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-password').value.trim();
  const errorEl = document.getElementById('auth-error');
  errorEl.style.display = 'none';

  try {
    if (authMode === 'register') {
      const name = document.getElementById('auth-name').value.trim();
      const role = document.getElementById('auth-role').value;
      if (!name) {
        errorEl.textContent = 'Informe seu nome completo.';
        errorEl.style.display = 'block';
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        role,
        createdAt: serverTimestamp()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
    closeAllModals();
  } catch (err) {
    errorEl.textContent = 'Erro de autenticação: ' + err.message;
    errorEl.style.display = 'block';
  }
};

window.handleSignOut = async function() {
  if (confirm("Deseja realmente sair da sua conta?")) {
    await signOut(auth);
    switchView('vitrine');
  }
};

// -------------------------------------------------------------
// UTILITÁRIOS GERAIS
// -------------------------------------------------------------
window.closeAllModals = function() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
};

function renderCurrentView() {
  if (currentTab === 'vitrine') renderVitrine();
  else if (currentTab === 'sos') renderSosAlerts();
  else if (currentTab === 'swipe') renderSwipeCard();
}
