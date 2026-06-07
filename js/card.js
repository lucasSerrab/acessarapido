/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — card.js
   Lógica da carteirinha digital (render, flip, QR rotativo)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const CARD_TYPES = {
  graduacao:         { banner: 'GRADUAÇÃO',          shortTag: 'GRAD',   typeName: 'Estudante Universitário' },
  graduacao_ead:     { banner: 'GRADUAÇÃO EAD',       shortTag: 'EAD',    typeName: 'Universitário EAD' },
  posgraduacao:      { banner: 'PÓS-GRADUAÇÃO',       shortTag: 'PÓS',    typeName: 'Pós-Graduando' },
  tecnico:           { banner: 'CURSO TÉCNICO',       shortTag: 'TÉC',    typeName: 'Aluno Técnico' },
  ensinoMedio:       { banner: 'ENSINO MÉDIO',        shortTag: 'EM',     typeName: 'Ensino Médio' },
  ensinoFundamental: { banner: 'ENS. FUNDAMENTAL',    shortTag: 'EF',     typeName: 'Ensino Fundamental' },
  professor:         { banner: 'PROFESSOR / DOCENTE', shortTag: 'PROF',   typeName: 'Professor / Docente' },
  funcionario:       { banner: 'FUNCIONÁRIO',         shortTag: 'FUN',    typeName: 'Funcionário' },
};

const Card = {
  student: null,
  institution: null,
  qrInstance: null,
  lastWindow: -1,
  timerInterval: null,
  flipped: false,

  init(student, institution) {
    this.student = student;
    this.institution = institution;
    this.applyColors();
    this.renderFront();
    this.renderBack();
    this.initQR();
    this.startTimer();
    this.bindFlip();
  },

  applyColors() {
    if (!this.institution) return;
    const root = document.documentElement;
    root.style.setProperty('--card-logo',   this.institution.logoColor   || '#10b981');
    root.style.setProperty('--card-banner', this.institution.bannerColor || '#0b1f3f');
    root.style.setProperty('--card-accent', this.institution.accentColor || '#dbeafe');
  },

  renderFront() {
    const s = this.student;
    const i = this.institution;
    const ct = CARD_TYPES[s.cardType] || CARD_TYPES.graduacao;
    const initial = (s.name || '?').trim().charAt(0).toUpperCase();
    const instInitial = (i.abbr || '?').charAt(0).toUpperCase();

    setText('cf-logo',      instInitial);
    setText('cf-inst-abbr', i.abbr || '—');
    setText('cf-inst-full', i.fullName || '—');
    setText('cf-type-tag',  ct.shortTag);

    setText('cf-name',      s.name || '—');
    setText('cf-course',    s.course || '—');
    setText('cf-id-label',  s.idLabel || 'ID');
    setText('cf-id-value',  s.idNumber || '—');
    setText('cf-validity',  s.validity || '—');
    setText('cf-birth',     s.birthDate || '—');
    setText('cf-blood',     s.bloodType || '—');
    setText('cf-banner',    ct.banner);

    // Foto
    const photo = document.getElementById('cf-photo');
    const ph    = document.getElementById('cf-photo-ph');
    if (s.photo) {
      photo.src = s.photo;
      photo.style.display = 'block';
      ph.style.display = 'none';
    } else {
      photo.style.display = 'none';
      ph.style.display = 'flex';
      ph.textContent = initial;
    }
  },

  renderBack() {
    const s = this.student;
    const i = this.institution;

    setText('cb-inst',  i.abbr || '—');
    setText('cb-rg',    s.rg || 'Não informado');
    setText('cb-sem',   s.semester || s.courseCode || '—');
    setText('cb-emerg', s.emergencyContact || 'Não informado');

    // Barcode "fake" baseado no ID
    const id = (s.idNumber || '').replace(/\D/g, '').padStart(16, '0').slice(0, 16);
    const formatted = id.match(/.{1,4}/g).join(' ');
    setText('cb-barcode-text', formatted);
  },

  // ─── QR Code ──────────────────────────────────────
  buildToken() {
    const win = this.currentWindow();
    const payload = {
      id:   this.student.idNumber,
      sub:  this.student.id,
      t:    win,
      inst: this.institution.abbr,
      type: this.student.cardType,
      ver:  'AR1',
    };
    return 'AR://' + btoa(JSON.stringify(payload));
  },

  initQR() {
    const container = document.getElementById('qrcode-canvas');
    if (!container) return;
    container.innerHTML = '';
    this.qrInstance = new QRCode(container, {
      text:         this.buildToken(),
      width:        118,
      height:       118,
      colorDark:    '#0f172a',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });
    this.lastWindow = this.currentWindow();
  },

  refreshQR() {
    if (!this.qrInstance) return;
    this.lastWindow = this.currentWindow();
    const overlay = document.getElementById('qr-overlay');
    if (overlay) overlay.classList.add('active');

    setTimeout(() => {
      this.qrInstance.clear();
      this.qrInstance.makeCode(this.buildToken());
      if (overlay) overlay.classList.remove('active');
    }, 280);
  },

  currentWindow() {
    return Math.floor(Date.now() / 15000);
  },

  // ─── Timer ────────────────────────────────────────
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.updateTimer();
    this.timerInterval = setInterval(() => this.updateTimer(), 250);
  },

  updateTimer() {
    const ringFill  = document.getElementById('cb-ring-fill');
    const ringCount = document.getElementById('cb-ring-count');
    const timerBox  = document.getElementById('cb-timer');
    if (!ringFill || !ringCount) return;

    const elapsed  = (Date.now() % 15000) / 1000;
    const remaining = 15 - elapsed;
    const fraction  = remaining / 15;

    const CIRC = 62.83; // 2π × 10
    const offset = CIRC * (1 - fraction);
    ringFill.style.strokeDashoffset = offset.toFixed(2);

    // Cor / estado
    timerBox.classList.remove('warning', 'danger');
    if (remaining <= 4)      timerBox.classList.add('danger');
    else if (remaining <= 8) timerBox.classList.add('warning');

    ringCount.textContent = Math.ceil(remaining);

    // Atualiza QR ao trocar janela
    const win = this.currentWindow();
    if (win !== this.lastWindow) this.refreshQR();
  },

  // ─── Flip ─────────────────────────────────────────
  bindFlip() {
    const btn = document.getElementById('btn-flip');
    const lbl = document.getElementById('flip-label');
    const card = document.getElementById('id-card');
    if (!btn || !card) return;

    btn.addEventListener('click', () => {
      this.flipped = !this.flipped;
      card.classList.toggle('flipped', this.flipped);
      if (lbl) lbl.textContent = this.flipped ? 'Mostrar Frente' : 'Mostrar QR Code';
    });

    // Clique no próprio card também vira
    card.addEventListener('click', (e) => {
      // Evita disparar se clicar em algo dentro do verso (links no futuro)
      if (e.target.closest('a, button')) return;
      btn.click();
    });

    // Fullscreen
    const btnFull = document.getElementById('btn-fullscreen');
    if (btnFull) {
      btnFull.addEventListener('click', () => {
        const scene = document.querySelector('.id-scene');
        if (!scene) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else scene.requestFullscreen?.();
      });
    }
  },
};

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

window.Card = Card;
