/**
 * graph.js — Reusable animated graph renderer using Canvas 2D API
 *
 * Provides GraphRenderer class that can draw:
 *  - Animated glowing line charts
 *  - Scatter points (Lagrange nodes)
 *  - Axes, grid, labels
 *  - Hover tooltip interaction
 */

"use strict";

class GraphRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");

    this.opts = Object.assign({
      paddingTop:    36,
      paddingRight:  24,
      paddingBottom: 52,
      paddingLeft:   68,
      bgColor:       "rgba(8, 8, 15, 0.0)",   // transparent (card provides bg)
      lineColor:     "#ffffff",
      lineWidth:     1.8,
      glowColor:     "rgba(255, 255, 255, 0.4)",
      glowBlur:      12,
      pointColor:    "#a0a0ff",
      pointRadius:   4,
      gridColor:     "rgba(255, 255, 255, 0.05)",
      axisColor:     "rgba(255, 255, 255, 0.2)",
      labelColor:    "rgba(255, 255, 255, 0.45)",
      fontSize:      10,
      fontFamily:    '"JetBrains Mono", monospace',
      animationDuration: 1200,   // ms
    }, options);

    // Internal state
    this._series    = [];    // [{x[], y[], color?, label?, isPoints?}]
    this._xBounds   = null;  // {min, max}
    this._yBounds   = null;
    this._animProg  = 1;     // 0→1, animation progress
    this._animStart = null;
    this._rafHandle = null;
    this._lastData  = null;  // for tooltip
    this._tooltip   = null;  // paired tooltip element

    // Resize observer
    this._ro = new ResizeObserver(() => this._onResize());
    this._ro.observe(canvas.parentElement || canvas);

    // Mouse/touch for tooltip
    canvas.addEventListener("mousemove",  e => this._onMouseMove(e));
    canvas.addEventListener("mouseleave", e => this._onMouseLeave(e));
  }

  /* ── Public API ────────────────────────────────────────────────────────── */

  /**
   * Set the tooltip element (div.graph-tooltip).
   * @param {HTMLElement} el
   */
  setTooltip(el) {
    this._tooltip = el;
  }

  /**
   * Render series data with animation.
   * @param {Array<{xData:number[], yData:number[], color?:string, label?:string, isPoints?:boolean}>} series
   * @param {object} [boundsOverride] - {xMin, xMax, yMin, yMax}
   */
  render(series, boundsOverride = null) {
    this._series = series;
    this._computeBounds(boundsOverride);
    this._animate();
  }

  /**
   * Re-draw up to a specific fraction of the primary line series
   * (used for Newton iteration slider replay).
   * @param {number} fraction 0–1
   */
  renderFraction(fraction) {
    this._animProg = fraction;
    cancelAnimationFrame(this._rafHandle);
    this._draw();
  }

  /**
   * Destroy the renderer (cleanup).
   */
  destroy() {
    cancelAnimationFrame(this._rafHandle);
    this._ro.disconnect();
  }

  /* ── Internal ────────────────────────────────────────────────────────────── */

  _onResize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.canvas.width  = rect.width  * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width  = rect.width  + "px";
    this.canvas.style.height = rect.height + "px";
    this.ctx.scale(dpr, dpr);
    this._draw();
  }

  _computeBounds(override) {
    if (override) {
      this._xBounds = { min: override.xMin, max: override.xMax };
      this._yBounds = { min: override.yMin, max: override.yMax };
      return;
    }

    let xAll = [], yAll = [];
    this._series.forEach(s => {
      xAll = xAll.concat(s.xData);
      yAll = yAll.concat(s.yData.filter(v => isFinite(v)));
    });

    if (!xAll.length || !yAll.length) return;

    const xMin = Math.min(...xAll);
    const xMax = Math.max(...xAll);
    const yMin = Math.min(...yAll);
    const yMax = Math.max(...yAll);

    const xPad = (xMax - xMin) * 0.06 || 0.5;
    const yPad = (yMax - yMin) * 0.10 || 0.5;

    this._xBounds = { min: xMin - xPad, max: xMax + xPad };
    this._yBounds = { min: yMin - yPad, max: yMax + yPad };
  }

  _animate() {
    this._animProg  = 0;
    this._animStart = null;
    cancelAnimationFrame(this._rafHandle);

    const step = (ts) => {
      if (!this._animStart) this._animStart = ts;
      const elapsed = ts - this._animStart;
      // Ease-in-out cubic
      const t = Math.min(elapsed / this.opts.animationDuration, 1);
      this._animProg = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
      this._draw();
      if (t < 1) this._rafHandle = requestAnimationFrame(step);
    };

    this._rafHandle = requestAnimationFrame(step);
  }

  _draw() {
    const { canvas, ctx, opts, _xBounds: xB, _yBounds: yB } = this;
    const W = canvas.width  / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!xB || !yB) return;

    const plotX = opts.paddingLeft;
    const plotY = opts.paddingTop;
    const plotW = W - opts.paddingLeft - opts.paddingRight;
    const plotH = H - opts.paddingTop  - opts.paddingBottom;

    if (plotW <= 0 || plotH <= 0) return;

    // Coordinate mappers
    const mapX = x => plotX + (x - xB.min) / (xB.max - xB.min) * plotW;
    const mapY = y => plotY + plotH - (y - yB.min) / (yB.max - yB.min) * plotH;

    this._lastData = { mapX, mapY, plotX, plotY, plotW, plotH, xB, yB };

    // ── Grid ───────────────────────────────────────────────────────────────
    this._drawGrid(ctx, plotX, plotY, plotW, plotH, mapX, mapY, xB, yB, W, H, opts);

    // ── Clip to plot area ──────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotX - 2, plotY - 2, plotW + 4, plotH + 4);
    ctx.clip();

    // ── Zero lines ────────────────────────────────────────────────────────
    if (xB.min < 0 && xB.max > 0) {
      ctx.beginPath();
      ctx.moveTo(mapX(0), plotY);
      ctx.lineTo(mapX(0), plotY + plotH);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    if (yB.min < 0 && yB.max > 0) {
      ctx.beginPath();
      ctx.moveTo(plotX, mapY(0));
      ctx.lineTo(plotX + plotW, mapY(0));
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // ── Series ────────────────────────────────────────────────────────────
    this._series.forEach(s => {
      if (s.isPoints) {
        this._drawPoints(ctx, s, mapX, mapY, opts);
      } else {
        this._drawLine(ctx, s, mapX, mapY, opts, plotX, plotY, plotW, plotH);
      }
    });

    ctx.restore();

    // ── Axes labels ───────────────────────────────────────────────────────
    this._drawAxesLabels(ctx, plotX, plotY, plotW, plotH, xB, yB, opts, W, H);
  }

  _drawGrid(ctx, plotX, plotY, plotW, plotH, mapX, mapY, xB, yB, W, H, opts) {
    const TICKS = 6;

    ctx.strokeStyle = opts.gridColor;
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([2, 4]);

    // Vertical grid lines
    for (let i = 0; i <= TICKS; i++) {
      const x = plotX + (plotW / TICKS) * i;
      ctx.beginPath();
      ctx.moveTo(x, plotY);
      ctx.lineTo(x, plotY + plotH);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= TICKS; i++) {
      const y = plotY + (plotH / TICKS) * i;
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Axis lines
    ctx.strokeStyle = opts.axisColor;
    ctx.lineWidth   = 0.8;
    ctx.strokeRect(plotX, plotY, plotW, plotH);
  }

  _drawAxesLabels(ctx, plotX, plotY, plotW, plotH, xB, yB, opts, W, H) {
    const TICKS = 5;
    ctx.fillStyle  = opts.labelColor;
    ctx.font       = `${opts.fontSize}px ${opts.fontFamily}`;
    ctx.textAlign  = "center";
    ctx.textBaseline = "top";

    // X labels
    for (let i = 0; i <= TICKS; i++) {
      const val = xB.min + (xB.max - xB.min) * (i / TICKS);
      const x   = plotX + plotW * (i / TICKS);
      ctx.fillText(this._fmtTick(val), x, plotY + plotH + 8);
    }

    // Y labels
    ctx.textAlign    = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= TICKS; i++) {
      const val = yB.min + (yB.max - yB.min) * (i / TICKS);
      const y   = plotY + plotH - plotH * (i / TICKS);
      ctx.fillText(this._fmtTick(val), plotX - 8, y);
    }
  }

  _drawLine(ctx, series, mapX, mapY, opts, plotX, plotY, plotW, plotH) {
    const { xData, yData, color, animated = true } = series;
    if (!xData || xData.length < 2) return;

    const prog    = animated ? this._animProg : 1;
    const visible = Math.max(2, Math.round(xData.length * prog));
    const lineColor = color || opts.lineColor;

    ctx.beginPath();
    let started = false;

    for (let i = 0; i < visible; i++) {
      if (!isFinite(yData[i])) { started = false; continue; }
      const px = mapX(xData[i]);
      const py = mapY(yData[i]);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }

    // Glow layer
    ctx.shadowColor = lineColor;
    ctx.shadowBlur  = opts.glowBlur;
    ctx.strokeStyle = lineColor.replace(")", ", 0.4)").replace("rgb", "rgba");
    ctx.lineWidth   = opts.lineWidth + 3;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();

    // Sharp line on top
    ctx.shadowBlur  = 4;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = opts.lineWidth;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawPoints(ctx, series, mapX, mapY, opts) {
    const { xData, yData, color } = series;
    if (!xData) return;

    const ptColor = color || opts.pointColor;
    const r       = opts.pointRadius;

    xData.forEach((x, i) => {
      if (!isFinite(yData[i])) return;
      const px = mapX(x);
      const py = mapY(yData[i]);

      // Outer glow
      ctx.beginPath();
      ctx.arc(px, py, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = ptColor.replace(")", ", 0.15)").replace("rgb", "rgba");
      ctx.fill();

      // Point
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle   = ptColor;
      ctx.shadowColor = ptColor;
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // White dot center
      ctx.beginPath();
      ctx.arc(px, py, r / 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });
  }

  _fmtTick(val) {
    if (Math.abs(val) >= 1000 || (Math.abs(val) < 0.01 && val !== 0)) {
      return val.toExponential(1);
    }
    return parseFloat(val.toFixed(3)).toString();
  }

  /* ── Tooltip ─────────────────────────────────────────────────────────────── */

  _onMouseMove(e) {
    if (!this._tooltip || !this._lastData) return;

    const rect = this.canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const { mapX, mapY, plotX, plotY, plotW, plotH, xB, yB } = this._lastData;

    // Only show inside plot area
    if (mx < plotX || mx > plotX + plotW || my < plotY || my > plotY + plotH) {
      this._hideTooltip();
      return;
    }

    // Find nearest x in first non-points series
    const mainSeries = this._series.find(s => !s.isPoints);
    if (!mainSeries || !mainSeries.xData.length) return;

    const mouseX = xB.min + (mx - plotX) / plotW * (xB.max - xB.min);
    let nearestIdx = 0;
    let minDist = Infinity;

    mainSeries.xData.forEach((x, i) => {
      const d = Math.abs(x - mouseX);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    });

    const x = mainSeries.xData[nearestIdx];
    const y = mainSeries.yData[nearestIdx];
    if (!isFinite(y)) return;

    const px = mapX(x);
    const py = mapY(y);

    // Draw hover dot
    const dpr = window.devicePixelRatio || 1;
    const W   = this.canvas.width  / dpr;
    const H   = this.canvas.height / dpr;
    this._draw();
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle   = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur  = 14;
    ctx.fill();
    ctx.restore();

    // Position tooltip
    const tip = this._tooltip;
    const xLabel = mainSeries.xLabel || "x";
    const yLabel = mainSeries.yLabel || "y";
    tip.textContent = `${xLabel}: ${this._fmtTick(x)}  •  ${yLabel}: ${this._fmtTick(y)}`;

    let tipX = mx + 14;
    let tipY = my - 10;
    if (tipX + 180 > rect.width) tipX = mx - 180;
    if (tipY < 0) tipY = my + 14;

    tip.style.left = tipX + "px";
    tip.style.top  = tipY + "px";
    tip.classList.add("visible");
  }

  _onMouseLeave() {
    this._hideTooltip();
  }

  _hideTooltip() {
    if (this._tooltip) this._tooltip.classList.remove("visible");
    this._draw();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Expose globally
   ══════════════════════════════════════════════════════════════════════════ */
window.GraphRenderer = GraphRenderer;
