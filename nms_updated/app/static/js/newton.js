/**
 * newton.js — Newton-Raphson Method frontend controller
 *
 * Handles:
 *   - Form submission & API call
 *   - Result rendering (stats, convergence ring)
 *   - Convergence graph (log error vs iteration)
 *   - Iteration slider (replay)
 *   - Iteration table
 *   - PDF / PNG export
 */

"use strict";

(function NewtonModule() {
  const {
    $, showEl, hideEl, toast, setStatus,
    setBtnLoading, initBtn,
    buildStatGrid, buildTableBody,
    exportPDF, exportGraphPNG, canvasToBase64,
    animateConvergenceRing, apiPost, fmt, fmtSci,
  } = window.NMS;

  // ── Element references ─────────────────────────────────────────────────
  const solveBtn     = $("#nr-solve-btn");
  const funcInput    = $("#nr-function");
  const x0Input      = $("#nr-x0");
  const tolInput     = $("#nr-tolerance");
  const maxIterInput = $("#nr-max-iter");

  const resultPlaceholder = $("#nr-result-placeholder");
  const resultContent     = $("#nr-result-content");
  const statsEl           = $("#nr-stats");
  const ringCanvas        = $("#nr-convergence-ring");
  const ringLabel         = $("#nr-ring-label");

  const graphCard     = $("#nr-graph-card");
  const graphCanvas   = $("#nr-graph");
  const graphTooltip  = $("#nr-graph-tooltip");
  const iterSlider    = $("#nr-iter-slider");
  const sliderValEl   = $("#nr-slider-val");

  const tableCard = $("#nr-table-card");
  const tbody     = $("#nr-tbody");

  const exportGraphBtn = $("#nr-export-graph");
  const exportPDFBtn   = $("#nr-export-pdf");

  // ── State ──────────────────────────────────────────────────────────────
  let lastResult  = null;   // API response data
  let graphRend   = null;   // GraphRenderer instance

  // ── Init ───────────────────────────────────────────────────────────────
  if (!solveBtn) return;  // Panel not present

  initBtn(solveBtn);

  // Example buttons
  document.querySelectorAll(".example-btn[data-input]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.input);
      if (target) {
        target.value = btn.dataset.value;
        target.focus();
      }
    });
  });

  // Solve button
  solveBtn.addEventListener("click", handleSolve);

  // Slider
  iterSlider.addEventListener("input", handleSlider);

  // Export buttons
  exportGraphBtn.addEventListener("click", () => {
    if (!graphCanvas) return;
    exportGraphPNG(graphCanvas, "newton-raphson-convergence.png");
  });

  exportPDFBtn.addEventListener("click", async () => {
    if (!lastResult) { toast("Solve first to generate a report.", "info"); return; }
    await exportPDF("newton_raphson", lastResult, canvasToBase64(graphCanvas));
  });

  // ── Solve Handler ──────────────────────────────────────────────────────

  async function handleSolve() {
    const funcStr  = funcInput.value.trim();
    const x0       = parseFloat(x0Input.value);
    const tol      = parseFloat(tolInput.value);
    const maxIter  = parseInt(maxIterInput.value, 10);

    if (!funcStr) { toast("Please enter a function.", "error"); return; }
    if (isNaN(x0)) { toast("Invalid initial guess.", "error"); return; }

    setBtnLoading(solveBtn, true);
    setStatus("running");

    try {
      const resp = await apiPost("/newton-raphson", {
        function:  funcStr,
        x0:        x0,
        tolerance: tol,
        max_iter:  maxIter,
      });

      lastResult = resp.data;
      renderResult(resp.data);
      setStatus("success");
      toast(
        resp.data.converged
          ? `Converged in ${resp.data.iterations} iteration(s)! Root ≈ ${fmt(resp.data.root, 8)}`
          : "Did not converge. Try a different initial guess.",
        resp.data.converged ? "success" : "error"
      );

    } catch (err) {
      setStatus("error");
      toast(`Error: ${err.message}`, "error");
      console.error("Newton error:", err);
    } finally {
      setBtnLoading(solveBtn, false);
    }
  }

  // ── Result Renderer ────────────────────────────────────────────────────

  function renderResult(data) {
    // Show result section
    hideEl(resultPlaceholder);
    showEl(resultContent);

    // Stats
    buildStatGrid(statsEl, [
      { label: "Root",       value: data.root !== null ? fmt(data.root, 8) : "—" },
      { label: "Converged",  value: data.converged ? "Yes" : "No",
        cls: data.converged ? "success" : "error" },
      { label: "Iterations", value: String(data.iterations) },
    ]);

    // Convergence ring
    const progress = data.converged
      ? 1
      : Math.min(data.iterations / Math.max(parseInt(maxIterInput.value, 10), 1), 0.98);
    animateConvergenceRing(ringCanvas, progress, data.converged);
    ringLabel.textContent = data.converged ? "Converged ✓" : "Did not converge";

    // Graph
    renderGraph(data);

    // Iteration table
    renderTable(data);
  }

  // ── Graph ──────────────────────────────────────────────────────────────

  function renderGraph(data) {
    showEl(graphCard);

    if (!graphRend) {
      graphRend = new GraphRenderer(graphCanvas, {
        animationDuration: 900,
        lineColor: "#ffffff",
        glowColor: "rgba(255,255,255,0.5)",
        glowBlur:  16,
      });
      graphRend.setTooltip(graphTooltip);
    }

    const errors = data.error_history;
    const iters  = errors.map((_, i) => i + 1);

    if (!errors.length) { hideEl(graphCard); return; }

    graphRend.render([
      {
        xData:  iters,
        yData:  errors,
        color:  "#ffffff",
        xLabel: "Iteration",
        yLabel: "log₁₀|error|",
      }
    ]);

    // Configure slider
    iterSlider.min   = 0;
    iterSlider.max   = data.error_history.length;
    iterSlider.value = data.error_history.length;
    sliderValEl.textContent = data.error_history.length;
  }

  // ── Slider Handler ─────────────────────────────────────────────────────

  function handleSlider() {
    if (!lastResult || !graphRend) return;
    const val    = parseInt(iterSlider.value, 10);
    const total  = lastResult.error_history.length;

    sliderValEl.textContent = val;

    const fraction = total > 0 ? val / total : 0;
    graphRend.renderFraction(fraction);

    // Highlight corresponding table row
    if (tbody) {
      const rows = tbody.querySelectorAll("tr");
      rows.forEach((tr, i) => {
        tr.classList.toggle("highlight-row", i === val - 1);
        if (i === val - 1) {
          tr.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      });
    }
  }

  // ── Table ──────────────────────────────────────────────────────────────

  function renderTable(data) {
    const rows = data.iteration_table || [];
    if (!rows.length) { hideEl(tableCard); return; }

    showEl(tableCard);

    const tableRows = rows.map(r => [
      String(r.iteration),
      fmt(r.x, 8),
      fmtSci(r.fx, 4),
      fmtSci(r.fpx, 4),
      fmt(r.x_new, 8),
      fmtSci(r.error, 4),
    ]);

    // Highlight last row if converged
    const highlight = data.converged ? [rows.length - 1] : [];
    buildTableBody(tbody, tableRows, highlight);

    // Last row is convergence row
    if (data.converged) {
      const lastRow = tbody.lastElementChild;
      if (lastRow) lastRow.classList.add("convergence-row");
    }
  }

})();
