/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — db.js
   Camada de banco de dados (localStorage estruturado)
   acessarapido.com.br
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const DB_KEY = 'ar_db_v1';

/**
 * Estrutura do banco:
 * {
 *   meta:       { version, seeded, lastUserId, lastStudentId, ... },
 *   users:      [{ id, login, passHash, salt, role, studentId, createdAt }]
 *   students:   [{ id, name, photo, birthDate, idLabel, idNumber, rg,
 *                  course, courseCode, semester, validity, cardType,
 *                  institutionId, emergencyContact, bloodType, address }]
 *   institutions: [{ id, abbr, fullName, logoColor, bannerColor, accentColor,
 *                    address, phone, email, site, hours, news[] }]
 *   grades:     [{ id, studentId, period, subject, av1, av2, av3, final, status, attendance }]
 *   materials:  [{ id, institutionId, course, title, type, subject, size, url, uploadedAt }]
 *   sessions:   { current: userId | null, expiresAt }
 * }
 */

// ── Acesso bruto ────────────────────────────────────────────────
function _read() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function _write(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ── DB API ──────────────────────────────────────────────────────
const DB = {
  /** Retorna o banco completo (lendo do storage cada vez) */
  load() {
    return _read() || this.empty();
  },

  /** Persiste o estado completo */
  save(db) {
    _write(db);
  },

  /** Estrutura vazia inicial */
  empty() {
    return {
      meta: {
        version: 1,
        seeded: false,
        lastUserId: 0,
        lastStudentId: 0,
        lastInstitutionId: 0,
        lastGradeId: 0,
        lastMaterialId: 0,
      },
      users: [],
      students: [],
      institutions: [],
      grades: [],
      materials: [],
      sessions: { current: null, expiresAt: 0 },
    };
  },

  /** Reseta tudo */
  reset() {
    localStorage.removeItem(DB_KEY);
  },

  /** Próximo ID para uma tabela */
  nextId(table) {
    const db = this.load();
    const key = 'last' + table.charAt(0).toUpperCase() + table.slice(1, -1) + 'Id';
    db.meta[key] = (db.meta[key] || 0) + 1;
    this.save(db);
    return db.meta[key];
  },

  // ─── USERS ────────────────────────────────────────────
  users: {
    all() { return DB.load().users; },

    findById(id) {
      return DB.load().users.find(u => u.id === id) || null;
    },

    findByLogin(login) {
      return DB.load().users.find(u => u.login.toLowerCase() === login.toLowerCase()) || null;
    },

    insert(user) {
      const db = DB.load();
      const id = ++db.meta.lastUserId;
      const newUser = { id, createdAt: Date.now(), ...user };
      db.users.push(newUser);
      DB.save(db);
      return newUser;
    },

    update(id, patch) {
      const db = DB.load();
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      db.users[idx] = { ...db.users[idx], ...patch };
      DB.save(db);
      return db.users[idx];
    },

    remove(id) {
      const db = DB.load();
      db.users = db.users.filter(u => u.id !== id);
      DB.save(db);
    },
  },

  // ─── STUDENTS ─────────────────────────────────────────
  students: {
    all() { return DB.load().students; },

    findById(id) {
      return DB.load().students.find(s => s.id === id) || null;
    },

    insert(student) {
      const db = DB.load();
      const id = ++db.meta.lastStudentId;
      const newStudent = { id, ...student };
      db.students.push(newStudent);
      DB.save(db);
      return newStudent;
    },

    update(id, patch) {
      const db = DB.load();
      const idx = db.students.findIndex(s => s.id === id);
      if (idx === -1) return null;
      db.students[idx] = { ...db.students[idx], ...patch };
      DB.save(db);
      return db.students[idx];
    },

    remove(id) {
      const db = DB.load();
      db.students = db.students.filter(s => s.id !== id);
      DB.save(db);
    },
  },

  // ─── INSTITUTIONS ─────────────────────────────────────
  institutions: {
    all() { return DB.load().institutions; },

    findById(id) {
      return DB.load().institutions.find(i => i.id === id) || null;
    },

    insert(inst) {
      const db = DB.load();
      const id = ++db.meta.lastInstitutionId;
      const newInst = { id, ...inst };
      db.institutions.push(newInst);
      DB.save(db);
      return newInst;
    },

    update(id, patch) {
      const db = DB.load();
      const idx = db.institutions.findIndex(i => i.id === id);
      if (idx === -1) return null;
      db.institutions[idx] = { ...db.institutions[idx], ...patch };
      DB.save(db);
      return db.institutions[idx];
    },
  },

  // ─── GRADES (boletim) ─────────────────────────────────
  grades: {
    all() { return DB.load().grades; },

    byStudent(studentId) {
      return DB.load().grades.filter(g => g.studentId === studentId);
    },

    insert(grade) {
      const db = DB.load();
      const id = ++db.meta.lastGradeId;
      const newGrade = { id, ...grade };
      db.grades.push(newGrade);
      DB.save(db);
      return newGrade;
    },
  },

  // ─── MATERIALS (apostilas) ────────────────────────────
  materials: {
    all() { return DB.load().materials; },

    byCourse(course) {
      return DB.load().materials.filter(
        m => !course || (m.course || '').toLowerCase() === course.toLowerCase()
      );
    },

    byInstitution(instId) {
      return DB.load().materials.filter(m => m.institutionId === instId);
    },

    insert(mat) {
      const db = DB.load();
      const id = ++db.meta.lastMaterialId;
      const newMat = { id, uploadedAt: Date.now(), ...mat };
      db.materials.push(newMat);
      DB.save(db);
      return newMat;
    },
  },

  // ─── SESSION ──────────────────────────────────────────
  session: {
    get() {
      return DB.load().sessions;
    },
    set(userId, ttlMs = 1000 * 60 * 60 * 24) {
      const db = DB.load();
      db.sessions = { current: userId, expiresAt: Date.now() + ttlMs };
      DB.save(db);
    },
    clear() {
      const db = DB.load();
      db.sessions = { current: null, expiresAt: 0 };
      DB.save(db);
    },
  },
};

// Exporta no escopo global do browser
window.DB = DB;
