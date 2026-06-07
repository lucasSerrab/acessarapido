/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — cloud-sync.js
   Sincronização do banco entre dispositivos via Firebase Firestore.

   ┌────────────────────────────────────────────────────────────┐
   │  COMO ATIVAR (3 minutos):                                  │
   │                                                            │
   │  1. Acesse https://console.firebase.google.com             │
   │  2. "Adicionar projeto" → dê um nome → Continuar           │
   │     (pode desativar Google Analytics)                      │
   │  3. No projeto, clique no ícone </> ("Web app") →          │
   │     dê um apelido → "Registrar aplicativo"                 │
   │  4. COPIE o objeto firebaseConfig e cole abaixo            │
   │     (substitua o objeto FIREBASE_CONFIG)                   │
   │  5. Menu lateral → "Build" → "Firestore Database" →        │
   │     "Criar banco de dados" → "Iniciar no modo de teste"    │
   │     → escolha região (southamerica-east1) → Habilitar      │
   │  6. Pronto! Faça commit + push. Todos os dispositivos      │
   │     que abrirem o site vão sincronizar automaticamente.    │
   │                                                            │
   │  Plano gratuito: 50k leituras/dia, 20k escritas/dia.       │
   │  Mais que suficiente pra demo/portfólio.                   │
   └────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════ */

'use strict';

window.CloudSync = (function () {

  // ╔════════════════════════════════════════════════════════════╗
  // ║  CONFIG DO PROJETO FIREBASE (acessarapido-e252f)           ║
  // ╚════════════════════════════════════════════════════════════╝
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBlT8dwP9mKDBx5x1E7DHnOEdtXPfvajbY",
    authDomain: "acessarapido-e252f.firebaseapp.com",
    projectId: "acessarapido-e252f",
    storageBucket: "acessarapido-e252f.firebasestorage.app",
    messagingSenderId: "1069396020648",
    appId: "1:1069396020648:web:12b0cfc593d5285f5c219d",
    measurementId: "G-HCH1K058FF"
  };

  // Documento único que guarda o estado inteiro do app
  const COLLECTION = 'app';
  const DOC_ID = 'data';

  // Estado interno
  let docRef = null;
  let initialized = false;
  let applyingRemote = false;   // flag para evitar loop push→pull
  let pushTimer = null;
  let firestore = null;         // módulos firebase carregados
  let unsubscribe = null;
  let lastAppliedHash = null;   // hash do último estado aplicado (evita eco)

  const isConfigured = () =>
    !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

  /** Hash rápido de string (djb2) — só para deduplicar snapshots */
  function _hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return h >>> 0;
  }

  /** Serializa estado ignorando campos voláteis para gerar hash estável */
  function _stateSignature(state) {
    if (!state) return '';
    // Remove updatedAt e sessions antes de hashear
    const { sessions, meta, ...rest } = state;
    const cleanMeta = meta ? { ...meta } : {};
    delete cleanMeta.updatedAt;
    return JSON.stringify({ ...rest, meta: cleanMeta });
  }

  /**
   * Inicializa o Firebase, faz pull inicial, registra listener
   * e instala hook em DB.save() para push automático.
   * @returns {Promise<boolean>} true se conseguiu sincronizar
   */
  async function init() {
    if (initialized) return true;

    if (!isConfigured()) {
      console.info('[CloudSync] Firebase não configurado — modo offline (localStorage apenas).');
      _setStatus('offline');
      return false;
    }

    try {
      _setStatus('connecting');

      const { initializeApp } = await import(
        'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js'
      );
      firestore = await import(
        'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js'
      );

      const app = initializeApp(FIREBASE_CONFIG);
      const db = firestore.getFirestore(app);
      docRef = firestore.doc(db, COLLECTION, DOC_ID);

      // 1) Pull inicial (se a nuvem tem dados, eles vencem o local)
      const snap = await firestore.getDoc(docRef);
      if (snap.exists()) {
        _applyRemote(snap.data(), { silent: true });
      } else if (window.DB && DB.load().meta.seeded) {
        // Nuvem vazia mas local já tem dados → faz bootstrap
        await _pushNow();
      }

      // 2) Listener em tempo real (ignora metadata-only e ecos)
      unsubscribe = firestore.onSnapshot(docRef, { includeMetadataChanges: false }, (s) => {
        if (!s.exists() || applyingRemote) return;
        // Ignora snapshots que ainda têm escritas locais pendentes (eco do nosso próprio setDoc)
        if (s.metadata && s.metadata.hasPendingWrites) return;
        _applyRemote(s.data());
      }, (err) => {
        console.warn('[CloudSync] erro no listener:', err);
        _setStatus('error');
      });

      // 3) Hook em DB.save → push automático (debounced)
      _installSaveHook();

      initialized = true;
      _setStatus('online');
      console.info('[CloudSync] Sincronização ativa.');
      return true;

    } catch (err) {
      console.error('[CloudSync] Falha ao iniciar:', err);
      _setStatus('error');
      return false;
    }
  }

  /** Aplica estado remoto no localStorage e re-renderiza a página */
  function _applyRemote(remote, opts = {}) {
    if (!remote || !window.DB) return;

    // Deduplicação: se o estado é igual ao que já temos aplicado, ignora
    const sig = _stateSignature(remote);
    if (sig === lastAppliedHash) return;
    lastAppliedHash = sig;

    const local = DB.load();

    // Preserva sessão local (login não sincroniza entre dispositivos)
    const merged = {
      ...remote,
      sessions: local.sessions || { current: null, expiresAt: 0 },
    };

    applyingRemote = true;
    try {
      localStorage.setItem('ar_db_v1', JSON.stringify(merged));
    } finally {
      // Pequeno delay para garantir que listeners sincronos terminem
      setTimeout(() => { applyingRemote = false; }, 50);
    }

    // Notifica a página para re-renderizar (a menos que silencioso)
    if (!opts.silent) {
      window.dispatchEvent(new CustomEvent('db:remote-changed', { detail: merged }));
    }
  }

  /** Patch em DB.save para empurrar pra nuvem após cada save local */
  function _installSaveHook() {
    if (!window.DB) return;
    const origSave = DB.save.bind(DB);
    DB.save = function (state) {
      origSave(state);
      if (initialized && !applyingRemote) _schedulePush();
    };
  }

  function _schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(_pushNow, 400);
  }

  async function _pushNow() {
    if (!docRef || !firestore || !window.DB) return;
    try {
      const local = DB.load();
      // Não envia sessões (login é local)
      const { sessions, ...payload } = local;
      // Marca hash ANTES de enviar — quando o snapshot ecoar de volta, será ignorado
      lastAppliedHash = _stateSignature(payload);
      payload.meta = { ...payload.meta, updatedAt: Date.now() };
      await firestore.setDoc(docRef, payload);
      _setStatus('online');
    } catch (err) {
      console.warn('[CloudSync] push falhou:', err);
      _setStatus('error');
    }
  }

  /** Atualiza o badge visual de status (se existir na página) */
  function _setStatus(state) {
    const labels = {
      offline:   { txt: 'Offline (local)', cls: 'sync-status--offline', icon: 'fa-cloud-slash' },
      connecting:{ txt: 'Conectando…',     cls: 'sync-status--syncing', icon: 'fa-cloud-arrow-up' },
      online:    { txt: 'Sincronizado',    cls: 'sync-status--online',  icon: 'fa-cloud' },
      error:     { txt: 'Erro de sync',    cls: 'sync-status--error',   icon: 'fa-triangle-exclamation' },
    };
    const info = labels[state] || labels.offline;
    document.querySelectorAll('[data-sync-status]').forEach(el => {
      el.className = 'sync-status ' + info.cls;
      el.innerHTML = `<i class="fas ${info.icon}"></i> <span>${info.txt}</span>`;
      el.title = state === 'offline'
        ? 'Firebase não configurado. Edições só aparecem neste dispositivo. Veja js/cloud-sync.js para ativar.'
        : info.txt;
    });
  }

  /** Força um push imediato (útil após import) */
  async function pushNow() {
    if (initialized) return _pushNow();
  }

  return { init, isConfigured, pushNow };
})();
