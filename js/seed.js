/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — seed.js
   Popula o banco com dados de demonstração realistas
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── Logos SVG inline (data URL) ──────────────────────────────
// Logos simples mas profissionais para as instituições demo.
const LOGO_UNICID = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <path d="M32 4 L56 14 V32 C56 46 46 56 32 60 C18 56 8 46 8 32 V14 Z" fill="url(#g1)"/>
  <path d="M32 8 L52 17 V32 C52 44 44 52 32 56 C20 52 12 44 12 32 V17 Z" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="1"/>
  <text x="32" y="40" font-family="Arial,sans-serif" font-weight="900" font-size="20" fill="#fff" text-anchor="middle" letter-spacing="-1">U</text>
</svg>
`);

const LOGO_CSMN = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="28" fill="url(#g2)"/>
  <circle cx="32" cy="32" r="24" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.5"/>
  <text x="32" y="29" font-family="Georgia,serif" font-weight="900" font-size="16" fill="#fff" text-anchor="middle">SM</text>
  <text x="32" y="44" font-family="Arial,sans-serif" font-weight="600" font-size="6" fill="#fff" text-anchor="middle" letter-spacing="1">COLÉGIO</text>
</svg>
`);

// Pravatar: avatares realistas gratuitos (sem auth)
const PHOTO_LUCAS    = 'https://i.pravatar.cc/300?img=68';
const PHOTO_MARIA    = 'https://i.pravatar.cc/300?img=47';
const PHOTO_PEDRO    = 'https://i.pravatar.cc/300?img=12';
const PHOTO_SOPHIA   = 'https://i.pravatar.cc/300?img=49';
const PHOTO_ANA      = 'https://i.pravatar.cc/300?img=44';
const PHOTO_RICARDO  = 'https://i.pravatar.cc/300?img=15';


async function seedIfEmpty() {
  const db = DB.load();
  if (db.meta.seeded) return;

  // ═══════════════════════════════════════════════
  // 1. INSTITUIÇÕES (2)
  // ═══════════════════════════════════════════════
  const unicid = DB.institutions.insert({
    abbr: 'UNICID',
    fullName: 'Universidade Cidade de São Paulo',
    logo: LOGO_UNICID,
    logoColor: '#10b981',
    bannerColor: '#0b1f3f',
    accentColor: '#e0f2fe',
    address: 'R. Cesário Galeno, 432 — Tatuapé, São Paulo/SP',
    phone: '(11) 2178-1200',
    email: 'contato@unicid.edu.br',
    site: 'www.unicid.edu.br',
    hours: 'Seg–Sex: 7h às 22h | Sáb: 8h às 14h',
    news: [
      { title: 'Matrícula 2026/2 aberta',         date: '2026-05-22', summary: 'Inscrições abertas para todos os cursos de graduação até 30/06.' },
      { title: 'Semana acadêmica de TI',           date: '2026-06-10', summary: 'Palestras com profissionais do mercado e workshops práticos.' },
      { title: 'Biblioteca em horário estendido',  date: '2026-06-01', summary: 'Durante o período de provas, atendimento até 23h.' },
    ],
  });

  const csmn = DB.institutions.insert({
    abbr: 'CSM',
    fullName: 'Colégio Santa Mônica',
    logo: LOGO_CSMN,
    logoColor: '#dc2626',
    bannerColor: '#7f1d1d',
    accentColor: '#fef2f2',
    address: 'R. das Acácias, 1500 — Méier, Rio de Janeiro/RJ',
    phone: '(21) 2589-3000',
    email: 'secretaria@csmonica.edu.br',
    site: 'www.csmonica.edu.br',
    hours: 'Seg–Sex: 6h45 às 18h',
    news: [
      { title: 'Reunião de pais — Ensino Médio', date: '2026-06-12', summary: 'Encontro presencial dia 12/06 às 19h no auditório principal.' },
      { title: 'Feira de Ciências 2026',          date: '2026-07-05', summary: 'Inscrições para projetos abertas até 28/06.' },
    ],
  });

  // ═══════════════════════════════════════════════
  // 2. CARTEIRINHAS (alunos, professor, funcionário)
  // ═══════════════════════════════════════════════
  const lucas = DB.students.insert({
    name: 'Lucas Serra Barreto',
    photo: PHOTO_LUCAS,
    birthDate: '15/03/2000',
    idLabel: 'RGM',
    idNumber: '04081939-6',
    rg: '62.375.594-4',
    course: 'Ciência da Computação',
    courseCode: 'CCO-EAD',
    semester: '6º semestre',
    validity: '12/2026',
    cardType: 'graduacao_ead',
    institutionId: unicid.id,
    emergencyContact: '(11) 99876-5432',
    bloodType: 'O+',
    address: 'São Paulo / SP',
  });

  const maria = DB.students.insert({
    name: 'Maria Luiza Ferreira',
    photo: PHOTO_MARIA,
    birthDate: '22/08/2001',
    idLabel: 'RGM',
    idNumber: '04092847-3',
    rg: '58.984.213-7',
    course: 'Direito',
    courseCode: 'DIR-PRES',
    semester: '4º semestre',
    validity: '12/2026',
    cardType: 'graduacao',
    institutionId: unicid.id,
    emergencyContact: '(11) 98123-7654',
    bloodType: 'A+',
    address: 'São Paulo / SP',
  });

  const pedro = DB.students.insert({
    name: 'Pedro Henrique Almeida',
    photo: PHOTO_PEDRO,
    birthDate: '04/11/1999',
    idLabel: 'RGM',
    idNumber: '04076512-1',
    rg: '47.281.964-2',
    course: 'Engenharia Civil',
    courseCode: 'ENG-CIV',
    semester: '8º semestre',
    validity: '12/2026',
    cardType: 'graduacao',
    institutionId: unicid.id,
    emergencyContact: '(11) 97456-1289',
    bloodType: 'B+',
    address: 'São Paulo / SP',
  });

  const sophia = DB.students.insert({
    name: 'Sophia Almeida Costa',
    photo: PHOTO_SOPHIA,
    birthDate: '12/04/2009',
    idLabel: 'Matrícula',
    idNumber: '2026-EM-0142',
    rg: '',
    course: '2º ano — Ensino Médio',
    courseCode: 'EM-2',
    semester: '2º ano',
    validity: '12/2026',
    cardType: 'ensinoMedio',
    institutionId: csmn.id,
    emergencyContact: '(21) 99812-3344',
    bloodType: 'AB+',
    address: 'Rio de Janeiro / RJ',
  });

  const ana = DB.students.insert({
    name: 'Profa. Ana Beatriz Mendes',
    photo: PHOTO_ANA,
    birthDate: '08/11/1982',
    idLabel: 'RE',
    idNumber: 'PRF-002841',
    rg: '36.514.872-9',
    course: 'Departamento de Computação',
    courseCode: 'DEP-COMP',
    semester: '',
    validity: '12/2027',
    cardType: 'professor',
    institutionId: unicid.id,
    emergencyContact: '(11) 91234-5678',
    bloodType: 'A+',
    address: 'São Paulo / SP',
  });

  const ricardo = DB.students.insert({
    name: 'Ricardo Pereira Souza',
    photo: PHOTO_RICARDO,
    birthDate: '17/06/1978',
    idLabel: 'Matrícula',
    idNumber: 'FUN-001520',
    rg: '21.547.896-3',
    course: 'Segurança Patrimonial',
    courseCode: 'SEG',
    semester: '',
    validity: '12/2027',
    cardType: 'funcionario',
    institutionId: unicid.id,
    emergencyContact: '(11) 96874-5512',
    bloodType: 'O−',
    address: 'São Paulo / SP',
  });

  // ═══════════════════════════════════════════════
  // 3. BOLETIM do Lucas (aluno padrão de demo)
  // ═══════════════════════════════════════════════
  const subjectsLucas = [
    { period: '2026.1', subject: 'Algoritmos e Estrutura de Dados II', av1: 8.5, av2: 9.0, av3: 7.5, attendance: 92 },
    { period: '2026.1', subject: 'Banco de Dados',                      av1: 7.8, av2: 8.2, av3: 9.0, attendance: 96 },
    { period: '2026.1', subject: 'Engenharia de Software',              av1: 9.0, av2: 8.5, av3: 9.5, attendance: 100 },
    { period: '2026.1', subject: 'Redes de Computadores',               av1: 6.5, av2: 7.0, av3: 8.0, attendance: 88 },
    { period: '2026.1', subject: 'Inteligência Artificial',             av1: 9.5, av2: 9.8, av3: 9.0, attendance: 100 },
    { period: '2026.1', subject: 'Cálculo III',                         av1: 5.5, av2: 6.0, av3: 7.5, attendance: 84 },
  ];
  subjectsLucas.forEach(s => {
    const final = ((s.av1 + s.av2 + s.av3) / 3).toFixed(1);
    const status = parseFloat(final) >= 6 && s.attendance >= 75 ? 'aprovado' : 'recuperacao';
    DB.grades.insert({ studentId: lucas.id, ...s, final: parseFloat(final), status });
  });

  // Notas básicas para Maria também (para se "professor" entrar)
  const subjectsMaria = [
    { period: '2026.1', subject: 'Direito Constitucional',  av1: 9.0, av2: 8.5, av3: 9.0, attendance: 98 },
    { period: '2026.1', subject: 'Direito Civil',            av1: 8.0, av2: 8.5, av3: 7.8, attendance: 94 },
    { period: '2026.1', subject: 'Direito Penal',            av1: 7.5, av2: 8.0, av3: 8.2, attendance: 90 },
  ];
  subjectsMaria.forEach(s => {
    const final = ((s.av1 + s.av2 + s.av3) / 3).toFixed(1);
    const status = parseFloat(final) >= 6 && s.attendance >= 75 ? 'aprovado' : 'recuperacao';
    DB.grades.insert({ studentId: maria.id, ...s, final: parseFloat(final), status });
  });

  // ═══════════════════════════════════════════════
  // 4. MATERIAIS / APOSTILAS
  // ═══════════════════════════════════════════════
  const matsUnicid = [
    { title: 'Apostila de Algoritmos — Cap. 1 a 5',  type: 'pdf',  subject: 'Algoritmos e Estrutura de Dados II', course: 'Ciência da Computação', size: '2.3 MB' },
    { title: 'Resumo de Banco de Dados (SQL)',        type: 'pdf',  subject: 'Banco de Dados',                      course: 'Ciência da Computação', size: '890 KB' },
    { title: 'Slides — Engenharia de Software',       type: 'pptx', subject: 'Engenharia de Software',              course: 'Ciência da Computação', size: '4.1 MB' },
    { title: 'Lista de Exercícios — Redes',           type: 'pdf',  subject: 'Redes de Computadores',               course: 'Ciência da Computação', size: '420 KB' },
    { title: 'Notebook Python — Introdução à IA',     type: 'ipynb',subject: 'Inteligência Artificial',             course: 'Ciência da Computação', size: '1.2 MB' },
    { title: 'Cálculo III — Resolução das listas',    type: 'pdf',  subject: 'Cálculo III',                         course: 'Ciência da Computação', size: '3.7 MB' },
    { title: 'Padrões de Projeto (GoF)',              type: 'pdf',  subject: 'Engenharia de Software',              course: 'Ciência da Computação', size: '2.0 MB' },
    { title: 'Cheat Sheet — Comandos Linux',          type: 'pdf',  subject: 'Redes de Computadores',               course: 'Ciência da Computação', size: '180 KB' },
    { title: 'Apostila — Direito Constitucional I',   type: 'pdf',  subject: 'Direito Constitucional',              course: 'Direito',                size: '5.4 MB' },
    { title: 'Slides — Direito Civil (Contratos)',    type: 'pptx', subject: 'Direito Civil',                       course: 'Direito',                size: '3.1 MB' },
  ];
  matsUnicid.forEach(m => DB.materials.insert({ institutionId: unicid.id, url: '#', ...m }));

  const matsCsmn = [
    { title: 'Matemática — Função Quadrática',  type: 'pdf', subject: 'Matemática', course: '2º ano — Ensino Médio', size: '1.1 MB' },
    { title: 'Resumo de História do Brasil',     type: 'pdf', subject: 'História',   course: '2º ano — Ensino Médio', size: '2.4 MB' },
    { title: 'Lista de Exercícios — Física',     type: 'pdf', subject: 'Física',     course: '2º ano — Ensino Médio', size: '780 KB' },
  ];
  matsCsmn.forEach(m => DB.materials.insert({ institutionId: csmn.id, url: '#', ...m }));

  // ═══════════════════════════════════════════════
  // 5. USUÁRIOS
  // ═══════════════════════════════════════════════
  await Auth.register({ login: 'aluno',     password: '1234',    role: 'aluno',     studentId: lucas.id   });
  await Auth.register({ login: 'maria',     password: '1234',    role: 'aluno',     studentId: maria.id   });
  await Auth.register({ login: 'pedro',     password: '1234',    role: 'aluno',     studentId: pedro.id   });
  await Auth.register({ login: 'sophia',    password: '1234',    role: 'aluno',     studentId: sophia.id  });
  await Auth.register({ login: 'professor', password: '1234',    role: 'professor', studentId: ana.id     });
  await Auth.register({ login: 'admin',     password: 'admin123',role: 'admin',     studentId: null       });

  // Marca como seedado
  const finalDb = DB.load();
  finalDb.meta.seeded = true;
  DB.save(finalDb);

  console.info('[AcessaRápido] Banco populado com dados de demonstração.');
}

window.seedIfEmpty = seedIfEmpty;
window.SAMPLE_LOGOS = { UNICID: LOGO_UNICID, CSMN: LOGO_CSMN };
window.SAMPLE_PHOTOS = {
  lucas: PHOTO_LUCAS, maria: PHOTO_MARIA, pedro: PHOTO_PEDRO,
  sophia: PHOTO_SOPHIA, ana: PHOTO_ANA, ricardo: PHOTO_RICARDO,
};
