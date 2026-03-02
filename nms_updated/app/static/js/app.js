/**
 * app.js — Main Application Controller
 *
 * Manages:
 *   - Tab navigation (Newton | Lagrange | RK4)
 *   - Keyboard shortcuts
 *   - Global error handling
 *   - ResizeObserver for canvas redraws
 */

"use strict";

(function AppController() {

  /* ── Tab Switching ───────────────────────────────────────────────────── */

  const tabBtns  = document.querySelectorAll(".tab-btn");
  const panels   = document.querySelectorAll(".method-panel");

  function switchTab(targetMethod) {
    // Update buttons
    tabBtns.forEach(btn => {
      const isActive = btn.dataset.method === targetMethod;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });

    // Update panels
    panels.forEach(panel => {
      const isActive = panel.id === `panel-${targetMethod}`;
      panel.classList.toggle("active", isActive);
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.method));
  });

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────
  // Alt+1 → Newton | Alt+2 → Lagrange | Alt+3 → RK4

  document.addEventListener("keydown", e => {
    if (!e.altKey) return;
    switch (e.key) {
      case "1": switchTab("newton");  e.preventDefault(); break;
      case "2": switchTab("lagrange"); e.preventDefault(); break;
      case "3": switchTab("rk4");     e.preventDefault(); break;
    }
  });

  /* ── Global unhandled rejection handler ─────────────────────────────── */

  window.addEventListener("unhandledrejection", e => {
    console.error("Unhandled rejection:", e.reason);
    if (window.NMS) {
      window.NMS.toast("An unexpected error occurred. Check console.", "error");
    }
  });

  /* ── Resize — nudge graph renderers to redraw ────────────────────────── */

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // ResizeObserver inside GraphRenderer handles individual canvases.
      // This is a fallback for edge cases.
      document.querySelectorAll(".result-graph").forEach(c => {
        // Dispatch a synthetic resize to trigger observer callbacks
        window.dispatchEvent(new Event("resize-graphs"));
      });
    }, 150);
  });

  /* ── Initial tab state ────────────────────────────────────────────────── */

  // Ensure Newton panel is visible on load (may be hidden during intro)
  switchTab("newton");

})();
