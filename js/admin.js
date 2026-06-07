/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — admin.js
   Painel administrativo (multi-instituição)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const TAB_TITLES = {
  students:     'Carteirinhas',
  users:        'Usuários',
  institutions: 'Instituições',
  advanced:     'Avançado',
};

const CARD_TYPE_LABELS = {
  graduacao:         'Graduação',
  graduacao_ead:     'Graduação EAD',
  posgraduacao:      'Pós-Graduação',
  tecnico:           'Técnico',
  ensinoMedio:       'Ensino Médio',
  ensinoFundamental: 'Ensino Fundamental',
  professor:         'Professor',
  funcionario:       'Funcionário',
};

let _pendingPhoto = null;
let _pendingLogo  = null;
let _studentsFilter = { search: '', institution: '' };

(async function main() {
  // Sincroniza com a nuvem antes de tudo
  await CloudSync.init();

  await seedIfEmpty();

  const me = Auth.requireRole('admin', 'app.html');
  if (!me) return;

  setText('admin-name', me.login);

  bindTabs();
  bindLogout();

  renderStudents();
  renderUsers();
  renderInstitutions();
  populateStudentInstitutionSelect();
  populateStudentsFilterInst();

  bindStudentModal();
  bindUserModal();
  bindInstModal();
  bindAdvanced();

  // Re-renderiza quando outro dispositivo edita
  let rerenderTimer = null;
  window.addEventListener('db:remote-changed', () => {
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(() => {
      console.info('[Admin] Dados atualizados na nuvem — atualizando tabelas…');
      renderStudents();
      renderUsers();
      renderInstitutions();
      populateStudentInstitutionSelect();
      populateStudentsFilterInst();
    }, 600);
  });
  bindStudentsFilters();
})();


/* ── Navegação entre abas ───────────────────────────── */
function bindTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
      document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
      setText('page-title', TAB_TITLES[tab] || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function bindLogout() {
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (!confirm('Tem certeza que deseja sair?')) return;
    Auth.logout();
    window.location.href = 'login.html';
  });
}


/* ╔══════════════════════════════════════════════════╗
   ║       STUDENTS (Carteirinhas)                     ║
   ╚══════════════════════════════════════════════════╝ */

function renderStudents() {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  // Aplicar filtros
  let students = DB.students.all();
  const search = _studentsFilter.search.toLowerCase().trim();
  const filtInst = _studentsFilter.institution;

  if (filtInst) students = students.filter(s => String(s.institutionId) === String(filtInst));
  if (search) {
    students = students.filter(s =>
      (s.name || '').toLowerCase().includes(search) ||
      (s.course || '').toLowerCase().includes(search) ||
      (s.idNumber || '').toLowerCase().includes(search)
    );
  }

  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color: var(--gray-500)">Nenhuma carteirinha encontrada.</td></tr>`;
    return;
  }

  const institutions = DB.institutions.all();
  const instMap = Object.fromEntries(institutions.map(i => [i.id, i]));

  tbody.innerHTML = students.map(s => {
    const inst = instMap[s.institutionId];
    const initial = (s.name || '?').charAt(0).toUpperCase();
    const avatar = s.photo
      ? `<img src="${s.photo}" alt="" style="width:36px; height:36px; border-radius:50%; object-fit:cover; display:block" />`
      : `<div style="width:36px; height:36px; border-radius:50%; background:var(--brand-100); color:var(--brand-700); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px">${initial}</div>`;
    return `
      <tr>
        <td>${avatar}</td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${CARD_TYPE_LABELS[s.cardType] || s.cardType}</td>
        <td>${escapeHtml(s.course || '—')}</td>
        <td>${inst ? escapeHtml(inst.abbr) : '<span style="color:var(--gray-400)">—</span>'}</td>
        <td><code style="font-family:var(--font-mono); font-size:12px">${escapeHtml(s.idNumber || '—')}</code></td>
        <td>${escapeHtml(s.validity || '—')}</td>
        <td style="text-align:right; white-space:nowrap">
          <a href="app.html?as=${s.id}" class="btn btn--ghost btn-view-student" data-id="${s.id}" style="padding:6px 10px; color: var(--brand-700)" title="Ver carteirinha"><i class="fas fa-id-card"></i></a>
          <button class="btn btn--ghost btn-edit-student" data-id="${s.id}" style="padding:6px 10px" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="btn btn--ghost btn-del-student"  data-id="${s.id}" style="padding:6px 10px; color: var(--danger)" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-student').forEach(b => b.addEventListener('click', () => openStudentModal(parseInt(b.dataset.id, 10))));
  tbody.querySelectorAll('.btn-del-student').forEach(b => b.addEventListener('click', () => deleteStudent(parseInt(b.dataset.id, 10))));
}

function bindStudentsFilters() {
  const search = document.getElementById('students-search');
  const filt   = document.getElementById('students-filter-inst');
  search?.addEventListener('input', () => { _studentsFilter.search = search.value; renderStudents(); });
  filt?.addEventListener('change',  () => { _studentsFilter.institution = filt.value; renderStudents(); });
}

function populateStudentsFilterInst() {
  const sel = document.getElementById('students-filter-inst');
  if (!sel) return;
  const insts = DB.institutions.all();
  sel.innerHTML = '<option value="">Todas as instituições</option>' +
    insts.map(i => `<option value="${i.id}">${escapeHtml(i.abbr)}</option>`).join('');
}

function populateStudentInstitutionSelect() {
  const sel = document.getElementById('student-institution');
  if (!sel) return;
  const insts = DB.institutions.all();
  sel.innerHTML = insts.map(i =>
    `<option value="${i.id}">${escapeHtml(i.abbr)} — ${escapeHtml(i.fullName)}</option>`
  ).join('');
}

function deleteStudent(id) {
  const s = DB.students.findById(id);
  if (!s) return;
  if (!confirm(`Excluir carteirinha de "${s.name}"?\n\nUsuários vinculados também ficarão sem carteirinha.`)) return;
  DB.students.remove(id);
  // Limpa vínculo de usuários
  DB.users.all().forEach(u => {
    if (u.studentId === id) DB.users.update(u.id, { studentId: null });
  });
  renderStudents();
  renderUsers();
  toast('Carteirinha removida.', 'success');
}

function bindStudentModal() {
  document.getElementById('btn-new-student')?.addEventListener('click', () => openStudentModal());
  document.getElementById('btn-save-student')?.addEventListener('click', saveStudent);

  // Foto
  const photoInput  = document.getElementById('student-photo-input');
  const photoRemove = document.getElementById('student-photo-remove');
  const photoPrev   = document.getElementById('student-photo-preview');

  photoInput?.addEventListener('change', () => {
    const f = photoInput.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('Foto muito grande (máx 5MB).', 'error'); return; }
    const r = new FileReader();
    r.onload = e => {
      _pendingPhoto = e.target.result;
      photoPrev.innerHTML = `<img src="${_pendingPhoto}" alt="" />`;
    };
    r.readAsDataURL(f);
  });

  photoRemove?.addEventListener('click', () => {
    _pendingPhoto = null;
    photoPrev.innerHTML = '<i class="fas fa-user"></i>';
    if (photoInput) photoInput.value = '';
  });

  // Fechar modais
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => closeModal(el.dataset.closeModal));
  });
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('visible'); });
  });
}

function openStudentModal(id = null) {
  const isEdit = id != null;
  setText('modal-student-title', isEdit ? 'Editar carteirinha' : 'Nova carteirinha');
  _pendingPhoto = null;

  // (Re)popula select de instituições (admins podem ter criado novas)
  populateStudentInstitutionSelect();

  const allFields = ['student-id','student-name','student-course','student-idnumber','student-validity',
                     'student-birth','student-rg','student-semester','student-emerg'];

  if (isEdit) {
    const s = DB.students.findById(id);
    if (!s) return;
    document.getElementById('student-id').value           = s.id;
    document.getElementById('student-name').value         = s.name || '';
    document.getElementById('student-institution').value  = s.institutionId || '';
    document.getElementById('student-cardtype').value     = s.cardType || 'graduacao';
    document.getElementById('student-course').value       = s.course || '';
    document.getElementById('student-idlabel').value      = s.idLabel || 'RGM';
    document.getElementById('student-idnumber').value     = s.idNumber || '';
    document.getElementById('student-validity').value     = s.validity || '';
    document.getElementById('student-birth').value        = s.birthDate || '';
    document.getElementById('student-rg').value           = s.rg || '';
    document.getElementById('student-semester').value     = s.semester || '';
    document.getElementById('student-emerg').value        = s.emergencyContact || '';
    _pendingPhoto = s.photo || null;
    const prev = document.getElementById('student-photo-preview');
    prev.innerHTML = s.photo ? `<img src="${s.photo}" />` : '<i class="fas fa-user"></i>';
  } else {
    // Reset
    allFields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('student-cardtype').value = 'graduacao';
    document.getElementById('student-idlabel').value  = 'RGM';
    document.getElementById('student-photo-preview').innerHTML = '<i class="fas fa-user"></i>';
    // Pré-seleciona primeira instituição
    const firstInst = DB.institutions.all()[0];
    if (firstInst) document.getElementById('student-institution').value = firstInst.id;
  }

  openModal('modal-student');
}

function saveStudent() {
  const id   = document.getElementById('student-id').value;
  const data = {
    name:             val('student-name'),
    institutionId:    parseInt(val('student-institution'), 10) || null,
    cardType:         val('student-cardtype'),
    course:           val('student-course'),
    idLabel:          val('student-idlabel'),
    idNumber:         val('student-idnumber'),
    validity:         val('student-validity'),
    birthDate:        val('student-birth'),
    rg:               val('student-rg'),
    semester:         val('student-semester'),
    emergencyContact: val('student-emerg'),
    photo:            _pendingPhoto,
  };

  if (!data.name)          { toast('Informe o nome.', 'error'); return; }
  if (!data.idNumber)      { toast('Informe o número do ID.', 'error'); return; }
  if (!data.institutionId) { toast('Selecione uma instituição.', 'error'); return; }

  if (id) {
    DB.students.update(parseInt(id, 10), data);
    toast('Carteirinha atualizada.', 'success');
  } else {
    DB.students.insert(data);
    toast('Carteirinha criada.', 'success');
  }

  closeModal('modal-student');
  renderStudents();
  renderUsers(); // pode afetar a coluna "vinculado a"
}


/* ╔══════════════════════════════════════════════════╗
   ║       USERS                                       ║
   ╚══════════════════════════════════════════════════╝ */

function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const users = DB.users.all();

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color: var(--gray-500)">Nenhum usuário.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const student = u.studentId ? DB.students.findById(u.studentId) : null;
    const roleChip =
      u.role === 'admin'     ? '<span class="chip chip--warning">Admin</span>'    :
      u.role === 'professor' ? '<span class="chip chip--brand">Professor</span>'  :
                               '<span class="chip chip--gray">Aluno</span>';
    return `
      <tr>
        <td><strong>${escapeHtml(u.login)}</strong></td>
        <td>${roleChip}</td>
        <td>${student ? escapeHtml(student.name) : '<span style="color:var(--gray-400)">—</span>'}</td>
        <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}</td>
        <td style="text-align:right; white-space:nowrap">
          <button class="btn btn--ghost btn-edit-user" data-id="${u.id}" style="padding:6px 10px" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="btn btn--ghost btn-del-user"  data-id="${u.id}" style="padding:6px 10px; color: var(--danger)" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-user').forEach(b => b.addEventListener('click', () => openUserModal(parseInt(b.dataset.id, 10))));
  tbody.querySelectorAll('.btn-del-user').forEach(b => b.addEventListener('click', () => deleteUser(parseInt(b.dataset.id, 10))));
}

function deleteUser(id) {
  const u = DB.users.findById(id);
  if (!u) return;
  const me = Auth.current();
  if (me && me.id === id) { toast('Você não pode excluir a si mesmo.', 'error'); return; }
  if (!confirm(`Excluir usuário "${u.login}"?`)) return;
  DB.users.remove(id);
  renderUsers();
  toast('Usuário removido.', 'success');
}

function bindUserModal() {
  document.getElementById('btn-new-user')?.addEventListener('click', () => openUserModal());
  document.getElementById('btn-save-user')?.addEventListener('click', saveUser);
  document.getElementById('user-role')?.addEventListener('change', toggleUserStudentField);
}

function openUserModal(id = null) {
  const isEdit = id != null;
  setText('modal-user-title', isEdit ? 'Editar usuário' : 'Novo usuário');

  // Popula select de carteirinhas
  const students = DB.students.all();
  const sel = document.getElementById('user-student');
  if (sel) {
    sel.innerHTML = '<option value="">— (nenhuma) —</option>' +
      students.map(s => `<option value="${s.id}">${escapeHtml(s.name)} · ${escapeHtml(s.idNumber)}</option>`).join('');
  }

  if (isEdit) {
    const u = DB.users.findById(id);
    if (!u) return;
    document.getElementById('user-id').value      = u.id;
    document.getElementById('user-login').value   = u.login;
    document.getElementById('user-pass').value    = '';
    document.getElementById('user-role').value    = u.role;
    document.getElementById('user-student').value = u.studentId || '';
    document.getElementById('user-pass-hint').textContent = '(deixe em branco para manter a senha atual)';
  } else {
    document.getElementById('user-id').value      = '';
    document.getElementById('user-login').value   = '';
    document.getElementById('user-pass').value    = '';
    document.getElementById('user-role').value    = 'aluno';
    document.getElementById('user-student').value = '';
    document.getElementById('user-pass-hint').textContent = '(mín. 4 caracteres)';
  }
  toggleUserStudentField();
  openModal('modal-user');
}

function toggleUserStudentField() {
  const role = document.getElementById('user-role').value;
  const wrap = document.getElementById('user-student-wrap');
  if (!wrap) return;
  wrap.style.display = (role === 'admin') ? 'none' : '';
}

async function saveUser() {
  const id        = document.getElementById('user-id').value;
  const login     = val('user-login');
  const pass      = document.getElementById('user-pass').value;
  const role      = val('user-role');
  const studentIdRaw = val('user-student');
  const studentId = studentIdRaw ? parseInt(studentIdRaw, 10) : null;

  if (!login) { toast('Informe o login.', 'error'); return; }
  if (login.length < 3) { toast('Login muito curto (mín. 3 caracteres).', 'error'); return; }

  try {
    if (id) {
      const userId = parseInt(id, 10);
      const existing = DB.users.findByLogin(login);
      if (existing && existing.id !== userId) { toast('Já existe outro usuário com esse login.', 'error'); return; }

      if (pass && pass.length < 4) { toast('Senha muito curta (mín. 4 caracteres).', 'error'); return; }

      DB.users.update(userId, { login, role, studentId: role === 'admin' ? null : studentId });
      if (pass) await Auth.changePassword(userId, pass);
      toast('Usuário atualizado.', 'success');
    } else {
      if (!pass) { toast('Informe uma senha.', 'error'); return; }
      if (pass.length < 4) { toast('Senha muito curta (mín. 4 caracteres).', 'error'); return; }
      await Auth.register({
        login, password: pass, role,
        studentId: role === 'admin' ? null : studentId,
      });
      toast('Usuário criado.', 'success');
    }
    closeModal('modal-user');
    renderUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
}


/* ╔══════════════════════════════════════════════════╗
   ║       INSTITUTIONS                                ║
   ╚══════════════════════════════════════════════════╝ */

function renderInstitutions() {
  const tbody = document.getElementById('institutions-tbody');
  if (!tbody) return;
  const insts = DB.institutions.all();

  if (!insts.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color: var(--gray-500)">Nenhuma instituição.</td></tr>`;
    return;
  }

  const allStudents = DB.students.all();

  tbody.innerHTML = insts.map(i => {
    const count = allStudents.filter(s => s.institutionId === i.id).length;
    const logoCell = i.logo
      ? `<img src="${i.logo}" alt="" style="width:38px; height:38px; border-radius:8px; object-fit:contain; background:var(--gray-50); padding:4px; display:block" />`
      : `<div style="width:38px; height:38px; border-radius:8px; background:${i.logoColor || '#10b981'}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px">${(i.abbr || '?').charAt(0)}</div>`;
    const colors =
      `<span title="Logo" style="display:inline-block; width:14px; height:14px; border-radius:4px; background:${i.logoColor || '#000'}; border:1px solid rgba(0,0,0,0.1); vertical-align:middle"></span> ` +
      `<span title="Banner" style="display:inline-block; width:14px; height:14px; border-radius:4px; background:${i.bannerColor || '#000'}; border:1px solid rgba(0,0,0,0.1); vertical-align:middle; margin-left:4px"></span> ` +
      `<span title="Destaque" style="display:inline-block; width:14px; height:14px; border-radius:4px; background:${i.accentColor || '#000'}; border:1px solid rgba(0,0,0,0.1); vertical-align:middle; margin-left:4px"></span>`;
    return `
      <tr>
        <td>${logoCell}</td>
        <td><strong>${escapeHtml(i.abbr)}</strong></td>
        <td>${escapeHtml(i.fullName)}</td>
        <td>${colors}</td>
        <td><span class="chip chip--brand">${count} aluno${count === 1 ? '' : 's'}</span></td>
        <td style="text-align:right; white-space:nowrap">
          <button class="btn btn--ghost btn-edit-inst" data-id="${i.id}" style="padding:6px 10px" title="Editar"><i class="fas fa-pen"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-inst').forEach(b => b.addEventListener('click', () => openInstModal(parseInt(b.dataset.id, 10))));
}

function bindInstModal() {
  document.getElementById('btn-new-inst')?.addEventListener('click', () => openInstModal());
  document.getElementById('btn-save-inst')?.addEventListener('click', saveInst);

  // Atualização ao vivo dos hex labels
  ['logocolor','bannercolor','accentcolor'].forEach(c => {
    document.getElementById('inst-form-' + c)?.addEventListener('input', updateHexLabels);
  });

  // Upload de logo
  const input   = document.getElementById('inst-logo-input');
  const remove  = document.getElementById('inst-logo-remove');
  const preview = document.getElementById('inst-logo-preview');

  input?.addEventListener('change', () => {
    const f = input.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast('Logo muito grande (máx 2MB).', 'error'); return; }
    const r = new FileReader();
    r.onload = e => {
      _pendingLogo = e.target.result;
      preview.innerHTML = `<img src="${_pendingLogo}" alt="" style="width:100%; height:100%; object-fit:contain; padding:6px" />`;
    };
    r.readAsDataURL(f);
  });

  remove?.addEventListener('click', () => {
    _pendingLogo = null;
    preview.innerHTML = '<i class="fas fa-university"></i>';
    if (input) input.value = '';
  });
}

function openInstModal(id = null) {
  const isEdit = id != null;
  setText('modal-inst-title', isEdit ? 'Editar instituição' : 'Nova instituição');
  _pendingLogo = null;

  const preview = document.getElementById('inst-logo-preview');

  if (isEdit) {
    const i = DB.institutions.findById(id);
    if (!i) return;
    document.getElementById('inst-id').value                = i.id;
    document.getElementById('inst-form-abbr').value         = i.abbr || '';
    document.getElementById('inst-form-full').value         = i.fullName || '';
    document.getElementById('inst-form-logocolor').value    = i.logoColor   || '#10b981';
    document.getElementById('inst-form-bannercolor').value  = i.bannerColor || '#0b1f3f';
    document.getElementById('inst-form-accentcolor').value  = i.accentColor || '#dbeafe';
    document.getElementById('inst-form-address').value      = i.address || '';
    document.getElementById('inst-form-phone').value        = i.phone || '';
    document.getElementById('inst-form-email').value        = i.email || '';
    document.getElementById('inst-form-site').value         = i.site || '';
    document.getElementById('inst-form-hours').value        = i.hours || '';
    _pendingLogo = i.logo || null;
    preview.innerHTML = i.logo
      ? `<img src="${i.logo}" alt="" style="width:100%; height:100%; object-fit:contain; padding:6px" />`
      : '<i class="fas fa-university"></i>';
  } else {
    ['inst-id','inst-form-abbr','inst-form-full','inst-form-address',
     'inst-form-phone','inst-form-email','inst-form-site','inst-form-hours']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('inst-form-logocolor').value   = '#10b981';
    document.getElementById('inst-form-bannercolor').value = '#0b1f3f';
    document.getElementById('inst-form-accentcolor').value = '#dbeafe';
    preview.innerHTML = '<i class="fas fa-university"></i>';
  }
  updateHexLabels();
  openModal('modal-inst');
}

function saveInst() {
  const id = document.getElementById('inst-id').value;
  const data = {
    abbr:        val('inst-form-abbr'),
    fullName:    val('inst-form-full'),
    logo:        _pendingLogo,
    logoColor:   val('inst-form-logocolor'),
    bannerColor: val('inst-form-bannercolor'),
    accentColor: val('inst-form-accentcolor'),
    address:     val('inst-form-address'),
    phone:       val('inst-form-phone'),
    email:       val('inst-form-email'),
    site:        val('inst-form-site'),
    hours:       val('inst-form-hours'),
  };

  if (!data.abbr)     { toast('Informe a sigla.', 'error'); return; }
  if (!data.fullName) { toast('Informe o nome completo.', 'error'); return; }

  if (id) {
    DB.institutions.update(parseInt(id, 10), data);
    toast('Instituição atualizada.', 'success');
  } else {
    // Preserva o array news vazio
    DB.institutions.insert({ ...data, news: [] });
    toast('Instituição criada.', 'success');
  }
  closeModal('modal-inst');
  renderInstitutions();
  populateStudentInstitutionSelect();
  populateStudentsFilterInst();
  renderStudents();
}

function updateHexLabels() {
  ['logocolor','bannercolor','accentcolor'].forEach(c => {
    const v = document.getElementById('inst-form-' + c)?.value;
    const el = document.getElementById('hex-' + c);
    if (el && v) el.textContent = v.toUpperCase();
  });
}


/* ╔══════════════════════════════════════════════════╗
   ║       ADVANCED                                    ║
   ╚══════════════════════════════════════════════════╝ */

function bindAdvanced() {
  document.getElementById('btn-export')?.addEventListener('click', () => {
    const data = DB.load();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acessarapido-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup gerado.', 'success');
  });

  document.getElementById('file-import')?.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!confirm('Isso vai SUBSTITUIR todos os dados atuais. Continuar?')) {
      e.target.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.users || !parsed.students) throw new Error('JSON inválido.');
        DB.save(parsed);
        toast('Importado com sucesso. Recarregando…', 'success');
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        toast('Erro ao importar: ' + err.message, 'error');
      }
    };
    r.readAsText(f);
  });

  document.getElementById('btn-reset')?.addEventListener('click', async () => {
    if (!confirm('Tem CERTEZA? Todos os dados serão apagados e o banco voltará ao padrão.')) return;
    DB.reset();
    Auth.logout();
    await seedIfEmpty();
    toast('Banco resetado. Redirecionando…', 'success');
    setTimeout(() => window.location.href = 'login.html', 1000);
  });
}


/* ─── Helpers ───────────────────────────────────────── */
function openModal(id)  { document.getElementById(id)?.classList.add('visible');    }
function closeModal(id) { document.getElementById(id)?.classList.remove('visible'); }

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast toast--' + type + ' visible';
  setTimeout(() => t.classList.remove('visible'), 2800);
}
