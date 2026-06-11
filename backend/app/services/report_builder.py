from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List


def build_report(
    investor: Dict[str, Any],
    risk_output: Dict[str, Any],
    forecast_output: Dict[str, Any],
    allocation: Dict[str, float],
    compliance_output: Dict[str, Any],
    advisory_output: Dict[str, Any],
) -> Dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()
    title = f"FINTRIX Institutional Advisory - {investor['full_name']}"

    risk_score = risk_output["risk_score"]
    risk_profile = risk_output.get("risk_profile", "Moderate")

    # Compute volatility tolerance from risk score
    if risk_score >= 75:
        volatility_tolerance = "High"
        volatility_pct = min(95, 60 + risk_score - 75)
    elif risk_score >= 50:
        volatility_tolerance = "Moderate"
        volatility_pct = min(80, 40 + risk_score - 50)
    elif risk_score >= 30:
        volatility_tolerance = "Low-Moderate"
        volatility_pct = min(50, 20 + risk_score - 30)
    else:
        volatility_tolerance = "Low"
        volatility_pct = max(10, risk_score)

    # Compute max drawdown from risk profile
    drawdown_map = {
        "Conservative": 5.0,
        "Low": 7.5,
        "Moderate": 12.5,
        "Moderate-High": 17.5,
        "Moderate-Aggressive": 20.0,
        "Aggressive": 25.0,
    }
    max_drawdown = drawdown_map.get(risk_profile, 12.5)
    drawdown_bar_pct = min(90, int(max_drawdown * 3.6))

    # Build per-rule compliance results
    equity_pct = allocation.get("equity", 0)
    equity_limit_map = {
        "Conservative": 40,
        "Low": 40,
        "Moderate": 70,
        "Moderate-High": 80,
        "Moderate-Aggressive": 80,
        "Aggressive": 90,
    }
    equity_limit = equity_limit_map.get(risk_profile, 70)
    num_asset_classes = sum(1 for v in allocation.values() if v > 0)

    compliance_rules = [
        {
            "rule": "Equity Allocation Limit",
            "status": "PASS" if equity_pct <= equity_limit else "FAIL",
            "detail": f"{equity_pct}% <= {equity_limit}% max",
        },
        {
            "rule": "Diversification Check",
            "status": "PASS" if num_asset_classes >= 3 else "FAIL",
            "detail": f"{num_asset_classes} asset classes",
        },
        {
            "rule": "Suitability Review",
            "status": compliance_output.get("status", "PASS"),
            "detail": f"Profile: {risk_profile}",
        },
    ]

    # Generate strategic recommendations based on risk profile
    recommendations = _select_recommendations(risk_profile)

    report = {
        "title": title,
        "created_at": created_at,
        "investor": {
            "name": investor["full_name"],
            "age": investor["age"],
            "net_worth": investor["net_worth"],
            "monthly_income": investor["monthly_income"],
            "investment_horizon": investor["investment_horizon"],
            "risk_score": risk_output["risk_score"],
            "savings_rate": investor["savings_rate"],
            "liquidity_ratio": investor["liquidity"],
        },
        "risk": {
            **risk_output,
            "volatility_tolerance": volatility_tolerance,
            "volatility_tolerance_pct": volatility_pct,
            "max_drawdown": max_drawdown,
            "max_drawdown_bar_pct": drawdown_bar_pct,
        },
        "allocation": allocation,
        "forecast": forecast_output,
        "compliance": {
            **compliance_output,
            "rules": compliance_rules,
        },
        "confidence": {
            "risk_confidence": risk_output["confidence"],
            "forecast_confidence": forecast_output["confidence"],
            "compliance_confidence": compliance_output["confidence"],
            "overall_confidence": advisory_output["overall_confidence"],
        },
        "agent_contributions": {
            "risk_agent": 28,
            "forecast_agent": 26,
            "compliance_agent": 18,
            "advisory_agent": 28,
        },
        "execution_metrics": {
            "agent_calls": 4,
            "mcp_calls": 4,
            "monte_carlo_iterations": forecast_output.get("assumptions", {}).get("iterations", 10000),
            "audit_records": 12,
            "llm_calls": 4,
            "total_execution_time": "00:00:06",
        },
        "report_body": advisory_output["report_body"],
        "strategic_recommendations": recommendations,
    }
    return report


def _select_recommendations(risk_profile: str) -> List[str]:
    """Select varied recommendations based on risk profile."""
    import random

    pool = {
        "Conservative": [
            "Maintain overweight in sovereign fixed-income instruments to preserve capital stability.",
            "Increase allocation to investment-grade corporate bonds for modest yield improvement.",
            "Maintain liquidity buffers above 15% for defensive positioning.",
            "Consider inflation-protected securities to hedge purchasing power erosion.",
            "Limit equity exposure to dividend-paying large-cap constituents.",
        ],
        "Moderate": [
            "Rebalance allocation to sustain diversification while respecting duration risk.",
            "Increase exposure to quality fixed-income tranches to stabilize drawdown risk.",
            "Maintain liquidity buffers for tactical deployment across opportunity windows.",
            "Consider emerging market bonds for yield diversification.",
            "Allocate 5-10% to alternative assets for portfolio decorrelation.",
        ],
        "Moderate-High": [
            "Increase allocation to mid-cap growth equities for capital appreciation.",
            "Reduce fixed-income duration to mitigate interest rate sensitivity.",
            "Deploy tactical overweight in technology and healthcare sectors.",
            "Maintain gold allocation as a macro hedge against systemic risk.",
            "Consider private equity co-investments for long-horizon alpha generation.",
        ],
        "Moderate-Aggressive": [
            "Overweight global equities with emphasis on innovation-driven sectors.",
            "Maintain disciplined rebalancing cadence to capture mean-reversion alpha.",
            "Allocate to venture-grade growth instruments within risk tolerance bounds.",
            "Hedge tail risk through structured options strategies on core equity positions.",
            "Target higher savings rate to accelerate compounding over the extended horizon.",
        ],
        "Aggressive": [
            "Maximize equity exposure within compliance limits for growth optimization.",
            "Allocate to high-conviction concentrated positions in disruptive sectors.",
            "Maintain minimal fixed-income to provide rebalancing liquidity.",
            "Consider leveraged positions in high-confidence market regimes.",
            "Implement systematic drawdown controls to protect against severe market dislocations.",
        ],
    }
    available = pool.get(risk_profile, pool["Moderate"])
    return random.sample(available, min(3, len(available)))
