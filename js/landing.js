/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — landing.js
   Carrossel de carteirinhas na hero da landing
   ═══════════════════════════════════════════════════════════════ */

'use strict';

(async function () {
  // Inicializa o banco com dados de demo na primeira visita
  await seedIfEmpty().catch(console.error);

  const stack = document.getElementById('cards-stack');
  const dots  = document.getElementById('cards-stack-dots');
  if (!stack || !dots) return;

  // Pega instituições e seleciona 3 alunos diferentes para showcase
  const institutions = DB.institutions.all();
  const students = DB.students.all();
  if (!institutions.length || !students.length) return;

  // Seleciona até 3 alunos com fotos diferentes (graduação, ensino médio, pós/professor)
  const showcase = pickShowcase(students, institutions);
  if (!showcase.length) return;

  // Renderiza as 3 cenas
  showcase.forEach((entry, idx) => {
    const sceneEl = buildScene(entry, idx);
    stack.appendChild(sceneEl);
  });

  // Renderiza os dots
  showcase.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.className = 'cards-stack-dot' + (idx === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Mostrar carteirinha ${idx + 1}`);
    dot.addEventListener('click', () => setActive(idx));
    dots.appendChild(dot);
  });

  // Estado e auto-rotação
  let active = 0;
  function setActive(idx) {
    active = ((idx % showcase.length) + showcase.length) % showcase.length;
    document.querySelectorAll('.cards-stack .id-scene').forEach((el, i) => {
      let state = 'next';
      if (i === active) state = 'active';
      else if (i === (active - 1 + showcase.length) % showcase.length) state = 'prev';
      el.dataset.state = state;
    });
    document.querySelectorAll('.cards-stack-dot').forEach((d, i) => {
      d.classList.toggle('active', i === active);
    });
  }

  setActive(0);
  let autoTimer = setInterval(() => setActive(active + 1), 4500);

  // Pausa quando o mouse está em cima
  stack.addEventListener('mouseenter', () => clearInterval(autoTimer));
  stack.addEventListener('mouseleave', () => {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => setActive(active + 1), 4500);
  });
})();


/* ─── Seleciona alunos variados ──────────────────────── */
function pickShowcase(students, institutions) {
  // Quero 3 cards diferentes: 1 universitário, 1 do ensino médio, 1 universitária mulher
  const findByName = (name) => students.find(s => s.name.toLowerCase().includes(name.toLowerCase()));

  const picks = [
    findByName('Maria Luiza'),
    findByName('Lucas Serra'),
    findByName('Sophia') || findByName('Pedro'),
  ].filter(Boolean);

  // Fallback: primeiros 3 alunos com photo
  if (picks.length < 3) {
    const withPhoto = students.filter(s => s.photo).slice(0, 3);
    return withPhoto.map(s => ({
      student: s,
      institution: institutions.find(i => i.id === s.institutionId) || institutions[0],
    }));
  }

  return picks.map(s => ({
    student: s,
    institution: institutions.find(i => i.id === s.institutionId) || institutions[0],
  }));
}


/* ─── Constrói uma cena (card) ───────────────────────── */
function buildScene(entry, idx) {
  const { student, institution } = entry;
  const ct = (window.CARD_TYPES && window.CARD_TYPES[student.cardType]) || { banner: 'CARTEIRINHA', docType: 'Identificação' };
  const nameInitial = (student.name || '?').charAt(0).toUpperCase();
  const instInitial = (institution.abbr || '?').charAt(0).toUpperCase();

  // CSS custom properties por card (cores da instituição)
  const styleVars =
    `--card-logo: ${institution.logoColor || '#10b981'}; ` +
    `--card-banner: ${institution.bannerColor || '#0b1f3f'}; ` +
    `--card-accent: ${institution.accentColor || '#dbeafe'};`;

  const scene = document.createElement('div');
  scene.className = 'id-scene';
  scene.dataset.state = idx === 0 ? 'active' : (idx === 2 ? 'next' : 'prev');
  scene.setAttribute('style', styleVars);

  scene.innerHTML = `
    <div class="id-card">
      <div class="id-face id-face--front">
        <div class="id-front__banner">
          <div class="id-front__logo">
            ${institution.logo
              ? `<img src="${institution.logo}" alt="" />`
              : `<span class="id-front__logo-letter">${instInitial}</span>`}
          </div>
          <div class="id-front__inst">
            <div class="id-front__inst-abbr">${escapeHtml(institution.abbr)}</div>
            <div class="id-front__inst-full">${escapeHtml(institution.fullName)}</div>
          </div>
        </div>
        <div class="id-front__doctype">${escapeHtml(ct.docType)}</div>
        <div class="id-front__hero">
          <div class="id-front__photo">
            ${student.photo
              ? `<img src="${student.photo}" alt="${escapeHtml(student.name)}" />`
              : `<div class="id-front__photo-ph">${nameInitial}</div>`}
          </div>
          <div class="id-front__name-wrap">
            <div class="id-front__name">${escapeHtml(student.name)}</div>
            <div class="id-front__course">${escapeHtml(student.course)}</div>
          </div>
        </div>
        <div class="id-front__fields">
          <div class="id-field">
            <span class="id-field__label">${escapeHtml(student.idLabel || 'ID')}</span>
            <span class="id-field__value">${escapeHtml(student.idNumber)}</span>
          </div>
          <div class="id-field">
            <span class="id-field__label">Validade</span>
            <span class="id-field__value">${escapeHtml(student.validity)}</span>
          </div>
        </div>
        <div class="id-front__footer">
          <div class="id-front__seal"><i class="fas fa-shield-halved"></i></div>
          <div class="id-front__type-info">
            <strong>${escapeHtml(ct.banner)}</strong>
            <span>${escapeHtml(student.semester || student.courseCode || '')}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  return scene;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
