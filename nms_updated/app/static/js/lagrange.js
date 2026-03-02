/**
 * lagrange.js — Lagrange Interpolation frontend controller
 *
 * Handles:
 *   - Dynamic data point input rows
 *   - Preset datasets
 *   - API call & result rendering
 *   - Interpolation curve graph with animated drawing
 *   - Scatter points for original data
 *   - Basis polynomial table
 *   - PDF / PNG export
 */

"use strict";

(function LagrangeModule() {
  const {
    $, showEl, hideEl, toast, setStatus,
    setBtnLoading, initBtn,
    buildStatGrid, buildTableBody,
    exportPDF, exportGraphPNG, canvasToBase64,
    apiPost, fmt,
  } = window.NMS;

  // ── Element references ─────────────────────────────────────────────────
  const solveBtn   = $("#lagrange-solve-btn");
  const xTargetIn  = $("#lagrange-x-target");
  const ptsCont    = $("#lagrange-points-container");
  const addPtBtn   = $("#lagrange-add-point");
  const remPtBtn   = $("#lagrange-remove-point");

  const preset1Btn = $("#lagrange-preset-1");
  const preset2Btn = $("#lagrange-preset-2");
  const preset3Btn = $("#lagrange-preset-3");

  const resultPlaceholder = $("#lagrange-result-placeholder");
  const resultContent     = $("#lagrange-result-content");
  const statsEl           = $("#lagrange-stats");

  const graphCard     = $("#lagrange-graph-card");
  const graphCanvas   = $("#lagrange-graph");
  const graphTooltip  = $("#lagrange-graph-tooltip");
  const tableCard     = $("#lagrange-table-card");
  const tbody         = $("#lagrange-tbody");
  const exportGraphBtn = $("#lagrange-export-graph");
  const exportPDFBtn   = $("#lagrange-export-pdf");

  // ── State ──────────────────────────────────────────────────────────────
  let lastResult  = null;
  let graphRend   = null;

  // ── Default points (sin-like) ──────────────────────────────────────────
  const DEFAULT_POINTS = [
    [0, 0], [1, 0.84147], [2, 0.90929], [3, 0.14112], [4, -0.7568],
  ];

  // ── Init ───────────────────────────────────────────────────────────────
  if (!solveBtn) return;

  initBtn(solveBtn);
  initPointsUI(DEFAULT_POINTS);

  addPtBtn.addEventListener("click", addPointRow);
  remPtBtn.addEventListener("click", removeLastPoint);

  preset1Btn.addEventListener("click", () => {
    loadPreset([
      [0, 0], [Math.PI/6, 0.5], [Math.PI/4, 0.7071], [Math.PI/3, 0.8660],
      [Math.PI/2, 1], [Math.PI, 0],
    ], 1.2);
  });

  preset2Btn.addEventListener("click", () => {
    loadPreset([
      [-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4], [3, 9],
    ], 1.5);
  });

  preset3Btn.addEventListener("click", () => {
    loadPreset([
      [0, 1], [0.5, 1.6487], [1, 2.7183], [1.5, 4.4817], [2, 7.3891],
    ], 1.2);
  });

  solveBtn.addEventListener("click", handleSolve);

  exportGraphBtn.addEventListener("click", () => {
    if (!graphCanvas) return;
    exportGraphPNG(graphCanvas, "lagrange-interpolation.png");
  });

  exportPDFBtn.addEventListener("click", async () => {
    if (!lastResult) { toast("Solve first to generate a report.", "info"); return; }
    await exportPDF("lagrange", lastResult, canvasToBase64(graphCanvas));
  });

  // ── Points UI ──────────────────────────────────────────────────────────

  function initPointsUI(points) {
    ptsCont.innerHTML = "";
    points.forEach(([x, y]) => addPointRow(x, y));
  }

  function addPointRow(xVal = "", yVal = "") {
    const idx = ptsCont.children.length;
    const row = document.createElement("div");
    row.className = "point-row";
    row.innerHTML = `
      <span class="point-index">${idx}</span>
      <input
        type="number"
        class="form-input mono pt-x"
        placeholder="x"
        value="${xVal !== "" ? xVal : ""}"
        step="any"
      />
      <input
        type="number"
        class="form-input mono pt-y"
        placeholder="y"
        value="${yVal !== "" ? yVal : ""}"
        step="any"
      />
    `;
    ptsCont.appendChild(row);
    // Update indices
    refreshIndices();
  }

  function removeLastPoint() {
    if (ptsCont.children.length <= 2) {
      toast("At least 2 points are required.", "info");
      return;
    }
    ptsCont.lastElementChild.remove();
    refreshIndices();
  }

  function refreshIndices() {
    ptsCont.querySelectorAll(".point-index").forEach((el, i) => {
      el.textContent = i;
    });
  }

  function loadPreset(points, xTarget) {
    initPointsUI(points);
    xTargetIn.value = xTarget;
    toast(`Loaded ${points.length}-point preset.`, "info", 2000);
  }

  function getPointsFromUI() {
    const rows = ptsCont.querySelectorAll(".point-row");
    const xs = [], ys = [];
    let valid = true;

    rows.forEach(row => {
      const xIn = row.querySelector(".pt-x");
      const yIn = row.querySelector(".pt-y");
      const x   = parseFloat(xIn.value);
      const y   = parseFloat(yIn.value);
      if (isNaN(x) || isNaN(y)) { valid = false; return; }
      xs.push(x);
      ys.push(y);
    });

    if (!valid) return null;
    return { x_points: xs, y_points: ys };
  }

  // ── Solve Handler ──────────────────────────────────────────────────────

  async function handleSolve() {
    const pts = getPointsFromUI();
    if (!pts) { toast("All point fields must be valid numbers.", "error"); return; }
    if (pts.x_points.length < 2) { toast("At least 2 points are required.", "error"); return; }

    const xTarget = parseFloat(xTargetIn.value);
    if (isNaN(xTarget)) { toast("Enter a valid interpolation target x.", "error"); return; }

    setBtnLoading(solveBtn, true);
    setStatus("running");

    try {
      const resp = await apiPost("/lagrange", {
        x_points: pts.x_points,
        y_points: pts.y_points,
        x_target: xTarget,
      });

      lastResult = resp.data;
      renderResult(resp.data);
      setStatus("success");
      toast(`P(${xTarget}) ≈ ${fmt(resp.data.interpolated_value, 8)}`, "success");

    } catch (err) {
      setStatus("error");
      toast(`Error: ${err.message}`, "error");
      console.error("Lagrange error:", err);
    } finally {
      setBtnLoading(solveBtn, false);
    }
  }

  // ── Result Renderer ────────────────────────────────────────────────────

  function renderResult(data) {
    hideEl(resultPlaceholder);
    showEl(resultContent);

    buildStatGrid(statsEl, [
      { label: "P(x_target)",    value: fmt(data.interpolated_value, 8) },
      { label: "At x =",         value: String(data.x_target) },
      { label: "Degree",         value: String(data.degree) },
      { label: "Data Points",    value: String(data.num_points) },
    ]);

    renderGraph(data);
    renderTable(data);
  }

  // ── Graph ──────────────────────────────────────────────────────────────

  function renderGraph(data) {
    showEl(graphCard);

    if (!graphRend) {
      graphRend = new GraphRenderer(graphCanvas, {
        animationDuration: 1100,
        lineColor: "#ffffff",
        glowBlur:  14,
        pointColor: "#a0a0ff",
        pointRadius: 5,
      });
      graphRend.setTooltip(graphTooltip);
    }

    graphRend.render([
      // Smooth interpolation curve
      {
        xData:  data.curve_x,
        yData:  data.curve_y,
        color:  "#ffffff",
        xLabel: "x",
        yLabel: "P(x)",
      },
      // Original data points (non-animated)
      {
        xData:    data.x_points,
        yData:    data.y_points,
        color:    "#a0a0ff",
        isPoints: true,
        animated: false,
      },
    ]);
  }

  // ── Table ──────────────────────────────────────────────────────────────

  function renderTable(data) {
    const basis = data.basis_polynomials || [];
    if (!basis.length) { hideEl(tableCard); return; }

    showEl(tableCard);

    const rows = basis.map(b => [
      String(b.index),
      fmt(b.x_i, 4),
      fmt(b.y_i, 4),
      fmt(b.value_at_target, 6),
      fmt(b.denominator, 6),
    ]);

    buildTableBody(tbody, rows);
  }

})();
