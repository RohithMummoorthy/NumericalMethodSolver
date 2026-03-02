/**
 * background.js — Animated canvas background with floating math symbols
 * and the intro overlay animation.
 */

"use strict";

/* ══════════════════════════════════════════════════════════════════════════
   FLOATING MATH SYMBOLS — Background Canvas
   ══════════════════════════════════════════════════════════════════════════ */

(function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const SYMBOLS = [
    "π", "∫", "Σ", "∂", "∇", "∞", "≈", "dx", "dy", "∈",
    "√", "Δ", "λ", "θ", "α", "β", "μ", "ω", "φ", "ψ",
    "f(x)", "x²", "∮", "⊕", "∏", "↗", "∀", "∃", "lim",
    "d/dx", "RK4", "h→0", "ε", "δ", "∝",
  ];

  const PARTICLE_COUNT = 55;
  let particles = [];

  class MathParticle {
    constructor(forceSpawn = false) {
      this.reset(forceSpawn);
    }

    reset(forceSpawn = false) {
      this.x     = Math.random() * canvas.width;
      this.y     = forceSpawn
        ? Math.random() * canvas.height
        : canvas.height + 20;
      this.symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      this.size   = 10 + Math.random() * 16;
      this.opacity = 0.04 + Math.random() * 0.10;
      this.speed  = 0.12 + Math.random() * 0.22;
      this.drift  = (Math.random() - 0.5) * 0.15;
      this.rotation     = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.003;
      this.family       = Math.random() > 0.5
        ? '"JetBrains Mono", monospace'
        : '"Syne", sans-serif';
    }

    update() {
      this.y        -= this.speed;
      this.x        += this.drift;
      this.rotation += this.rotationSpeed;

      // Fade in near bottom, fade out near top
      const relY = this.y / canvas.height;
      if (relY > 0.85) {
        this.opacity = Math.min(this.opacity, (1 - relY) / 0.15 * 0.12);
      } else if (relY < 0.15) {
        this.opacity = Math.max(0, this.opacity * 0.98);
      }

      if (this.y < -30) this.reset(false);
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle   = "#ffffff";
      ctx.font        = `${this.size}px ${this.family}`;
      ctx.textAlign   = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.symbol, 0, 0);
      ctx.restore();
    }
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    particles = Array.from(
      { length: PARTICLE_COUNT },
      () => new MathParticle(true)
    );
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(ctx); });
    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize);
  init();
  render();
})();

/* ══════════════════════════════════════════════════════════════════════════
   INTRO OVERLAY — Symbols + loader + fade-out
   ══════════════════════════════════════════════════════════════════════════ */

(function initIntro() {
  const overlay = document.getElementById("intro-overlay");
  const canvas  = document.getElementById("intro-canvas");
  const app     = document.getElementById("app");
  if (!overlay || !canvas || !app) return;

  const ctx = canvas.getContext("2d");

  // Mini particle system for intro canvas
  const INTRO_SYMBOLS = ["π", "∫", "Σ", "∂", "∇", "∞", "dx", "RK4", "f(x)", "√"];
  let introParticles = [];

  class IntroParticle {
    constructor() {
      this.reset();
      this.y = Math.random() * canvas.height;
    }
    reset() {
      this.x      = Math.random() * canvas.width;
      this.y      = canvas.height + 10;
      this.sym    = INTRO_SYMBOLS[Math.floor(Math.random() * INTRO_SYMBOLS.length)];
      this.size   = 12 + Math.random() * 20;
      this.op     = 0.05 + Math.random() * 0.12;
      this.vy     = 0.3 + Math.random() * 0.5;
      this.vx     = (Math.random() - 0.5) * 0.2;
    }
    update() {
      this.y -= this.vy;
      this.x += this.vx;
      if (this.y < -20) this.reset();
    }
    draw(c) {
      c.save();
      c.globalAlpha = this.op;
      c.fillStyle = "#ffffff";
      c.font = `${this.size}px "JetBrains Mono", monospace`;
      c.textAlign = "center";
      c.fillText(this.sym, this.x, this.y);
      c.restore();
    }
  }

  function resizeIntro() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  let introRAF;

  function renderIntro() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    introParticles.forEach(p => { p.update(); p.draw(ctx); });
    introRAF = requestAnimationFrame(renderIntro);
  }

  function startIntro() {
    resizeIntro();
    introParticles = Array.from({ length: 30 }, () => new IntroParticle());
    renderIntro();
  }

  function endIntro() {
    // Stop the intro animation loop
    cancelAnimationFrame(introRAF);

    // Fade out overlay
    overlay.classList.add("fade-out");

    // Reveal the app
    app.classList.remove("app-hidden");
    app.classList.add("app-visible");

    // Remove overlay from DOM after transition
    overlay.addEventListener("transitionend", () => {
      overlay.style.display = "none";
    }, { once: true });
  }

  window.addEventListener("resize", resizeIntro);
  startIntro();

  // The intro lasts ~2.8s (CSS loader animation: 2.2s + 0.6s delay)
  setTimeout(endIntro, 3000);
})();
