/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — seed.js
   Popula o banco com dados de demonstração
   ═══════════════════════════════════════════════════════════════ */

'use strict';

async function seedIfEmpty() {
  const db = DB.load();
  if (db.meta.seeded) return;

  // ─── Instituição padrão ──────────────────────────────
  const inst = DB.institutions.insert({
    abbr: 'UNICID',
    fullName: 'Universidade Cidade de São Paulo',
    logoColor: '#10b981',
    bannerColor: '#0b1f3f',
    accentColor: '#dbeafe',
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

  // ─── Estudante de demonstração ────────────────────────
  const student = DB.students.insert({
    name: 'Lucas Serra Barreto',
    photo: null,
    birthDate: '15/03/2000',
    idLabel: 'RGM',
    idNumber: '04081939-6',
    rg: '62.375.594-4',
    course: 'Ciência da Computação',
    courseCode: 'CCO-EAD',
    semester: '6º semestre',
    validity: '12/2026',
    cardType: 'graduacao_ead',
    institutionId: inst.id,
    emergencyContact: '(11) 99876-5432',
    bloodType: 'O+',
    address: 'São Paulo / SP',
  });

  // ─── Professor demo ───────────────────────────────────
  const teacher = DB.students.insert({
    name: 'Profa. Ana Beatriz Mendes',
    photo: null,
    birthDate: '08/11/1982',
    idLabel: 'RE',
    idNumber: 'PRF-002841',
    rg: '',
    course: 'Departamento de Computação',
    courseCode: 'DEP-COMP',
    semester: '',
    validity: '12/2027',
    cardType: 'professor',
    institutionId: inst.id,
    emergencyContact: '(11) 91234-5678',
    bloodType: 'A+',
    address: 'São Paulo / SP',
  });

  // ─── Notas / Boletim do aluno ─────────────────────────
  const subjects = [
    { period: '2026.1', subject: 'Algoritmos e Estrutura de Dados II', av1: 8.5, av2: 9.0, av3: 7.5, attendance: 92 },
    { period: '2026.1', subject: 'Banco de Dados',                      av1: 7.8, av2: 8.2, av3: 9.0, attendance: 96 },
    { period: '2026.1', subject: 'Engenharia de Software',              av1: 9.0, av2: 8.5, av3: 9.5, attendance: 100 },
    { period: '2026.1', subject: 'Redes de Computadores',               av1: 6.5, av2: 7.0, av3: 8.0, attendance: 88 },
    { period: '2026.1', subject: 'Inteligência Artificial',             av1: 9.5, av2: 9.8, av3: 9.0, attendance: 100 },
    { period: '2026.1', subject: 'Cálculo III',                         av1: 5.5, av2: 6.0, av3: 7.5, attendance: 84 },
  ];

  subjects.forEach(s => {
    const final = ((s.av1 + s.av2 + s.av3) / 3).toFixed(1);
    const status = parseFloat(final) >= 6 && s.attendance >= 75 ? 'aprovado' : 'recuperacao';
    DB.grades.insert({ studentId: student.id, ...s, final: parseFloat(final), status });
  });

  // ─── Materiais (apostilas) ────────────────────────────
  const mats = [
    { title: 'Apostila de Algoritmos — Cap. 1 a 5', type: 'pdf', subject: 'Algoritmos e Estrutura de Dados II', course: 'Ciência da Computação', size: '2.3 MB' },
    { title: 'Resumo de Banco de Dados (SQL)',       type: 'pdf', subject: 'Banco de Dados',                      course: 'Ciência da Computação', size: '890 KB' },
    { title: 'Slides — Engenharia de Software',      type: 'pptx',subject: 'Engenharia de Software',              course: 'Ciência da Computação', size: '4.1 MB' },
    { title: 'Lista de Exercícios — Redes',          type: 'pdf', subject: 'Redes de Computadores',               course: 'Ciência da Computação', size: '420 KB' },
    { title: 'Notebook Python — Introdução à IA',    type: 'ipynb', subject: 'Inteligência Artificial',           course: 'Ciência da Computação', size: '1.2 MB' },
    { title: 'Cálculo III — Resolução das listas',   type: 'pdf', subject: 'Cálculo III',                         course: 'Ciência da Computação', size: '3.7 MB' },
    { title: 'Material complementar — Padrões de Projeto', type: 'pdf', subject: 'Engenharia de Software',        course: 'Ciência da Computação', size: '2.0 MB' },
    { title: 'Cheat Sheet — Comandos Linux',         type: 'pdf', subject: 'Redes de Computadores',               course: 'Ciência da Computação', size: '180 KB' },
  ];
  mats.forEach(m => DB.materials.insert({ institutionId: inst.id, url: '#', ...m }));

  // ─── Usuários ─────────────────────────────────────────
  await Auth.register({ login: 'aluno',     password: '1234',    role: 'aluno',     studentId: student.id });
  await Auth.register({ login: 'professor', password: '1234',    role: 'professor', studentId: teacher.id });
  await Auth.register({ login: 'admin',     password: 'admin123',role: 'admin',     studentId: null        });

  // Marca como seedado
  const finalDb = DB.load();
  finalDb.meta.seeded = true;
  DB.save(finalDb);

  console.info('[AcessaRápido] Banco populado com dados de demonstração.');
}

window.seedIfEmpty = seedIfEmpty;
