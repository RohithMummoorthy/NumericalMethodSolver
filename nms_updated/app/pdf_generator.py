"""
PDF Generator — Themed Dark-Mode Report using ReportLab Platypus
Produces cinematic, dark-background PDFs matching the web UI aesthetic.
"""

import base64
import io
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# ── Palette ────────────────────────────────────────────────────────────────────
BG_COLOR        = colors.HexColor("#0a0a0f")       # Near-black background
PANEL_COLOR     = colors.HexColor("#111118")       # Slightly lighter panel
BORDER_COLOR    = colors.HexColor("#2a2a3a")       # Subtle border
ACCENT_COLOR    = colors.HexColor("#ffffff")       # Pure white accent
ACCENT_GLOW     = colors.HexColor("#e8e8ff")       # Cool white glow
SUBTEXT_COLOR   = colors.HexColor("#8888aa")       # Muted gray-purple
TEXT_COLOR      = colors.HexColor("#e0e0f0")       # Main body text
HEADER_BG       = colors.HexColor("#16161e")       # Table header bg
ROW_ALT         = colors.HexColor("#0e0e16")       # Alternating row
ROW_NORMAL      = colors.HexColor("#111118")       # Normal row
HIGHLIGHT_COLOR = colors.HexColor("#1a1a2e")       # Highlight row

W, H = A4  # 595 x 842 pt


# ── Custom Flowables ───────────────────────────────────────────────────────────

class FullPageBackground(Flowable):
    """Draws the dark gradient background across the full page."""

    def __init__(self, width, height):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        canvas = self.canv
        # Solid near-black fill
        canvas.setFillColor(BG_COLOR)
        canvas.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        # Subtle top vignette gradient simulation
        for i in range(30):
            alpha = 0.04 * (30 - i) / 30
            c = colors.HexColor("#0a0a1a")
            canvas.setFillColorRGB(
                c.red, c.green, c.blue, alpha
            )
            canvas.rect(
                0, self.height - i * 4, self.width, 4, fill=1, stroke=0
            )


class GlowLine(Flowable):
    """Horizontal accent line with a subtle glow effect."""

    def __init__(self, width, color=ACCENT_COLOR, thickness=0.8):
        super().__init__()
        self.width = width
        self.color = color
        self.thickness = thickness
        self.height = 6

    def draw(self):
        canvas = self.canv
        # Outer glow (wide, transparent)
        canvas.setStrokeColorRGB(
            self.color.red, self.color.green, self.color.blue, 0.15
        )
        canvas.setLineWidth(6)
        canvas.line(0, self.height / 2, self.width, self.height / 2)
        # Inner line
        canvas.setStrokeColor(self.color)
        canvas.setLineWidth(self.thickness)
        canvas.line(0, self.height / 2, self.width, self.height / 2)


class MethodBadge(Flowable):
    """Pill-shaped badge for the method name."""

    def __init__(self, text, width=200):
        super().__init__()
        self.text = text
        self.width = width
        self.height = 28

    def draw(self):
        canvas = self.canv
        r = self.height / 2
        # Background pill
        canvas.setFillColor(BORDER_COLOR)
        canvas.roundRect(0, 0, self.width, self.height, r, fill=1, stroke=0)
        # Text
        canvas.setFillColor(ACCENT_GLOW)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawCentredString(self.width / 2, 9, self.text.upper())


class StatBox(Flowable):
    """Renders a key-value stat card."""

    def __init__(self, label, value, width=160, height=52):
        super().__init__()
        self.label = label
        self.value = str(value)
        self.width = width
        self.height = height

    def draw(self):
        canvas = self.canv
        # Card background
        canvas.setFillColor(PANEL_COLOR)
        canvas.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=0)
        # Border
        canvas.setStrokeColor(BORDER_COLOR)
        canvas.setLineWidth(0.5)
        canvas.roundRect(0, 0, self.width, self.height, 6, fill=0, stroke=1)
        # Label
        canvas.setFillColor(SUBTEXT_COLOR)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(10, self.height - 16, self.label.upper())
        # Value
        canvas.setFillColor(ACCENT_COLOR)
        canvas.setFont("Helvetica-Bold", 13)
        value_display = self.value[:18] + "…" if len(self.value) > 18 else self.value
        canvas.drawString(10, 12, value_display)


# ── Page Template ─────────────────────────────────────────────────────────────

def _on_page(canvas, doc):
    """Called on every page — draws background + header + footer."""
    canvas.saveState()

    # Background
    canvas.setFillColor(BG_COLOR)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)

    # Top bar line
    canvas.setStrokeColor(BORDER_COLOR)
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, H - 18 * mm, W - 20 * mm, H - 18 * mm)

    # Header: App name (left) + date (right)
    canvas.setFillColor(SUBTEXT_COLOR)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(20 * mm, H - 14 * mm, "NUMERICAL METHODS SOLVER")
    canvas.drawRightString(
        W - 20 * mm,
        H - 14 * mm,
        datetime.now().strftime("%B %d, %Y — %H:%M"),
    )

    # Footer
    canvas.line(20 * mm, 16 * mm, W - 20 * mm, 16 * mm)
    canvas.setFillColor(SUBTEXT_COLOR)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(20 * mm, 10 * mm, "Generated with Numerical Methods Solver")
    canvas.drawRightString(
        W - 20 * mm, 10 * mm, f"Page {doc.page}"
    )

    canvas.restoreState()


# ── Style Builders ────────────────────────────────────────────────────────────

def _build_styles():
    """Return a dict of all paragraph styles used in the PDF."""
    return {
        "title": ParagraphStyle(
            "title",
            fontName="Helvetica-Bold",
            fontSize=28,
            textColor=ACCENT_COLOR,
            spaceAfter=4,
            leading=34,
            alignment=TA_LEFT,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontName="Helvetica",
            fontSize=13,
            textColor=SUBTEXT_COLOR,
            spaceAfter=12,
            leading=18,
            alignment=TA_LEFT,
        ),
        "section_header": ParagraphStyle(
            "section_header",
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=ACCENT_GLOW,
            spaceBefore=16,
            spaceAfter=8,
            leading=16,
            alignment=TA_LEFT,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=9,
            textColor=TEXT_COLOR,
            spaceAfter=6,
            leading=14,
            alignment=TA_LEFT,
        ),
        "formula": ParagraphStyle(
            "formula",
            fontName="Courier-Bold",
            fontSize=10,
            textColor=ACCENT_GLOW,
            spaceAfter=6,
            leading=16,
            backColor=PANEL_COLOR,
            leftIndent=12,
            rightIndent=12,
            borderPadding=(8, 12, 8, 12),
            alignment=TA_LEFT,
        ),
        "result_value": ParagraphStyle(
            "result_value",
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=ACCENT_COLOR,
            spaceAfter=4,
            leading=28,
            alignment=TA_CENTER,
        ),
        "result_label": ParagraphStyle(
            "result_label",
            fontName="Helvetica",
            fontSize=8,
            textColor=SUBTEXT_COLOR,
            spaceAfter=16,
            leading=12,
            alignment=TA_CENTER,
        ),
        "caption": ParagraphStyle(
            "caption",
            fontName="Helvetica",
            fontSize=8,
            textColor=SUBTEXT_COLOR,
            spaceAfter=4,
            leading=12,
            alignment=TA_CENTER,
        ),
        "note": ParagraphStyle(
            "note",
            fontName="Helvetica-Oblique",
            fontSize=8,
            textColor=SUBTEXT_COLOR,
            spaceAfter=6,
            leading=12,
            alignment=TA_LEFT,
        ),
    }


def _build_table_style(n_rows: int) -> TableStyle:
    """Generate a premium dark table style with alternating rows."""
    cmds = [
        # Header row
        ("BACKGROUND",   (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR",    (0, 0), (-1, 0), ACCENT_GLOW),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 8),
        ("TOPPADDING",   (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING",(0, 0), (-1, 0), 9),
        ("LEFTPADDING",  (0, 0), (-1, 0), 10),
        ("RIGHTPADDING", (0, 0), (-1, 0), 10),
        # Data rows
        ("FONTNAME",     (0, 1), (-1, -1), "Courier"),
        ("FONTSIZE",     (0, 1), (-1, -1), 7.5),
        ("TEXTCOLOR",    (0, 1), (-1, -1), TEXT_COLOR),
        ("TOPPADDING",   (0, 1), (-1, -1), 7),
        ("BOTTOMPADDING",(0, 1), (-1, -1), 7),
        ("LEFTPADDING",  (0, 1), (-1, -1), 10),
        ("RIGHTPADDING", (0, 1), (-1, -1), 10),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        # Outer border
        ("BOX",          (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("LINEABOVE",    (0, 0), (-1, 0), 0.5, BORDER_COLOR),
        ("LINEBELOW",    (0, 0), (-1, 0), 0.5, BORDER_COLOR),
    ]
    # Alternating row colors
    for row in range(1, n_rows + 1):
        bg = ROW_ALT if row % 2 == 0 else ROW_NORMAL
        cmds.append(("BACKGROUND", (0, row), (-1, row), bg))
    # Thin dividers
    for row in range(1, n_rows + 1):
        cmds.append(("LINEBELOW", (0, row), (-1, row), 0.3, BORDER_COLOR))

    return TableStyle(cmds)


# ── Main Generator ─────────────────────────────────────────────────────────────

class PDFGenerator:
    """
    Orchestrates themed PDF generation for all three methods.
    Call .generate(method, data, graph_b64) → bytes
    """

    METHOD_META = {
        "newton_raphson": {
            "display":  "Newton-Raphson Method",
            "subtitle": "Root-Finding via Iterative Linearization",
            "formula":  "x_(n+1) = x_n  −  f(x_n) / f'(x_n)",
            "description": (
                "The Newton-Raphson method is a powerful iterative technique for finding "
                "the roots of a real-valued function. Starting from an initial guess x₀, "
                "each iteration constructs a tangent line to the curve at the current point "
                "and takes the x-intercept of that tangent as the next approximation. "
                "Convergence is quadratic near a simple root, making it extremely efficient "
                "when a good initial guess is available."
            ),
        },
        "lagrange": {
            "display":  "Lagrange Interpolation",
            "subtitle": "Polynomial Fitting Through Given Data Points",
            "formula":  "P(x) = Σ y_i · L_i(x)   where   L_i(x) = Π (x−x_j)/(x_i−x_j)",
            "description": (
                "Lagrange interpolation constructs a unique polynomial of minimum degree "
                "that passes exactly through a given set of (x, y) data points. The method "
                "expresses the polynomial as a linear combination of basis polynomials Lᵢ(x), "
                "each designed to equal 1 at xᵢ and 0 at all other nodes. While elegant and "
                "theoretically exact, care should be taken with high-degree polynomials due "
                "to potential Runge's phenomenon near the interval boundaries."
            ),
        },
        "runge_kutta": {
            "display":  "Runge-Kutta 4th Order (RK4)",
            "subtitle": "Numerical Integration of Ordinary Differential Equations",
            "formula":  "y_(n+1) = y_n + (h/6)(k₁ + 2k₂ + 2k₃ + k₄)",
            "description": (
                "The classical 4th-order Runge-Kutta method is the workhorse of numerical "
                "ODE integration. It achieves fourth-order accuracy by computing four "
                "intermediate slope estimates (k₁–k₄) within each step and combining them "
                "in a weighted average. This balances computational cost against accuracy, "
                "making RK4 the default choice for smooth, non-stiff initial value problems. "
                "Global truncation error is O(h⁴), where h is the step size."
            ),
        },
    }

    def generate(
        self,
        method: str,
        data: dict,
        graph_b64: Optional[str] = None,
    ) -> bytes:
        """
        Build the complete PDF and return raw bytes.

        Parameters
        ----------
        method     : "newton_raphson" | "lagrange" | "runge_kutta"
        data       : Result dict from the corresponding solver service
        graph_b64  : Base64-encoded PNG image (optional)
        """
        buf = io.BytesIO()
        meta = self.METHOD_META[method]
        styles = _build_styles()

        # ── Document setup ────────────────────────────────────────────────────
        doc = BaseDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=22 * mm,
            bottomMargin=22 * mm,
        )

        content_frame = Frame(
            doc.leftMargin,
            doc.bottomMargin,
            W - doc.leftMargin - doc.rightMargin,
            H - doc.topMargin - doc.bottomMargin - 8 * mm,
            id="main",
        )

        doc.addPageTemplates([
            PageTemplate(id="dark", frames=[content_frame], onPage=_on_page)
        ])

        story = []

        # ── Cover section ─────────────────────────────────────────────────────
        story.append(Spacer(1, 8 * mm))
        story.append(Paragraph(meta["display"], styles["title"]))
        story.append(Paragraph(meta["subtitle"], styles["subtitle"]))
        story.append(GlowLine(W - 40 * mm))
        story.append(Spacer(1, 6 * mm))

        # ── Method description ────────────────────────────────────────────────
        story.append(Paragraph("ABOUT THIS METHOD", styles["section_header"]))
        story.append(Paragraph(meta["description"], styles["body"]))
        story.append(Spacer(1, 4 * mm))

        # ── Formula ───────────────────────────────────────────────────────────
        story.append(Paragraph("CORE FORMULA", styles["section_header"]))
        story.append(Paragraph(meta["formula"], styles["formula"]))
        story.append(Spacer(1, 6 * mm))

        # ── Results section (method-specific) ────────────────────────────────
        if method == "newton_raphson":
            story += self._newton_section(data, styles)
        elif method == "lagrange":
            story += self._lagrange_section(data, styles)
        elif method == "runge_kutta":
            story += self._rk4_section(data, styles)

        # ── Embedded graph ────────────────────────────────────────────────────
        if graph_b64:
            story.append(Spacer(1, 6 * mm))
            story.append(Paragraph("VISUALIZATION", styles["section_header"]))
            story += self._embed_graph(graph_b64, styles)

        # ── Build ─────────────────────────────────────────────────────────────
        doc.build(story)
        buf.seek(0)
        return buf.read()

    # ── Method-specific section builders ──────────────────────────────────────

    def _newton_section(self, data: dict, styles: dict) -> list:
        elems = []
        elems.append(Paragraph("COMPUTATION RESULTS", styles["section_header"]))

        root = data.get("root")
        converged = data.get("converged", False)
        n_iter = data.get("iterations", 0)
        func_str = data.get("function_str", "—")
        note = data.get("note", "")

        # Stats row
        stats_data = [[
            StatBox("Root Found", f"{root:.8f}" if root is not None else "N/A"),
            StatBox("Converged", "Yes ✓" if converged else "No ✗"),
            StatBox("Iterations", str(n_iter)),
        ]]
        stats_tbl = Table(stats_data, colWidths=[52 * mm, 52 * mm, 52 * mm])
        stats_tbl.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elems.append(stats_tbl)
        elems.append(Spacer(1, 4 * mm))

        elems.append(Paragraph(f"<b>Function:</b>  f(x) = {func_str}", styles["body"]))
        if note:
            elems.append(Paragraph(f"ℹ  {note}", styles["note"]))
        elems.append(Spacer(1, 6 * mm))

        # Iteration table
        table_data = data.get("iteration_table", [])
        if table_data:
            elems.append(Paragraph("ITERATION TABLE", styles["section_header"]))
            headers = ["Iter", "xₙ", "f(xₙ)", "f′(xₙ)", "x_(n+1)", "|Error|"]
            rows = [headers]
            for row in table_data[:50]:  # Cap at 50 rows for readability
                rows.append([
                    str(row["iteration"]),
                    f"{row['x']:.6f}",
                    f"{row['fx']:.6e}",
                    f"{row['fpx']:.6e}",
                    f"{row['x_new']:.6f}",
                    f"{row['error']:.6e}",
                ])
            tbl = Table(rows, repeatRows=1)
            tbl.setStyle(_build_table_style(len(rows) - 1))
            elems.append(tbl)
            if len(table_data) > 50:
                elems.append(Paragraph(
                    f"… {len(table_data) - 50} additional rows omitted for brevity.",
                    styles["note"]
                ))

        return elems

    def _lagrange_section(self, data: dict, styles: dict) -> list:
        elems = []
        elems.append(Paragraph("COMPUTATION RESULTS", styles["section_header"]))

        interp_val = data.get("interpolated_value")
        x_target = data.get("x_target")
        degree = data.get("degree", "—")
        n_pts = data.get("num_points", "—")

        # Stats
        stats_data = [[
            StatBox("Interpolated Value", f"{interp_val:.8f}" if interp_val is not None else "—"),
            StatBox("At x =", f"{x_target}"),
            StatBox("Polynomial Degree", str(degree)),
            StatBox("Data Points Used", str(n_pts)),
        ]]
        stats_tbl = Table(stats_data, colWidths=[40 * mm, 40 * mm, 40 * mm, 40 * mm])
        stats_tbl.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elems.append(stats_tbl)
        elems.append(Spacer(1, 6 * mm))

        # Basis polynomials table
        basis = data.get("basis_polynomials", [])
        if basis:
            elems.append(Paragraph("BASIS POLYNOMIALS", styles["section_header"]))
            headers = ["i", "xᵢ", "yᵢ", "Lᵢ(x_target)", "Denominator"]
            rows = [headers]
            for b in basis:
                rows.append([
                    str(b["index"]),
                    f"{b['x_i']}",
                    f"{b['y_i']}",
                    f"{b['value_at_target']:.6f}",
                    f"{b['denominator']:.6f}",
                ])
            tbl = Table(rows, repeatRows=1)
            tbl.setStyle(_build_table_style(len(rows) - 1))
            elems.append(tbl)

        # Data points table
        x_pts = data.get("x_points", [])
        y_pts = data.get("y_points", [])
        if x_pts:
            elems.append(Spacer(1, 4 * mm))
            elems.append(Paragraph("INPUT DATA POINTS", styles["section_header"]))
            headers = ["Point #", "x", "y"]
            rows = [headers] + [[str(i), str(x), str(y)] for i, (x, y) in enumerate(zip(x_pts, y_pts))]
            tbl = Table(rows, colWidths=[30 * mm, 75 * mm, 75 * mm], repeatRows=1)
            tbl.setStyle(_build_table_style(len(rows) - 1))
            elems.append(tbl)

        return elems

    def _rk4_section(self, data: dict, styles: dict) -> list:
        elems = []
        elems.append(Paragraph("COMPUTATION RESULTS", styles["section_header"]))

        y_final = data.get("y_final")
        x_end   = data.get("x_end")
        x0      = data.get("x0")
        y0      = data.get("y0")
        n_steps = data.get("step_count", "—")
        func_str = data.get("function_str", "—")

        # Stats
        stats_data = [[
            StatBox("y(x_end)", f"{y_final:.8f}" if y_final is not None else "—"),
            StatBox("x_end", f"{x_end}"),
            StatBox("Steps Taken", str(n_steps)),
        ]]
        stats_tbl = Table(stats_data, colWidths=[52 * mm, 52 * mm, 52 * mm])
        stats_tbl.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elems.append(stats_tbl)
        elems.append(Spacer(1, 4 * mm))
        elems.append(Paragraph(
            f"<b>ODE:</b>  dy/dx = {func_str}   |   <b>IC:</b>  y({x0}) = {y0}",
            styles["body"]
        ))
        elems.append(Spacer(1, 6 * mm))

        # Step table (first 50)
        steps = data.get("steps", [])
        if steps:
            elems.append(Paragraph("STEP TABLE", styles["section_header"]))
            headers = ["Step", "x", "y", "k₁", "k₂", "k₃", "k₄", "y_new"]
            rows = [headers]
            for s in steps[:50]:
                rows.append([
                    str(s["step"]),
                    f"{s['x']:.5f}",
                    f"{s['y']:.6f}",
                    f"{s['k1']:.6f}",
                    f"{s['k2']:.6f}",
                    f"{s['k3']:.6f}",
                    f"{s['k4']:.6f}",
                    f"{s['y_new']:.6f}",
                ])
            col_w = (W - 40 * mm) / 8
            tbl = Table(rows, colWidths=[col_w] * 8, repeatRows=1)
            tbl.setStyle(_build_table_style(len(rows) - 1))
            elems.append(tbl)
            if len(steps) > 50:
                elems.append(Paragraph(
                    f"… {len(steps) - 50} additional steps omitted for brevity.",
                    styles["note"]
                ))

        return elems

    # ── Graph embed helper ─────────────────────────────────────────────────────

    def _embed_graph(self, graph_b64: str, styles: dict) -> list:
        """Decode base64 graph PNG and embed as image, preserving aspect ratio."""
        elems = []
        try:
            # Strip data-URL prefix if present
            if "," in graph_b64:
                graph_b64 = graph_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(graph_b64)
            img_buf = io.BytesIO(img_bytes)
            max_w = W - 40 * mm
            max_h = 90 * mm
            img = Image(img_buf, width=max_w, height=max_h, kind="proportional")
            elems.append(img)
            elems.append(Spacer(1, 2 * mm))
            elems.append(Paragraph(
                "Figure: Graph generated from computation results.", styles["caption"]
            ))
        except Exception as exc:
            elems.append(Paragraph(f"[Graph could not be embedded: {exc}]", styles["note"]))
        return elems
