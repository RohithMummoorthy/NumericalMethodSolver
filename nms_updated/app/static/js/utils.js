/**
 * utils.js — Shared utilities for the Numerical Methods Solver
 * API helpers, DOM helpers, toast notifications, PDF export.
 */

"use strict";

/* ══════════════════════════════════════════════════════════════════════════
   API
   ══════════════════════════════════════════════════════════════════════════ */

const API_BASE = "/api";

/**
 * POST to an API endpoint with JSON body.
 * @param {string} endpoint - e.g. "/newton-raphson"
 * @param {object} payload
 * @returns {Promise<object>} parsed JSON
 */
async function apiPost(endpoint, payload) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || `HTTP ${response.status}`);
  }
  return json;
}

/* ══════════════════════════════════════════════════════════════════════════
   DOM Helpers
   ══════════════════════════════════════════════════════════════════════════ */

/** Shorthand querySelector */
const $ = (sel, ctx = document) => ctx.querySelector(sel);

/** Shorthand querySelectorAll */
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/** Show an element (remove hidden class) */
function showEl(el) {
  if (typeof el === "string") el = $(el);
  if (el) el.classList.remove("hidden");
}

/** Hide an element (add hidden class) */
function hideEl(el) {
  if (typeof el === "string") el = $(el);
  if (el) el.classList.add("hidden");
}

/** Toggle hidden state */
function toggleEl(el, show) {
  if (typeof el === "string") el = $(el);
  if (!el) return;
  el.classList.toggle("hidden", !show);
}

/** Format a number for display */
function fmt(num, decimals = 8) {
  if (num === null || num === undefined) return "—";
  if (!isFinite(num)) return String(num);
  const n = Number(num);
  if (Math.abs(n) > 1e6 || (Math.abs(n) < 1e-4 && n !== 0)) {
    return n.toExponential(4);
  }
  return n.toFixed(decimals).replace(/\.?0+$/, "") || "0";
}

/** Format scientific notation */
function fmtSci(num, decimals = 4) {
  if (num === null || num === undefined) return "—";
  return Number(num).toExponential(decimals);
}

/* ══════════════════════════════════════════════════════════════════════════
   Toast Notifications
   ══════════════════════════════════════════════════════════════════════════ */

const toastContainer = document.getElementById("toast-container");

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration ms before auto-dismiss
 */
function toast(message, type = "info", duration = 4000) {
  const ICONS = { success: "✓", error: "✕", info: "ℹ" };

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
    <span>${message}</span>
  `;

  toastContainer.appendChild(el);

  // Auto-dismiss
  const dismissTimer = setTimeout(() => dismissToast(el), duration);

  el.addEventListener("click", () => {
    clearTimeout(dismissTimer);
    dismissToast(el);
  });
}

function dismissToast(el) {
  el.classList.add("removing");
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   Status Dot
   ══════════════════════════════════════════════════════════════════════════ */

const statusDot = document.getElementById("status-dot");

function setStatus(state) {
  if (!statusDot) return;
  statusDot.className = `status-dot ${state}`;
  statusDot.title = {
    idle: "System idle",
    running: "Computing…",
    success: "Computation complete",
    error: "Error",
  }[state] || "";
}

/* ══════════════════════════════════════════════════════════════════════════
   Button loading state
   ══════════════════════════════════════════════════════════════════════════ */

function setBtnLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
  const text = btn.querySelector(".btn-text");
  if (text) text.textContent = loading ? "Computing…" : btn.dataset.defaultText || "Solve";
}

function initBtn(btn) {
  if (!btn) return;
  const text = btn.querySelector(".btn-text");
  if (text) btn.dataset.defaultText = text.textContent;

  // Ripple effect on click
  btn.addEventListener("click", function (e) {
    const ripple = this.querySelector(".btn-ripple");
    if (!ripple) return;
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left - 30;
    const y = e.clientY - rect.top - 30;
    ripple.style.cssText = `left:${x}px;top:${y}px;`;
    // Clone to re-trigger animation
    const clone = ripple.cloneNode();
    this.appendChild(clone);
    clone.addEventListener("animationend", () => clone.remove(), { once: true });
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   Stat Grid Builder
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Populate a stat-grid element with stat items.
 * @param {string|HTMLElement} container - selector or element
 * @param {Array<{label: string, value: string, cls?: string}>} stats
 */
function buildStatGrid(container, stats) {
  if (typeof container === "string") container = $(container);
  if (!container) return;
  container.innerHTML = stats.map(s => `
    <div class="stat-item">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value ${s.cls || ""}">${s.value}</div>
    </div>
  `).join("");
}

/* ══════════════════════════════════════════════════════════════════════════
   Table Builder
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Populate a table body with rows, with staggered animation.
 * @param {string|HTMLElement} tbody - selector or element
 * @param {string[][]} rows - array of cell-value arrays
 * @param {number[]} [highlightRows] - row indices to highlight
 */
function buildTableBody(tbody, rows, highlightRows = []) {
  if (typeof tbody === "string") tbody = $(tbody);
  if (!tbody) return;

  const fragment = document.createDocumentFragment();

  rows.forEach((cells, i) => {
    const tr = document.createElement("tr");
    if (highlightRows.includes(i)) tr.classList.add("highlight-row");

    tr.style.animationDelay = `${Math.min(i * 30, 800)}ms`;

    cells.forEach((cell, j) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });

    fragment.appendChild(tr);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

/* ══════════════════════════════════════════════════════════════════════════
   PDF Export
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Export a PDF report by calling the backend, then trigger download.
 * @param {string} method - "newton_raphson" | "lagrange" | "runge_kutta"
 * @param {object} data   - result data from solver
 * @param {string|null} graphB64 - base64 graph image (optional)
 */
async function exportPDF(method, data, graphB64 = null) {
  try {
    setStatus("running");
    toast("Generating PDF report…", "info", 2000);

    const result = await apiPost("/export-pdf", {
      method,
      data,
      graph_image: graphB64,
    });

    // Decode base64 PDF and download
    const pdfBytes = atob(result.pdf);
    const arr = new Uint8Array(pdfBytes.length);
    for (let i = 0; i < pdfBytes.length; i++) arr[i] = pdfBytes.charCodeAt(i);

    const blob = new Blob([arr], { type: "application/pdf" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const methodName = method.replace(/_/g, "-");
    link.download = `numerical-solver-${methodName}-${Date.now()}.pdf`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    setStatus("success");
    toast("PDF downloaded successfully!", "success");

  } catch (err) {
    setStatus("error");
    toast(`PDF export failed: ${err.message}`, "error");
    console.error("PDF export error:", err);
  }
}

/**
 * Export graph canvas as PNG download.
 * @param {HTMLCanvasElement} canvas
 * @param {string} filename
 */
function exportGraphPNG(canvas, filename = "graph.png") {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
  toast("Graph exported as PNG!", "success", 2500);
}

/**
 * Get base64 image from a canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {string} base64 data URL
 */
function canvasToBase64(canvas) {
  return canvas ? canvas.toDataURL("image/png") : null;
}

/* ══════════════════════════════════════════════════════════════════════════
   Convergence Ring (Newton-Raphson specific)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Animate a convergence arc on a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {number} progress - 0 to 1
 * @param {boolean} converged
 */
function drawConvergenceRing(canvas, progress, converged) {
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r  = 45;
  const lw = 5;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = lw;
  ctx.stroke();

  if (progress <= 0) return;

  // Progress arc
  const end = -Math.PI / 2 + Math.PI * 2 * progress;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, end);
  ctx.strokeStyle = converged ? "#4ade80" : "#ffffff";
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  // Glow
  ctx.shadowColor = converged ? "#4ade80" : "#ffffff";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Center text
  ctx.fillStyle = converged ? "#4ade80" : "#ffffff";
  ctx.font = `bold 12px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.round(progress * 100) + "%", cx, cy);
}

/**
 * Animate convergence ring from 0 to target progress.
 */
function animateConvergenceRing(canvas, targetProgress, converged) {
  let current = 0;
  const duration = 900;
  const start = performance.now();

  function step(ts) {
    const elapsed = ts - start;
    const t = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    current = eased * targetProgress;
    drawConvergenceRing(canvas, current, converged);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ══════════════════════════════════════════════════════════════════════════
   Expose globals
   ══════════════════════════════════════════════════════════════════════════ */

window.NMS = window.NMS || {};
Object.assign(window.NMS, {
  $, $$,
  showEl, hideEl, toggleEl,
  fmt, fmtSci,
  toast,
  setStatus,
  setBtnLoading, initBtn,
  buildStatGrid, buildTableBody,
  exportPDF, exportGraphPNG, canvasToBase64,
  drawConvergenceRing, animateConvergenceRing,
  apiPost,
});
