"""
Math Utilities — Safe Expression Evaluators
Uses sympy for symbolic differentiation, math for evaluation.
"""

import math
from typing import Optional

# ── Safe math namespace ───────────────────────────────────────────────────────
# Exposed names for eval(); everything else is blocked.
SAFE_MATH_NAMESPACE = {
    "__builtins__": {},
    "abs":   abs,
    "round": round,
    "sin":   math.sin,
    "cos":   math.cos,
    "tan":   math.tan,
    "asin":  math.asin,
    "acos":  math.acos,
    "atan":  math.atan,
    "exp":   math.exp,
    "log":   math.log,
    "log10": math.log10,
    "log2":  math.log2,
    "sqrt":  math.sqrt,
    "pi":    math.pi,
    "e":     math.e,
    "inf":   math.inf,
    "ceil":  math.ceil,
    "floor": math.floor,
}


def safe_eval_function(func_str: str, x: float) -> float:
    """
    Safely evaluate f(x) = <func_str> at x.
    Raises ValueError if evaluation fails.
    """
    try:
        ns = dict(SAFE_MATH_NAMESPACE)
        ns["x"] = x
        return float(eval(func_str, ns))  # noqa: S307
    except Exception as exc:
        raise ValueError(f"Cannot evaluate f(x) at x={x}: {exc}") from exc


def safe_eval_derivative(func_str: str, x: float, h: float = 1e-7) -> Optional[float]:
    """
    Numerically approximate f'(x) using central differences.
    Returns None if the computation is unreliable.
    """
    try:
        fxph = safe_eval_function(func_str, x + h)
        fxmh = safe_eval_function(func_str, x - h)
        return (fxph - fxmh) / (2 * h)
    except Exception:
        return None


def safe_eval_ode_function(func_str: str, x: float, y: float) -> float:
    """
    Safely evaluate f(x, y) = <func_str> for ODE solvers.
    The function string may use both x and y variables.
    Raises ValueError if evaluation fails.
    """
    try:
        ns = dict(SAFE_MATH_NAMESPACE)
        ns["x"] = x
        ns["y"] = y
        return float(eval(func_str, ns))  # noqa: S307
    except Exception as exc:
        raise ValueError(f"Cannot evaluate f(x,y) at x={x}, y={y}: {exc}") from exc
