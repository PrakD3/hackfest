"""Confidence scoring for docking results."""


def score_confidence(binding_energy: float, method: str = "ai_fallback") -> tuple[str, float]:
    """Return (label, score) for a docking result."""
    if method == "ai_fallback":
        confidence_score = 0.6
    elif method in ("vina", "gnina"):
        confidence_score = 0.9
    else:
        confidence_score = 0.7

    if binding_energy <= -10:
        label = "Very Strong"
    elif binding_energy <= -8:
        label = "Strong"
    elif binding_energy <= -6:
        label = "Moderate"
    else:
        label = "Weak"

    return label, confidence_score
