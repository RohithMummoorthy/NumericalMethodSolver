"""
Runge-Kutta 4th Order (RK4) ODE Solver Service
Numerically integrates dy/dx = f(x, y).
"""

from ..utils.math_utils import safe_eval_ode_function


class RungeKuttaService:
    """
    Implements the classical 4th-order Runge-Kutta method for
    solving initial value problems: dy/dx = f(x, y), y(x0) = y0.
    """

    MAX_STEPS = 5000  # Safety cap to prevent runaway computation

    def solve(
        self,
        func_str: str,
        x0: float,
        y0: float,
        x_end: float,
        h: float,
    ) -> dict:
        """
        Integrate from x0 to x_end with step h.

        Returns
        -------
        dict with:
            y_final     : float
            steps       : list[dict] — full step table
            x_values    : list[float] — for graph
            y_values    : list[float] — for graph
            function_str: str
            step_count  : int
        """
        steps = []
        x_values = [round(x0, 10)]
        y_values = [round(y0, 10)]

        x = float(x0)
        y = float(y0)
        step_num = 0

        while x < x_end - 1e-12:
            if step_num >= self.MAX_STEPS:
                break

            # Clamp final step
            if x + h > x_end:
                h = x_end - x

            k1 = h * safe_eval_ode_function(func_str, x, y)
            k2 = h * safe_eval_ode_function(func_str, x + h / 2, y + k1 / 2)
            k3 = h * safe_eval_ode_function(func_str, x + h / 2, y + k2 / 2)
            k4 = h * safe_eval_ode_function(func_str, x + h, y + k3)

            y_new = y + (k1 + 2 * k2 + 2 * k3 + k4) / 6.0

            steps.append({
                "step":  step_num + 1,
                "x":     round(x, 8),
                "y":     round(y, 8),
                "k1":    round(k1, 8),
                "k2":    round(k2, 8),
                "k3":    round(k3, 8),
                "k4":    round(k4, 8),
                "y_new": round(y_new, 8),
            })

            x = round(x + h, 12)
            y = y_new
            step_num += 1

            x_values.append(round(x, 8))
            y_values.append(round(y, 8))

        return {
            "y_final":     round(y, 10),
            "x_end":       round(x, 10),
            "steps":       steps,
            "x_values":    x_values,
            "y_values":    y_values,
            "function_str":func_str,
            "step_count":  step_num,
            "x0":          x0,
            "y0":          y0,
        }
