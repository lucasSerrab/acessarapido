/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — app.js
   Dashboard pós-login: tabs, boletim, instituição, materiais, perfil
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const PAGE_TITLES = {
  carteirinha:  'Carteirinha',
  boletim:      'Boletim',
  instituicao:  'Instituição',
  materiais:    'Materiais',
  perfil:       'Perfil',
};

(async function main() {
  // Garante seed
  await seedIfEmpty();

  // Exige autenticação
  const user = Auth.requireAuth('login.html');
  if (!user) return;

  // ── Modo impersonação (admin viewing as student via ?as=ID) ──
  const params = new URLSearchParams(window.location.search);
  const asId = parseInt(params.get('as'), 10);
  let viewAsStudent = null;
  if (asId && user.role === 'admin') {
    viewAsStudent = DB.students.findById(asId);
    if (!viewAsStudent) {
      alert('Aluno #' + asId + ' não encontrado.');
      window.location.href = 'admin.html';
      return;
    }
  }

  // Admin sem ?as= vai pro painel
  if (user.role === 'admin' && !viewAsStudent) {
    window.location.href = 'admin.html';
    return;
  }

  // Carrega aluno: impersonação tem prioridade, senão vínculo do user
  const student = viewAsStudent || (user.studentId ? DB.students.findById(user.studentId) : null);
  const institution = student ? DB.institutions.findById(student.institutionId) : DB.institutions.all()[0];

  if (!student) {
    document.body.innerHTML = '<div style="padding:60px; text-align:center;"><h2>Conta sem aluno vinculado.</h2><a href="login.html">Voltar</a></div>';
    return;
  }

  // Banner de impersonação
  if (viewAsStudent) showImpersonateBanner(student);

  // ─── Renderiza dados do usuário no menu ───
  renderUserCard(user, student);

  // ─── Inicializa a carteirinha ───
  Card.init(student, institution);

  // ─── Inicializa cada aba ───
  renderBoletim(student);
  renderInstituicao(institution);
  renderMateriais(student, institution);
  renderPerfil(user, student);

  // ─── Navegação entre abas ───
  bindTabs();

  // ─── Logout (todos os botões) ───
  ['btn-logout', 'btn-logout-top', 'btn-logout-perfil'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      if (!confirm('Sair da conta?')) return;
      Auth.logout();
      window.location.href = 'login.html';
    });
  });
})();


/** Mostra banner amarelo no topo: "Você está visualizando como X (admin)" */
function showImpersonateBanner(student) {
  const banner = document.createElement('div');
  banner.className = 'impersonate-banner';
  banner.innerHTML = `
    <i class="fas fa-eye"></i>
    <span>Visualizando carteirinha de <strong>${escapeHtml(student.name)}</strong> (modo admin)</span>
    <a href="admin.html" class="impersonate-banner__back">
      <i class="fas fa-arrow-left"></i> Voltar ao painel
    </a>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
  document.body.classList.add('has-impersonate-banner');
}


/* ── User card no rodapé do sidebar ─────────────────────── */
function renderUserCard(user, student) {
  const avatar = document.getElementById('user-avatar');
  const name   = document.getElementById('user-name');
  const role   = document.getElementById('user-role');
  if (avatar) avatar.textContent = (student.name || user.login || '?').charAt(0).toUpperCase();
  if (name)   name.textContent   = student.name || user.login;
  if (role)   role.textContent   = user.role;
}


/* ── Navegação entre abas (sidebar + bottom nav) ─────────── */
function bindTabs() {
  const navs = document.querySelectorAll('.nav-item, .bottom-nav-item');
  navs.forEach(btn => {
    btn.addEventListener('click', () => switchTo(btn.dataset.section));
  });
}

function switchTo(section) {
  // Atualiza navs
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === section);
  });
  document.querySelectorAll('.bottom-nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === section);
  });

  // Atualiza seções
  document.querySelectorAll('.page-section').forEach(s => {
    s.classList.toggle('active', s.id === 'section-' + section);
  });

  // Título topbar
  const title = document.getElementById('page-title');
  if (title) title.textContent = PAGE_TITLES[section] || '';

  // Scroll
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ╔══════════════════════════════════════════════════╗
   ║              BOLETIM                              ║
   ╚══════════════════════════════════════════════════╝ */

function renderBoletim(student) {
  const grades = DB.grades.byStudent(student.id);
  const tbody  = document.getElementById('grades-tbody');
  const summary= document.getElementById('boletim-summary');
  const count  = document.getElementById('boletim-count');
  if (!tbody || !summary) return;

  // ── Lista de períodos
  const periods = [...new Set(grades.map(g => g.period))].sort().reverse();
  const periodSelect = document.getElementById('boletim-period');
  if (periodSelect && periods.length) {
    periodSelect.innerHTML = periods.map(p => `<option value="${p}">${p}</option>`).join('');
    periodSelect.addEventListener('change', () => paintTable(periodSelect.value));
  }

  // ── Estatísticas gerais
  const totalSubjects = grades.length;
  const approved      = grades.filter(g => g.status === 'aprovado').length;
  const avgFinal      = totalSubjects ? (grades.reduce((s, g) => s + g.final, 0) / totalSubjects).toFixed(1) : '0.0';
  const avgAtt        = totalSubjects ? Math.round(grades.reduce((s, g) => s + g.attendance, 0) / totalSubjects) : 0;

  summary.innerHTML = `
    <div class="summary-card">
      <div class="summary-card__label">Média geral</div>
      <div class="summary-card__value ${avgClass(avgFinal)}">${avgFinal}</div>
      <div class="summary-card__sub">${totalSubjects} disciplinas</div>
    </div>
    <div class="summary-card">
      <div class="summary-card__label">Aprovado em</div>
      <div class="summary-card__value success">${approved}<span style="font-size:18px;color:var(--gray-500)">/${totalSubjects}</span></div>
      <div class="summary-card__sub">${totalSubjects ? Math.round(approved*100/totalSubjects) : 0}% de aprovação</div>
    </div>
    <div class="summary-card">
      <div class="summary-card__label">Frequência média</div>
      <div class="summary-card__value ${avgAtt >= 75 ? 'success' : 'warning'}">${avgAtt}%</div>
      <div class="summary-card__sub">${avgAtt >= 75 ? 'Acima do mínimo' : 'Abaixo do mínimo'}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card__label">Período</div>
      <div class="summary-card__value">${periods[0] || '—'}</div>
      <div class="summary-card__sub">${student.semester || ''}</div>
    </div>
  `;

  if (count) count.textContent = `${totalSubjects} disciplinas`;
  paintTable(periods[0]);

  function paintTable(period) {
    const list = grades.filter(g => g.period === period);
    document.getElementById('boletim-period-label').textContent = period || '—';
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--gray-500)">Sem notas para este período.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(g => `
      <tr>
        <td><strong>${escapeHtml(g.subject)}</strong></td>
        <td class="grade-num">${fmt(g.av1)}</td>
        <td class="grade-num">${fmt(g.av2)}</td>
        <td class="grade-num">${fmt(g.av3)}</td>
        <td class="grade-num grade-final" style="color: ${gradeColor(g.final)}">${fmt(g.final)}</td>
        <td class="grade-num">${g.attendance}%</td>
        <td>${statusChip(g.status)}</td>
      </tr>
    `).join('');
  }
}

function fmt(n) { return Number(n).toFixed(1); }
function avgClass(n) { const v = parseFloat(n); return v >= 7 ? 'success' : v >= 6 ? 'warning' : 'danger'; }
function gradeColor(n) {
  if (n >= 7) return 'var(--success)';
  if (n >= 6) return 'var(--warning)';
  return 'var(--danger)';
}
function statusChip(s) {
  if (s === 'aprovado')    return '<span class="chip chip--success">Aprovado</span>';
  if (s === 'recuperacao') return '<span class="chip chip--warning">Recuperação</span>';
  if (s === 'reprovado')   return '<span class="chip chip--danger">Reprovado</span>';
  return '<span class="chip chip--gray">—</span>';
}


/* ╔══════════════════════════════════════════════════╗
   ║              INSTITUIÇÃO                          ║
   ╚══════════════════════════════════════════════════╝ */

function renderInstituicao(inst) {
  if (!inst) return;
  setText('inst-abbr',    inst.abbr || '—');
  setText('inst-full',    inst.fullName || '—');
  setText('inst-address', inst.address || '—');
  setText('inst-phone',   inst.phone || '—');
  setText('inst-email',   inst.email || '—');
  setText('inst-site',    inst.site || '—');
  setText('inst-hours',   inst.hours || '—');

  const newsBox = document.getElementById('inst-news');
  if (!newsBox) return;
  const news = inst.news || [];
  if (!news.length) {
    newsBox.innerHTML = emptyState('newspaper', 'Sem comunicados', 'Nenhuma notícia foi publicada ainda.');
    return;
  }
  newsBox.innerHTML = news.map(n => `
    <article class="news-card">
      <div class="news-card__date">${formatDate(n.date)}</div>
      <h3>${escapeHtml(n.title)}</h3>
      <p>${escapeHtml(n.summary)}</p>
    </article>
  `).join('');
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}


/* ╔══════════════════════════════════════════════════╗
   ║              MATERIAIS                            ║
   ╚══════════════════════════════════════════════════╝ */

let _allMaterials = [];

function renderMateriais(student, institution) {
  const mats = DB.materials.byInstitution(institution.id);
  _allMaterials = mats;

  // Preenche filtro de disciplinas
  const subjects = [...new Set(mats.map(m => m.subject))].sort();
  const sel = document.getElementById('materials-filter');
  if (sel) {
    sel.innerHTML = '<option value="">Todas as disciplinas</option>' +
      subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    sel.addEventListener('change', () => filterMaterials());
  }

  const search = document.getElementById('materials-search');
  if (search) search.addEventListener('input', () => filterMaterials());

  paintMaterials(mats);
}

function filterMaterials() {
  const search  = (document.getElementById('materials-search')?.value || '').toLowerCase().trim();
  const subject = document.getElementById('materials-filter')?.value || '';

  const filtered = _allMaterials.filter(m => {
    const matchesSubject = !subject || m.subject === subject;
    const matchesSearch  = !search ||
      m.title.toLowerCase().includes(search) ||
      (m.subject || '').toLowerCase().includes(search);
    return matchesSubject && matchesSearch;
  });

  paintMaterials(filtered);
}

function paintMaterials(list) {
  const box = document.getElementById('materials-list');
  if (!box) return;
  if (!list.length) {
    box.innerHTML = emptyState('folder-open', 'Nenhum material encontrado', 'Tente ajustar os filtros ou a busca.');
    return;
  }
  box.innerHTML = list.map(m => `
    <button class="material-card" data-id="${m.id}">
      <div class="material-card__icon ${m.type}">
        <i class="fas ${iconForType(m.type)}"></i>
      </div>
      <div class="material-card__info">
        <strong>${escapeHtml(m.title)}</strong>
        <span>${escapeHtml(m.subject)} · ${escapeHtml(m.size)}</span>
      </div>
    </button>
  `).join('');

  // Click handler (demo: mostra toast)
  box.querySelectorAll('.material-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const mat = _allMaterials.find(m => m.id === id);
      if (mat) toast(`"${mat.title}" — download em breve (demo)`, 'info');
    });
  });
}

function iconForType(t) {
  switch (t) {
    case 'pdf':   return 'fa-file-pdf';
    case 'pptx':  return 'fa-file-powerpoint';
    case 'docx':  return 'fa-file-word';
    case 'xlsx':  return 'fa-file-excel';
    case 'ipynb': return 'fa-file-code';
    default:      return 'fa-file';
  }
}


/* ╔══════════════════════════════════════════════════╗
   ║              PERFIL                               ║
   ╚══════════════════════════════════════════════════╝ */

function renderPerfil(user, student) {
  document.getElementById('perfil-name').value   = student.name;
  document.getElementById('perfil-login').value  = user.login;
  document.getElementById('perfil-course').value = student.course;
  document.getElementById('perfil-role').value   = user.role;

  const form = document.getElementById('change-pass-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const p1 = document.getElementById('new-pass').value;
    const p2 = document.getElementById('new-pass-confirm').value;
    if (p1 !== p2) { toast('As senhas não conferem.', 'error'); return; }
    if (p1.length < 4) { toast('Senha muito curta.', 'error'); return; }
    try {
      await Auth.changePassword(user.id, p1);
      toast('Senha alterada com sucesso!', 'success');
      form.reset();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}


/* ─── Helpers ───────────────────────────────────────────── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function emptyState(icon, title, msg) {
  return `<div class="empty-state" style="grid-column:1/-1">
    <i class="fas fa-${icon}"></i>
    <h3>${title}</h3>
    <p>${msg}</p>
  </div>`;
}

function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast toast--' + type + ' visible';
  setTimeout(() => t.classList.remove('visible'), 2800);
}
