"""
Newton-Raphson Method Service
Solves f(x) = 0 iteratively using the derivative.
"""

import math
from ..utils.math_utils import safe_eval_function, safe_eval_derivative


class NewtonRaphsonService:
    """
    Encapsulates the Newton-Raphson root-finding algorithm.
    Provides full iteration history for frontend visualization.
    """

    def solve(
        self,
        func_str: str,
        x0: float,
        tolerance: float = 1e-7,
        max_iter: int = 100,
    ) -> dict:
        """
        Execute Newton-Raphson iteration.

        Parameters
        ----------
        func_str  : String representation of f(x), e.g. "x**3 - x - 2"
        x0        : Initial guess
        tolerance : Convergence criterion (|x_new - x_old| < tol)
        max_iter  : Maximum number of iterations allowed

        Returns
        -------
        dict with keys:
            root             : float | None
            converged        : bool
            iterations       : int
            iteration_table  : list of dicts
            error_history    : list of floats (for log-error graph)
            function_str     : str
        """
        iterations = []
        error_history = []

        x = float(x0)

        for i in range(1, max_iter + 1):
            fx = safe_eval_function(func_str, x)
            fpx = safe_eval_derivative(func_str, x)

            if fpx is None or abs(fpx) < 1e-15:
                # Derivative too small — division would be unstable
                return self._build_result(
                    func_str, None, False, iterations, error_history,
                    note="Derivative too close to zero. Try a different initial guess."
                )

            x_new = x - fx / fpx
            error = abs(x_new - x)
            rel_error = error / (abs(x_new) + 1e-15)

            iterations.append({
                "iteration": i,
                "x":         round(x, 10),
                "fx":        round(fx, 10),
                "fpx":       round(fpx, 10),
                "x_new":     round(x_new, 10),
                "error":     round(error, 10),
                "rel_error": round(rel_error, 10),
            })

            log_err = math.log10(error) if error > 0 else -15
            error_history.append(round(log_err, 6))

            if error < tolerance:
                return self._build_result(
                    func_str, x_new, True, iterations, error_history,
                    note=f"Converged in {i} iteration(s) to tolerance {tolerance}."
                )

            x = x_new

        return self._build_result(
            func_str, x, False, iterations, error_history,
            note=f"Did not converge within {max_iter} iterations."
        )

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _build_result(
        func_str, root, converged, iterations, error_history, note=""
    ) -> dict:
        return {
            "root":            round(root, 10) if root is not None else None,
            "converged":       converged,
            "iterations":      len(iterations),
            "iteration_table": iterations,
            "error_history":   error_history,
            "function_str":    func_str,
            "note":            note,
        }
