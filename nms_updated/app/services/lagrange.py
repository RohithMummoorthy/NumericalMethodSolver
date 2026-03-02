"""
Lagrange Interpolation Service
Constructs the interpolating polynomial through given data points.
"""

from typing import List


class LagrangeService:
    """
    Performs Lagrange polynomial interpolation and generates
    a smooth curve for visualization.
    """

    def interpolate(
        self,
        x_points: List[float],
        y_points: List[float],
        x_target: float,
        num_curve_points: int = 200,
    ) -> dict:
        """
        Compute the Lagrange interpolated value at x_target.

        Returns
        -------
        dict with:
            interpolated_value : float
            x_points           : list[float]
            y_points           : list[float]
            curve_x            : list[float]  — dense x range for smooth plot
            curve_y            : list[float]  — corresponding interpolated y
            basis_polynomials  : list[dict]   — for explanation/display
            degree             : int
        """
        n = len(x_points)
        interpolated_value = self._lagrange_value(x_points, y_points, x_target)

        # Build dense curve for smooth graph rendering
        x_min = min(x_points)
        x_max = max(x_points)
        padding = (x_max - x_min) * 0.1 or 0.5

        curve_x = [
            x_min - padding + (x_max - x_min + 2 * padding) * i / (num_curve_points - 1)
            for i in range(num_curve_points)
        ]
        curve_y = [round(self._lagrange_value(x_points, y_points, xi), 8) for xi in curve_x]
        curve_x = [round(xi, 8) for xi in curve_x]

        # Build basis polynomial info for the table
        basis_info = []
        for i in range(n):
            numerator_terms = []
            denominator = 1.0
            for j in range(n):
                if j != i:
                    numerator_terms.append(f"(x - {x_points[j]})")
                    denominator *= (x_points[i] - x_points[j])
            basis_info.append({
                "index":       i,
                "x_i":         x_points[i],
                "y_i":         y_points[i],
                "numerator":   " × ".join(numerator_terms),
                "denominator": round(denominator, 8),
                "value_at_target": round(
                    self._basis_value(x_points, i, x_target), 8
                ),
            })

        return {
            "interpolated_value": round(interpolated_value, 10),
            "x_target":           x_target,
            "x_points":           x_points,
            "y_points":           y_points,
            "curve_x":            curve_x,
            "curve_y":            curve_y,
            "degree":             n - 1,
            "basis_polynomials":  basis_info,
            "num_points":         n,
        }

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _lagrange_value(
        x_points: List[float], y_points: List[float], x: float
    ) -> float:
        """Evaluate the Lagrange polynomial at a single x."""
        n = len(x_points)
        result = 0.0
        for i in range(n):
            basis = 1.0
            for j in range(n):
                if j != i:
                    denom = x_points[i] - x_points[j]
                    if abs(denom) < 1e-15:
                        continue
                    basis *= (x - x_points[j]) / denom
            result += y_points[i] * basis
        return result

    @staticmethod
    def _basis_value(
        x_points: List[float], i: int, x: float
    ) -> float:
        """Evaluate the i-th Lagrange basis polynomial at x."""
        n = len(x_points)
        basis = 1.0
        for j in range(n):
            if j != i:
                denom = x_points[i] - x_points[j]
                if abs(denom) < 1e-15:
                    continue
                basis *= (x - x_points[j]) / denom
        return basis
