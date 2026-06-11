from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict

import numpy as np


@dataclass
class ToolResult:
    name: str
    input_data: Dict
    output_data: Dict


def risk_score_tool(age: int, income: float, monthly_investment: float, investment_horizon: int) -> ToolResult:
    age_score = max(0, 100 - age)
    income_score = min(100, math.log10(max(10000, income)) * 10)
    horizon_score = min(100, investment_horizon * 4)
    contribution_score = min(100, monthly_investment / 1000)

    risk_score = int(round((age_score * 0.3) + (income_score * 0.2) + (horizon_score * 0.3) + (contribution_score * 0.2)))
    risk_score = max(0, min(100, risk_score))

    return ToolResult(
        name="risk_score_tool",
        input_data={
            "age": age,
            "income": income,
            "monthly_investment": monthly_investment,
            "investment_horizon": investment_horizon,
        },
        output_data={"risk_score": risk_score},
    )


def monte_carlo_simulation_tool(expected_return: float, volatility: float, years: int, iterations: int = 10000) -> ToolResult:
    np.random.seed(42)
    dt = 1
    results = []
    for _ in range(iterations):
        growth = np.random.normal((expected_return), volatility, years)
        results.append(float(np.prod(1 + growth) ** (1 / years) - 1))

    p10 = float(np.percentile(results, 10) * 100)
    p50 = float(np.percentile(results, 50) * 100)
    p90 = float(np.percentile(results, 90) * 100)

    return ToolResult(
        name="monte_carlo_simulation_tool",
        input_data={
            "expected_return": expected_return,
            "volatility": volatility,
            "years": years,
            "iterations": iterations,
        },
        output_data={"p10": round(p10, 1), "p50": round(p50, 1), "p90": round(p90, 1)},
    )


def portfolio_optimizer_tool(risk_profile: str) -> ToolResult:
    mapping = {
        "Conservative": {"equity": 30, "debt": 60, "gold": 10},
        "Moderate": {"equity": 60, "debt": 30, "gold": 10},
        "Aggressive": {"equity": 80, "debt": 15, "gold": 5},
        "Moderate-Aggressive": {"equity": 70, "debt": 20, "gold": 10},
        "Moderate-High": {"equity": 65, "debt": 25, "gold": 10},
        "Low": {"equity": 35, "debt": 55, "gold": 10},
    }
    allocation = mapping.get(risk_profile, mapping["Moderate"])

    return ToolResult(
        name="portfolio_optimizer_tool",
        input_data={"risk_profile": risk_profile},
        output_data=allocation,
    )


def compliance_validation_tool(risk_profile: str, allocation: Dict[str, float]) -> ToolResult:
    rules = {
        "Conservative": 40,
        "Moderate": 70,
        "Aggressive": 90,
        "Moderate-Aggressive": 80,
        "Moderate-High": 80,
        "Low": 40,
    }
    equity_limit = rules.get(risk_profile, 70)
    equity_pct = allocation.get("equity", 0)

    status = "PASS" if equity_pct <= equity_limit else "FAIL"
    violations = [] if status == "PASS" else [f"Equity allocation exceeds {equity_limit}%"]

    return ToolResult(
        name="compliance_validation_tool",
        input_data={"risk_profile": risk_profile, "allocation": allocation},
        output_data={"status": status, "violations": violations, "equity_limit": equity_limit},
    )
