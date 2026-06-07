/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — login-page.js
   Lógica da tela de login
   ═══════════════════════════════════════════════════════════════ */

'use strict';

(async function () {
  // Garante que o banco está populado
  await seedIfEmpty();

  // Se já logado, redireciona
  const current = Auth.current();
  if (current) {
    redirectByRole(current.role);
    return;
  }

  const form     = document.getElementById('login-form');
  const loginIn  = document.getElementById('login-input');
  const passIn   = document.getElementById('password-input');
  const errorBox = document.getElementById('login-error');
  const errorMsg = document.getElementById('login-error-msg');
  const btn      = document.getElementById('btn-submit');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorBox.classList.add('visible');
  }
  function clearError() {
    errorBox.classList.remove('visible');
  }

  loginIn.addEventListener('input', clearError);
  passIn.addEventListener('input', clearError);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const login = loginIn.value.trim();
    const pass  = passIn.value;

    if (!login || !pass) {
      showError('Preencha login e senha.');
      return;
    }

    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando…';

    try {
      const user = await Auth.login(login, pass);
      toast('Bem-vindo, ' + user.login + '!', 'success');
      setTimeout(() => redirectByRole(user.role), 400);
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  });

  function redirectByRole(role) {
    if (role === 'admin') window.location.href = 'admin.html';
    else                  window.location.href = 'app.html';
  }

  function toast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast toast--' + type + ' visible';
    setTimeout(() => t.classList.remove('visible'), 2500);
  }
})();
