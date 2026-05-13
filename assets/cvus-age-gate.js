/**
 * CloudVaultUS — Age Gate Controller (Yes / No)
 *
 * Logic:
 *  - Shows a 21+ Yes/No modal on first visit.
 *  - "Yes"  → records verification (localStorage, 30 days if "remember" is checked,
 *             otherwise session-only) and closes the gate.
 *  - "No"   → redirects to a neutral safe page. Underage users do not see the site.
 *  - Locks body scroll while gate is open and traps keyboard focus inside it.
 *  - Pressing Escape does NOT close the gate (compliance: must explicitly verify).
 */

(function () {
  'use strict';

  const STORAGE_KEY     = 'cvus_age_verified';
  const REMEMBER_DAYS   = 30;
  const SESSION_MINUTES = 30;
  const EXIT_URL        = 'https://www.google.com';

  const gate     = document.getElementById('cvus-age-gate');
  const yesBtn   = document.getElementById('cvus-ag-yes');
  const noBtn    = document.getElementById('cvus-ag-no');
  const remember = document.getElementById('cvus-ag-remember');

  if (!gate || !yesBtn || !noBtn) return;

  function isVerified() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return data && data.expires && Date.now() < data.expires;
    } catch {
      return false;
    }
  }

  function storeVerification(longTerm) {
    const ms = longTerm
      ? REMEMBER_DAYS * 24 * 60 * 60 * 1000
      : SESSION_MINUTES * 60 * 1000;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ verified: true, expires: Date.now() + ms })
      );
    } catch {
      /* private mode — proceed anyway */
    }
  }

  function openGate() {
    gate.setAttribute('aria-hidden', 'false');
    gate.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    setTimeout(() => yesBtn.focus(), 100);
    trapFocus(gate);
  }

  function closeGate() {
    gate.classList.remove('is-visible');
    gate.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    removeFocusTrap();
  }

  let _focusHandler = null;

  function trapFocus(container) {
    const focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    _focusHandler = function (e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', _focusHandler);
  }

  function removeFocusTrap() {
    if (_focusHandler) {
      document.removeEventListener('keydown', _focusHandler);
      _focusHandler = null;
    }
  }

  yesBtn.addEventListener('click', function () {
    storeVerification(remember && remember.checked);
    closeGate();
  });

  noBtn.addEventListener('click', function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    window.location.replace(EXIT_URL);
  });

  function init() {
    if (isVerified()) {
      gate.remove();
      return;
    }
    requestAnimationFrame(() => setTimeout(openGate, 100));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
