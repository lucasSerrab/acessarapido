/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — login-page.js
   Lógica da tela de login
   ═══════════════════════════════════════════════════════════════ */

'use strict';

(async function () {
  // Garante que o banco está populado
  await seedIfEmpty();

  // Se já logado: pergunta se quer continuar ou trocar de conta
  const current = Auth.current();
  if (current) {
    showAlreadyLoggedIn(current);
    return;
  }

  bindLoginForm();

  /** Mostra tela "já está logado como X" com botões "Continuar" e "Sair" */
  function showAlreadyLoggedIn(user) {
    const wrap = document.getElementById('login-form');
    if (!wrap) return;
    const target = user.role === 'admin' ? 'admin.html' : 'app.html';
    wrap.innerHTML = `
      <h1>Você já está logado</h1>
      <p class="login-form__lead">Conectado como <strong>${user.login}</strong> (${user.role}).</p>

      <a class="btn btn--primary btn--block btn--lg" href="${target}" style="margin-top: 18px;">
        <i class="fas fa-arrow-right-to-bracket"></i>
        Continuar como ${user.login}
      </a>

      <button type="button" class="btn btn--secondary btn--block btn--lg" id="btn-switch" style="margin-top: 10px;">
        <i class="fas fa-right-left"></i>
        Sair e trocar de conta
      </button>

      <a href="index.html" class="login-form__back">
        <i class="fas fa-arrow-left"></i>
        Voltar à página inicial
      </a>
    `;
    document.getElementById('btn-switch').addEventListener('click', () => {
      Auth.logout();
      // recarrega para mostrar o form normal
      window.location.reload();
    });
  }

  function bindLoginForm() {
    const form     = document.getElementById('login-form');
    const loginIn  = document.getElementById('login-input');
    const passIn   = document.getElementById('password-input');
    const errorBox = document.getElementById('login-error');
    const errorMsg = document.getElementById('login-error-msg');
    const btn      = document.getElementById('btn-submit');
    if (!form) return;

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
  }

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
