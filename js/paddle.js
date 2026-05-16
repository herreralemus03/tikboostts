// ============================================================
// TikBoosTTS — Paddle Billing checkout integration
// Docs: https://developer.paddle.com/paddle-js/overview
// ============================================================

(function () {
  // ── Config (from js/config.js) ────────────────────────────────────────────
  const cfg = window.TIKBOOSTTS_CONFIG?.paddle ?? {};

  const CLIENT_TOKEN  = cfg.clientToken  ?? '';   // test_XXXX (sandbox) or live_XXXX
  const SANDBOX       = cfg.sandbox       ?? true;
  const PRICE_PRO     = cfg.proPriceId   ?? 'pri_01krqmbpvpmdh00bk32vfbvhet';
  const PRICE_ELITE   = cfg.elitePriceId ?? 'pri_01krqn157drvgp0bm91ydswtyk';

  // ── Init ──────────────────────────────────────────────────────────────────
  function initPaddle() {
    if (typeof Paddle === 'undefined') {
      console.warn('[Paddle] Paddle.js not loaded yet');
      return;
    }

    if (SANDBOX) Paddle.Environment.set('sandbox');

    Paddle.Initialize({
      token: CLIENT_TOKEN,
      eventCallback: function (ev) {
        if (ev.name === 'checkout.completed') {
          const email = ev.data?.customer?.email ?? '';
          showSuccess(email);
          resetButtons();
        }
        if (ev.name === 'checkout.closed') {
          resetButtons();
        }
        if (ev.name === 'checkout.error') {
          resetButtons();
          console.error('[Paddle] Checkout error:', ev.data);
        }
      },
    });
  }

  // ── Checkout ──────────────────────────────────────────────────────────────
  function openCheckout(priceId, btnEl) {
    if (typeof Paddle === 'undefined' || !CLIENT_TOKEN) {
      alert('El sistema de pago no esta listo. Recarga la pagina e intentalo de nuevo.');
      return;
    }

    setLoading(btnEl, true);

    Paddle.Checkout.open({
      items: [{ priceId: priceId, quantity: 1 }],
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'es',
        allowLogout: false,
      },
    });
  }

  // ── Button states ──────────────────────────────────────────────────────────
  function setLoading(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  }

  function resetButtons() {
    document.querySelectorAll('.plan-btn').forEach(b => {
      b.disabled = false;
      b.classList.remove('loading');
    });
  }

  // ── Success toast ─────────────────────────────────────────────────────────
  function showSuccess(email) {
    const toast = document.getElementById('paddle-success-toast');
    if (!toast) return;

    const emailEl = toast.querySelector('.success-email');
    if (emailEl && email) emailEl.textContent = email;

    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 9000);
  }

  // ── Wire buttons ──────────────────────────────────────────────────────────
  function wireButtons() {
    const btnPro   = document.getElementById('btn-checkout-pro');
    const btnElite = document.getElementById('btn-checkout-elite');

    if (btnPro) {
      btnPro.addEventListener('click', () => openCheckout(PRICE_PRO, btnPro));
    }
    if (btnElite) {
      btnElite.addEventListener('click', () => openCheckout(PRICE_ELITE, btnElite));
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    wireButtons();

    // Paddle.js loads async — wait for it
    if (typeof Paddle !== 'undefined') {
      initPaddle();
    } else {
      const script = document.querySelector('script[src*="paddle.js"]');
      if (script) {
        script.addEventListener('load', initPaddle);
      } else {
        // Retry in case script tag is added later
        const t = setInterval(() => {
          if (typeof Paddle !== 'undefined') { clearInterval(t); initPaddle(); }
        }, 200);
        setTimeout(() => clearInterval(t), 8000);
      }
    }
  });
})();
