/* ═══════════════════════════════════════════════════════════════
   AcessaRápido — landing.js
   Reage à sessão e oferece atalhos diretos pra carteirinha.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

(async function () {
  // Garante o seed
  await seedIfEmpty();

  const me = Auth.current();
  if (!me) return;          // visitante normal

  const target = me.role === 'admin' ? 'admin.html' : 'app.html';

  // ─── Substitui CTAs do nav ───────────────────────
  const navCta = document.getElementById('landing-nav-cta');
  if (navCta) {
    navCta.innerHTML = `
      <button class="btn btn--ghost" id="btn-landing-logout" type="button">
        <i class="fas fa-arrow-right-from-bracket"></i>
        Sair
      </button>
      <a href="${target}" class="btn btn--primary">
        <i class="fas fa-id-card"></i>
        Minha carteirinha
      </a>
    `;
    document.getElementById('btn-landing-logout').addEventListener('click', () => {
      if (!confirm('Sair da conta de "' + me.login + '"?')) return;
      Auth.logout();
      window.location.reload();
    });
  }

  // ─── Substitui CTA do hero ───────────────────────
  const heroCta = document.getElementById('hero-cta');
  if (heroCta) {
    heroCta.innerHTML = `
      <a href="${target}" class="btn btn--primary btn--lg">
        <i class="fas fa-id-card"></i>
        Abrir minha carteirinha
      </a>
      <a href="#features" class="btn btn--secondary btn--lg">
        <i class="fas fa-circle-play"></i>
        Ver recursos
      </a>
    `;
  }

  // ─── Banner discreto avisando que está logado ────
  const hero = document.querySelector('.hero__inner');
  if (hero) {
    const banner = document.createElement('div');
    banner.className = 'hero__session-banner';
    banner.innerHTML = `
      <i class="fas fa-circle-check"></i>
      <span>Conectado como <strong>${escapeHtml(me.login)}</strong></span>
    `;
    hero.insertBefore(banner, hero.firstChild);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;',
    }[c]));
  }
})();
