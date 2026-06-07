/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — card.js
   Lógica da carteirinha digital (face única, QR rotativo no front)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const CARD_TYPES = {
  graduacao:         { banner: 'GRADUAÇÃO',           docType: 'Identificação Estudantil',  typeName: 'Estudante Universitário'  },
  graduacao_ead:     { banner: 'GRADUAÇÃO EAD',        docType: 'Identificação Estudantil',  typeName: 'Universitário EAD'        },
  posgraduacao:      { banner: 'PÓS-GRADUAÇÃO',        docType: 'Identificação de Pós-Grad.', typeName: 'Pós-Graduando'           },
  tecnico:           { banner: 'CURSO TÉCNICO',        docType: 'Identificação Estudantil',  typeName: 'Aluno Técnico'            },
  ensinoMedio:       { banner: 'ENSINO MÉDIO',         docType: 'Identificação Escolar',     typeName: 'Aluno Ensino Médio'       },
  ensinoFundamental: { banner: 'ENSINO FUNDAMENTAL',   docType: 'Identificação Escolar',     typeName: 'Aluno Ensino Fundamental' },
  professor:         { banner: 'PROFESSOR / DOCENTE',  docType: 'Identificação Docente',     typeName: 'Professor / Docente'      },
  funcionario:       { banner: 'FUNCIONÁRIO',          docType: 'Identificação Funcional',   typeName: 'Funcionário'              },
};

const Card = {
  student: null,
  institution: null,
  qrInstance: null,
  qrModalInstance: null,
  lastWindow: -1,
  timerInterval: null,

  init(student, institution) {
    this.student = student;
    this.institution = institution;
    this.applyColors();
    this.renderFront();
    this.initQR();
    this.initQRModal();
    this.startTimer();
    this.bindZoom();
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
    const nameInitial = (s.name || '?').trim().charAt(0).toUpperCase();
    const instInitial = (i.abbr || '?').charAt(0).toUpperCase();

    paintLogo('cf-logo-img', 'cf-logo-letter', i.logo, instInitial);

    setText('cf-inst-abbr', i.abbr || '—');
    setText('cf-inst-full', i.fullName || '—');
    setText('cf-doctype',   ct.docType);

    setText('cf-name',      s.name || '—');
    setText('cf-course',    s.course || '—');
    setText('cf-id-label',  s.idLabel || 'ID');
    setText('cf-id-value',  s.idNumber || '—');
    setText('cf-validity',  s.validity || '—');
    setText('cf-birth',     s.birthDate || '—');
    setText('cf-banner',    ct.banner);
    setText('cf-semester',  s.semester || s.courseCode || ct.typeName);

    // Foto
    const photo = document.getElementById('cf-photo');
    const ph    = document.getElementById('cf-photo-ph');
    if (photo && ph) {
      if (s.photo) {
        photo.src = s.photo;
        photo.style.display = 'block';
        ph.style.display = 'none';
      } else {
        photo.style.display = 'none';
        ph.style.display = 'flex';
        ph.textContent = nameInitial;
      }
    }
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
    if (!container || typeof QRCode === 'undefined') return;
    container.innerHTML = '';
    this.qrInstance = new QRCode(container, {
      text:         this.buildToken(),
      width:        116,
      height:       116,
      colorDark:    '#0a0a1f',
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
    const modalOverlay = document.getElementById('qr-modal-overlay');
    if (modalOverlay) modalOverlay.classList.add('active');

    const newToken = this.buildToken();
    setTimeout(() => {
      this.qrInstance.clear();
      this.qrInstance.makeCode(newToken);
      if (this.qrModalInstance) {
        this.qrModalInstance.clear();
        this.qrModalInstance.makeCode(newToken);
      }
      if (overlay) overlay.classList.remove('active');
      if (modalOverlay) modalOverlay.classList.remove('active');
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
    const ringFill  = document.getElementById('cf-ring-fill');
    const ringCount = document.getElementById('cf-ring-count');
    const qrBlock   = document.getElementById('cf-qr-block');
    const secsLbl   = document.getElementById('cf-secs');
    if (!ringFill || !ringCount) return;

    const elapsed   = (Date.now() % 15000) / 1000;
    const remaining = 15 - elapsed;
    const fraction  = remaining / 15;

    const CIRC = 75.4; // 2π × 12
    const offset = CIRC * (1 - fraction);
    ringFill.style.strokeDashoffset = offset.toFixed(2);

    if (qrBlock) {
      qrBlock.classList.remove('warning', 'danger');
      if (remaining <= 4)      qrBlock.classList.add('danger');
      else if (remaining <= 8) qrBlock.classList.add('warning');
    }

    const secs = Math.ceil(remaining);
    ringCount.textContent = secs;
    if (secsLbl) secsLbl.textContent = secs;
    const modalSecs = document.getElementById('qr-modal-secs');
    if (modalSecs) modalSecs.textContent = secs;

    // Atualiza QR ao trocar janela
    const win = this.currentWindow();
    if (win !== this.lastWindow) this.refreshQR();
  },

  // ─── QR Modal (Visão catraca) ─────────────────────
  initQRModal() {
    const container = document.getElementById('qr-modal-qr');
    if (!container || typeof QRCode === 'undefined') return;
    container.innerHTML = '';
    this.qrModalInstance = new QRCode(container, {
      text:         this.buildToken(),
      width:        320,
      height:       320,
      colorDark:    '#0a0a1f',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });

    // Preenche header do modal
    setText('qr-modal-inst', this.institution.abbr || '—');
    setText('qr-modal-name', this.student.name || '—');
    setText('qr-modal-id',   (this.student.idLabel || 'ID') + ': ' + (this.student.idNumber || '—'));
  },

  bindZoom() {
    const btnOpen = document.getElementById('btn-zoom-qr');
    const btnClose = document.getElementById('btn-close-qr');
    const modal = document.getElementById('qr-modal');
    if (!btnOpen || !modal) return;

    const open = () => {
      modal.classList.add('visible');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    const close = () => {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    btnOpen.addEventListener('click', open);
    btnClose?.addEventListener('click', close);
    modal.querySelectorAll('[data-close-qr]').forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('visible')) close();
    });
  },
};

/* Helpers */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function paintLogo(imgId, letterId, logoUrl, fallbackLetter) {
  const img = document.getElementById(imgId);
  const letter = document.getElementById(letterId);
  if (!img || !letter) return;
  if (logoUrl) {
    img.src = logoUrl;
    img.style.display = 'block';
    letter.style.display = 'none';
  } else {
    img.style.display = 'none';
    letter.style.display = 'inline';
    letter.textContent = fallbackLetter;
  }
}

window.Card = Card;
window.CARD_TYPES = CARD_TYPES;
