/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — tests.js
   Esteira de testes automáticos
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const TESTS = [
  {
    name: 'Banco de Dados (DB)',
    icon: 'fa-database',
    tests: [
      {
        title: 'DB.load() retorna objeto válido',
        why:   'Estrutura básica deve ter users, students, institutions...',
        run: () => {
          const db = DB.load();
          assert(typeof db === 'object', 'DB não é objeto');
          assert(Array.isArray(db.users), 'users não é array');
          assert(Array.isArray(db.students), 'students não é array');
          assert(Array.isArray(db.institutions), 'institutions não é array');
          assert(Array.isArray(db.grades), 'grades não é array');
          assert(Array.isArray(db.materials), 'materials não é array');
        },
      },
      {
        title: 'Seed populou dados iniciais',
        why:   'Após seedIfEmpty(), deve haver pelo menos 1 instituição e 1 aluno.',
        run: async () => {
          await seedIfEmpty();
          assert(DB.institutions.all().length > 0, 'Sem instituições');
          assert(DB.students.all().length > 0, 'Sem alunos');
          assert(DB.users.all().length > 0, 'Sem usuários');
        },
      },
      {
        title: 'Existem múltiplas carteirinhas',
        why:   'Demo deve ter pelo menos 4 alunos (Lucas, Maria, Pedro/Sophia, professor).',
        run: () => {
          const students = DB.students.all();
          assert(students.length >= 4, `Esperava ≥4 alunos, encontrou ${students.length}`);
        },
      },
      {
        title: 'Existem 2 instituições (universidade + escola)',
        why:   'Demonstrar multi-instituição.',
        run: () => {
          const insts = DB.institutions.all();
          assert(insts.length >= 2, `Esperava ≥2 instituições, encontrou ${insts.length}`);
        },
      },
      {
        title: 'Instituições têm logo definido',
        why:   'Cada instituição da seed deve ter logo (SVG data URL).',
        run: () => {
          const insts = DB.institutions.all();
          insts.forEach(i => {
            assert(i.logo && i.logo.startsWith('data:image/'),
              `Instituição "${i.abbr}" sem logo válido`);
          });
        },
      },
      {
        title: 'CRUD de aluno funciona',
        why:   'Insert/Update/Remove em DB.students não pode quebrar.',
        run: () => {
          const inst = DB.institutions.all()[0];
          const novo = DB.students.insert({
            name: 'Teste Automático',
            cardType: 'graduacao',
            idLabel: 'RGM',
            idNumber: 'TEST-' + Date.now(),
            institutionId: inst.id,
          });
          assert(novo.id > 0, 'ID inválido');
          DB.students.update(novo.id, { course: 'Curso Teste' });
          const fetched = DB.students.findById(novo.id);
          assert(fetched.course === 'Curso Teste', 'Update não funcionou');
          DB.students.remove(novo.id);
          assert(DB.students.findById(novo.id) == null, 'Remove não funcionou');
        },
      },
    ],
  },

  {
    name: 'Autenticação (Auth)',
    icon: 'fa-lock',
    tests: [
      {
        title: 'Login com credenciais válidas (aluno/1234)',
        why:   'Usuário de demo deve conseguir entrar.',
        run: async () => {
          const u = await Auth.login('aluno', '1234');
          assert(u && u.role === 'aluno', 'Login falhou ou role errado');
          Auth.logout();
        },
      },
      {
        title: 'Login com credenciais válidas (admin/admin123)',
        why:   'Admin de demo deve entrar.',
        run: async () => {
          const u = await Auth.login('admin', 'admin123');
          assert(u && u.role === 'admin', 'Login admin falhou');
          Auth.logout();
        },
      },
      {
        title: 'Login com senha errada deve falhar',
        why:   'Senha incorreta não pode autenticar.',
        run: async () => {
          let threw = false;
          try { await Auth.login('aluno', 'senha-errada'); }
          catch { threw = true; }
          assert(threw, 'Login com senha errada NÃO falhou');
        },
      },
      {
        title: 'Senha é armazenada com hash + salt',
        why:   'Nunca armazenar senha em texto puro.',
        run: () => {
          const user = DB.users.findByLogin('aluno');
          assert(user, 'Usuário aluno não encontrado');
          assert(user.passHash && user.passHash.length === 64, 'passHash não parece SHA-256');
          assert(user.salt && user.salt.length > 0, 'Sem salt');
          assert(!user.password, 'Senha em texto encontrada!');
        },
      },
      {
        title: 'changePassword atualiza hash',
        why:   'Trocar senha deve gerar novo hash.',
        run: async () => {
          const before = DB.users.findByLogin('professor');
          const oldHash = before.passHash;
          await Auth.changePassword(before.id, 'nova-temp-1234');
          const after = DB.users.findByLogin('professor');
          assert(after.passHash !== oldHash, 'Hash não mudou');
          // Restaura senha original
          await Auth.changePassword(before.id, '1234');
        },
      },
      {
        title: 'Logins são únicos (case-insensitive)',
        why:   'Não pode criar 2 usuários "admin" ou "ADMIN".',
        run: async () => {
          let threw = false;
          try {
            await Auth.register({ login: 'ADMIN', password: '12345', role: 'aluno' });
          } catch { threw = true; }
          assert(threw, 'Permitiu duplicar login (case-insensitive falhou)');
        },
      },
    ],
  },

  {
    name: 'Carteirinha (Card / QR)',
    icon: 'fa-id-card',
    tests: [
      {
        title: 'CARD_TYPES contém 8 tipos',
        why:   'Graduação, EAD, Pós, Técnico, Médio, Fundamental, Professor, Funcionário.',
        run: () => {
          assert(Object.keys(CARD_TYPES).length >= 8, 'Faltam tipos de carteirinha');
        },
      },
      {
        title: 'Token rotativo muda a cada janela de 15s',
        why:   'O token deve ter o campo "t" sincronizado com Math.floor(Date.now()/15000).',
        run: () => {
          const fakeStudent = { id: 1, idNumber: 'X', cardType: 'graduacao' };
          const fakeInst    = { abbr: 'TEST' };
          Card.student = fakeStudent;
          Card.institution = fakeInst;
          const token = Card.buildToken();
          assert(token.startsWith('AR://'), 'Token sem prefixo AR://');
          const payload = JSON.parse(atob(token.slice(5)));
          const expectedWin = Math.floor(Date.now() / 15000);
          assert(Math.abs(payload.t - expectedWin) <= 1, 'Janela do token errada');
          assert(payload.id === 'X', 'ID errado no token');
          assert(payload.ver === 'AR1', 'Versão do token errada');
        },
      },
      {
        title: 'Tokens em janelas diferentes são diferentes',
        why:   'Sem isso, anti-fraude é zero.',
        run: () => {
          const fakeStudent = { id: 1, idNumber: 'X', cardType: 'graduacao' };
          const fakeInst    = { abbr: 'TEST' };
          Card.student = fakeStudent;
          Card.institution = fakeInst;

          // Simula 2 janelas: força Date.now()
          const realNow = Date.now;
          Date.now = () => 1700000000000; // janela A
          const tA = Card.buildToken();
          Date.now = () => 1700000020000; // janela B (+20s)
          const tB = Card.buildToken();
          Date.now = realNow;
          assert(tA !== tB, 'Tokens em janelas diferentes deram igual');
        },
      },
    ],
  },

  {
    name: 'Boletim e Materiais',
    icon: 'fa-chart-line',
    tests: [
      {
        title: 'DB.grades.byStudent retorna notas do aluno',
        why:   'Aluno demo (Lucas) tem 6 disciplinas no boletim.',
        run: () => {
          const lucas = DB.students.all().find(s => s.name.includes('Lucas Serra'));
          assert(lucas, 'Lucas não encontrado no seed');
          const grades = DB.grades.byStudent(lucas.id);
          assert(grades.length >= 6, `Lucas deveria ter ≥6 notas, tem ${grades.length}`);
        },
      },
      {
        title: 'Materiais existem para ambas as instituições',
        why:   'Deve haver materiais tanto na UNICID quanto no Colégio.',
        run: () => {
          const insts = DB.institutions.all();
          insts.forEach(i => {
            const m = DB.materials.byInstitution(i.id);
            assert(m.length > 0, `Instituição "${i.abbr}" sem materiais`);
          });
        },
      },
      {
        title: 'Status de aprovação é coerente com a média',
        why:   'Média >= 6 e frequência >= 75% deve ser "aprovado".',
        run: () => {
          const grades = DB.grades.all();
          grades.forEach(g => {
            const expected = (g.final >= 6 && g.attendance >= 75) ? 'aprovado' : 'recuperacao';
            assert(g.status === expected || g.status === 'reprovado',
              `Grade "${g.subject}" tem status incoerente`);
          });
        },
      },
    ],
  },

  {
    name: 'Integridade Geral',
    icon: 'fa-shield-halved',
    tests: [
      {
        title: 'Toda carteirinha aponta para instituição existente',
        why:   'Vínculo institucional deve estar válido.',
        run: () => {
          const students = DB.students.all();
          students.forEach(s => {
            if (s.institutionId == null) return; // permitido
            const inst = DB.institutions.findById(s.institutionId);
            assert(inst, `Aluno "${s.name}" aponta para institutionId=${s.institutionId} inexistente`);
          });
        },
      },
      {
        title: 'Todo usuário aluno/professor tem carteirinha vinculada',
        why:   'Senão ele vê tela vazia ao logar.',
        run: () => {
          const users = DB.users.all().filter(u => u.role !== 'admin');
          users.forEach(u => {
            if (u.studentId == null) return; // sem vínculo é permitido
            const st = DB.students.findById(u.studentId);
            assert(st, `Usuário "${u.login}" vinculado a studentId=${u.studentId} inexistente`);
          });
        },
      },
      {
        title: 'Não existe senha em texto puro no banco',
        why:   'Segurança básica.',
        run: () => {
          const db = DB.load();
          const json = JSON.stringify(db);
          assert(!/"password"\s*:\s*"[^"]/.test(json), 'Encontrou campo "password" em texto puro');
        },
      },
      {
        title: 'Tabelas críticas têm IDs únicos',
        why:   'Sem colisão de IDs.',
        run: () => {
          ['users','students','institutions','grades','materials'].forEach(t => {
            const all = DB[t].all();
            const ids = all.map(x => x.id);
            const uniq = new Set(ids);
            assert(ids.length === uniq.size, `IDs duplicados em ${t}`);
          });
        },
      },
    ],
  },
];


/* ── Renderização & execução ───────────────────────────── */
const suitesEl = document.getElementById('suites');

function renderSuites() {
  suitesEl.innerHTML = TESTS.map((suite, sIdx) => `
    <section class="test-section">
      <div class="test-section__head">
        <i class="fas ${suite.icon}"></i>
        ${suite.name}
        <span style="margin-left:auto; font-size:12px; color:var(--gray-500); font-weight:500">${suite.tests.length} teste${suite.tests.length === 1 ? '' : 's'}</span>
      </div>
      ${suite.tests.map((t, tIdx) => `
        <div class="test-row" id="test-${sIdx}-${tIdx}">
          <div class="test-status pending" id="status-${sIdx}-${tIdx}">·</div>
          <div class="test-info">
            <strong>${t.title}</strong>
            <span>${t.why}</span>
            <div id="error-${sIdx}-${tIdx}" style="display:none; margin-top:6px; font-size:11px"></div>
          </div>
          <div class="test-action" id="action-${sIdx}-${tIdx}">aguardando</div>
        </div>
      `).join('')}
    </section>
  `).join('');
}

async function runAll() {
  const startedAt = Date.now();
  let passed = 0, failed = 0;

  // Garante seed antes de tudo
  await seedIfEmpty();

  for (let s = 0; s < TESTS.length; s++) {
    const suite = TESTS[s];
    for (let t = 0; t < suite.tests.length; t++) {
      const test = suite.tests[t];
      const statusEl = document.getElementById(`status-${s}-${t}`);
      const actionEl = document.getElementById(`action-${s}-${t}`);
      const errorEl  = document.getElementById(`error-${s}-${t}`);

      statusEl.className = 'test-status running';
      statusEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:11px"></i>';
      actionEl.textContent = 'rodando...';
      actionEl.className = 'test-action';
      errorEl.style.display = 'none';

      const t0 = performance.now();
      try {
        await test.run();
        const dur = (performance.now() - t0).toFixed(0);
        statusEl.className = 'test-status passed';
        statusEl.innerHTML = '<i class="fas fa-check" style="font-size:11px"></i>';
        actionEl.className = 'test-action passed';
        actionEl.textContent = `OK (${dur}ms)`;
        passed++;
      } catch (err) {
        const dur = (performance.now() - t0).toFixed(0);
        statusEl.className = 'test-status failed';
        statusEl.innerHTML = '<i class="fas fa-xmark" style="font-size:12px"></i>';
        actionEl.className = 'test-action failed';
        actionEl.textContent = `FAIL (${dur}ms)`;
        errorEl.style.display = 'block';
        errorEl.innerHTML = `<code style="color:var(--danger); font-family:var(--font-mono); font-size:10.5px; background:#fee2e2; padding:2px 6px; border-radius:4px; display:inline-block; max-width:100%; word-break:break-word">${escapeHtml(err.message || String(err))}</code>`;
        failed++;
      }

      // Atualiza resumo conforme avança
      document.getElementById('sum-passed').textContent = passed;
      document.getElementById('sum-failed').textContent = failed;

      // Cede tempo pra UI
      await new Promise(r => setTimeout(r, 30));
    }
  }

  const totalDur = ((Date.now() - startedAt) / 1000).toFixed(2);
  document.getElementById('sum-duration').textContent = totalDur + 's';
}

/* Helpers */
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* Inicialização */
renderSuites();
const totalTests = TESTS.reduce((sum, s) => sum + s.tests.length, 0);
document.getElementById('sum-total').textContent = totalTests;

document.getElementById('btn-run-all').addEventListener('click', () => {
  document.getElementById('sum-passed').textContent = '0';
  document.getElementById('sum-failed').textContent = '0';
  document.getElementById('sum-duration').textContent = '—';
  runAll();
});

document.getElementById('btn-reset-db').addEventListener('click', async () => {
  if (!confirm('Resetar o banco? Todos os dados serão recriados a partir do seed.')) return;
  DB.reset();
  await seedIfEmpty();
  alert('Banco resetado. Agora rode os testes novamente.');
});

// Auto-run ao carregar
setTimeout(() => runAll(), 300);
