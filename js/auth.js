/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — auth.js
   Autenticação (SHA-256 + salt via Web Crypto API)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Hash / salt ─────────────────────────────────────────────────
async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt(len = 16) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  return await sha256(salt + ':' + password + ':ar2026');
}

// ── Auth API ────────────────────────────────────────────────────
const Auth = {
  async register({ login, password, role = 'aluno', studentId = null }) {
    if (!login || !password) throw new Error('Login e senha são obrigatórios.');
    if (password.length < 4) throw new Error('Senha deve ter pelo menos 4 caracteres.');

    const existing = DB.users.findByLogin(login);
    if (existing) throw new Error('Já existe um usuário com esse login.');

    const salt = randomSalt();
    const passHash = await hashPassword(password, salt);

    return DB.users.insert({ login, salt, passHash, role, studentId });
  },

  async login(loginInput, password) {
    const user = DB.users.findByLogin(loginInput);
    if (!user) throw new Error('Usuário ou senha inválidos.');

    const expected = await hashPassword(password, user.salt);
    if (expected !== user.passHash) throw new Error('Usuário ou senha inválidos.');

    DB.session.set(user.id);
    return user;
  },

  logout() {
    DB.session.clear();
  },

  /** Retorna o user atual ou null */
  current() {
    const sess = DB.session.get();
    if (!sess.current) return null;
    if (sess.expiresAt && Date.now() > sess.expiresAt) {
      DB.session.clear();
      return null;
    }
    return DB.users.findById(sess.current);
  },

  /** Garante usuário logado, redireciona para login se não */
  requireAuth(redirect = 'login.html') {
    const u = this.current();
    if (!u) {
      window.location.href = redirect;
      return null;
    }
    return u;
  },

  /** Garante usuário com determinado papel */
  requireRole(role, redirect = 'app.html') {
    const u = this.requireAuth();
    if (!u) return null;
    if (u.role !== role) {
      window.location.href = redirect;
      return null;
    }
    return u;
  },

  async changePassword(userId, newPassword) {
    if (newPassword.length < 4) throw new Error('Senha muito curta.');
    const salt = randomSalt();
    const passHash = await hashPassword(newPassword, salt);
    return DB.users.update(userId, { salt, passHash });
  },
};

window.Auth = Auth;
