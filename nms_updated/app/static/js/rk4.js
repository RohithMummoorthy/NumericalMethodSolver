/**
 * rk4.js — Runge-Kutta 4th Order (RK4) frontend controller
 *
 * Handles:
 *   - Form input & validation
 *   - API call and result rendering
 *   - Animated y(x) solution curve
 *   - Step table with sequential fade-in
 *   - PDF / PNG export
 */

"use strict";

(function RK4Module() {
  const {
    $, showEl, hideEl, toast, setStatus,
    setBtnLoading, initBtn,
    buildStatGrid, buildTableBody,
    exportPDF, exportGraphPNG, canvasToBase64,
    apiPost, fmt, fmtSci,
  } = window.NMS;

  // ── Element references ─────────────────────────────────────────────────
  const solveBtn   = $("#rk4-solve-btn");
  const funcInput  = $("#rk4-function");
  const x0Input    = $("#rk4-x0");
  const y0Input    = $("#rk4-y0");
  const xEndInput  = $("#rk4-xend");
  const hInput     = $("#rk4-h");

  const resultPlaceholder = $("#rk4-result-placeholder");
  const resultContent     = $("#rk4-result-content");
  const statsEl           = $("#rk4-stats");

  const graphCard      = $("#rk4-graph-card");
  const graphCanvas    = $("#rk4-graph");
  const graphTooltip   = $("#rk4-graph-tooltip");
  const tableCard      = $("#rk4-table-card");
  const tbody          = $("#rk4-tbody");
  const exportGraphBtn = $("#rk4-export-graph");
  const exportPDFBtn   = $("#rk4-export-pdf");

  // ── State ──────────────────────────────────────────────────────────────
  let lastResult = null;
  let graphRend  = null;

  // ── Init ───────────────────────────────────────────────────────────────
  if (!solveBtn) return;

  initBtn(solveBtn);

  // Example buttons for function input
  document.querySelectorAll("#panel-rk4 .example-btn[data-input]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.input);
      if (target) {
        target.value = btn.dataset.value;
        target.focus();
      }
    });
  });

  solveBtn.addEventListener("click", handleSolve);

  exportGraphBtn.addEventListener("click", () => {
    if (!graphCanvas) return;
    exportGraphPNG(graphCanvas, "runge-kutta-solution.png");
  });

  exportPDFBtn.addEventListener("click", async () => {
    if (!lastResult) { toast("Integrate first to generate a report.", "info"); return; }
    await exportPDF("runge_kutta", lastResult, canvasToBase64(graphCanvas));
  });

  // ── Solve Handler ──────────────────────────────────────────────────────

  async function handleSolve() {
    const funcStr = funcInput.value.trim();
    const x0      = parseFloat(x0Input.value);
    const y0      = parseFloat(y0Input.value);
    const xEnd    = parseFloat(xEndInput.value);
    const h       = parseFloat(hInput.value);

    if (!funcStr) { toast("Please enter the ODE function.", "error"); return; }
    if (isNaN(x0) || isNaN(y0)) { toast("Invalid initial conditions.", "error"); return; }
    if (isNaN(xEnd) || xEnd <= x0) { toast("x_end must be greater than x0.", "error"); return; }
    if (isNaN(h) || h <= 0)  { toast("Step size must be positive.", "error"); return; }
    if ((xEnd - x0) / h > 5000) { toast("Too many steps. Increase step size h.", "error"); return; }

    setBtnLoading(solveBtn, true);
    setStatus("running");

    try {
      const resp = await apiPost("/runge-kutta", {
        function: funcStr,
        x0:       x0,
        y0:       y0,
        x_end:    xEnd,
        h:        h,
      });

      lastResult = resp.data;
      renderResult(resp.data);
      setStatus("success");
      toast(
        `y(${fmt(resp.data.x_end, 4)}) ≈ ${fmt(resp.data.y_final, 8)}`,
        "success"
      );

    } catch (err) {
      setStatus("error");
      toast(`Error: ${err.message}`, "error");
      console.error("RK4 error:", err);
    } finally {
      setBtnLoading(solveBtn, false);
    }
  }

  // ── Result Renderer ────────────────────────────────────────────────────

  function renderResult(data) {
    hideEl(resultPlaceholder);
    showEl(resultContent);

    buildStatGrid(statsEl, [
      { label: "y(x_end)",   value: fmt(data.y_final, 8) },
      { label: "x_end",      value: fmt(data.x_end, 4)   },
      { label: "Steps",      value: String(data.step_count) },
      { label: "dy/dx",      value: data.function_str  },
      { label: "x₀",         value: fmt(data.x0, 4)   },
      { label: "y₀",         value: fmt(data.y0, 4)   },
    ]);

    renderGraph(data);
    renderTable(data);
  }

  // ── Graph ──────────────────────────────────────────────────────────────

  function renderGraph(data) {
    if (!data.x_values || data.x_values.length < 2) { hideEl(graphCard); return; }
    showEl(graphCard);

    if (!graphRend) {
      graphRend = new GraphRenderer(graphCanvas, {
        animationDuration: 1200,
        lineColor: "#ffffff",
        glowBlur:  14,
      });
      graphRend.setTooltip(graphTooltip);
    }

    graphRend.render([
      {
        xData:  data.x_values,
        yData:  data.y_values,
        color:  "#ffffff",
        xLabel: "x",
        yLabel: "y",
      }
    ]);
  }

  // ── Table ──────────────────────────────────────────────────────────────

  function renderTable(data) {
    const steps = data.steps || [];
    if (!steps.length) { hideEl(tableCard); return; }

    showEl(tableCard);

    const rows = steps.map(s => [
      String(s.step),
      fmt(s.x,     5),
      fmt(s.y,     6),
      fmtSci(s.k1, 5),
      fmtSci(s.k2, 5),
      fmtSci(s.k3, 5),
      fmtSci(s.k4, 5),
      fmt(s.y_new, 6),
    ]);

    buildTableBody(tbody, rows);
  }

})();
