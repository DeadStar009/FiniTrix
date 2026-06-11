from __future__ import annotations

import json
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from faker import Faker

from ..database import get_connection
from .report_builder import build_report
from .tools import portfolio_optimizer_tool, monte_carlo_simulation_tool

fake = Faker()

HERO_PROFILES = [
    {"full_name": "Sarah Chen", "profile_category": "Young Professional", "risk_category": "Moderate-Aggressive"},
    {"full_name": "Raj Patel", "profile_category": "Growth Investor", "risk_category": "Moderate"},
    {"full_name": "Michael Johnson", "profile_category": "Retiree", "risk_category": "Conservative"},
    {"full_name": "Emily Brown", "profile_category": "Entrepreneur", "risk_category": "Aggressive"},
    {"full_name": "David Wilson", "profile_category": "High-Net-Worth Executive", "risk_category": "Moderate-High"},
    {"full_name": "Priya Sharma", "profile_category": "Tech Lead", "risk_category": "Moderate-High"},
    {"full_name": "James Carter", "profile_category": "Business Owner", "risk_category": "Aggressive"},
    {"full_name": "Linda Martinez", "profile_category": "Retirement Planner", "risk_category": "Conservative"},
]

PROFILE_TEMPLATES = [
    ("Young Professional", "Moderate"),
    ("Young Professional", "Moderate-High"),
    ("Mid-Career Investor", "Moderate"),
    ("Entrepreneur", "Aggressive"),
    ("Retiree", "Conservative"),
    ("High-Net-Worth Individual", "Moderate-High"),
]

GOAL_POOL = [
    {"title": "Retirement Capital", "category": "retirement"},
    {"title": "Children's Education Fund", "category": "education"},
    {"title": "Real Estate Acquisition", "category": "real_estate"},
    {"title": "Emergency Reserve", "category": "emergency"},
    {"title": "Wealth Preservation", "category": "preservation"},
    {"title": "Business Expansion Capital", "category": "business"},
    {"title": "Early Retirement", "category": "retirement"},
    {"title": "Legacy & Estate Planning", "category": "estate"},
    {"title": "Travel & Lifestyle Fund", "category": "lifestyle"},
    {"title": "Healthcare Reserve", "category": "healthcare"},
    {"title": "Passive Income Portfolio", "category": "income"},
    {"title": "Startup Investment Fund", "category": "business"},
]

ASSUMPTIONS_MAP = {
    "Conservative": {"return": 0.08, "volatility": 0.10},
    "Moderate": {"return": 0.12, "volatility": 0.18},
    "Aggressive": {"return": 0.15, "volatility": 0.25},
    "Moderate-Aggressive": {"return": 0.13, "volatility": 0.20},
    "Moderate-High": {"return": 0.12, "volatility": 0.18},
    "Low": {"return": 0.09, "volatility": 0.12},
}

RECOMMENDATION_POOL = {
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


def seed_if_empty() -> None:
    with get_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM investors").fetchone()[0]
    if count == 0:
        seed_investors(100)
        seed_reports(10)


def seed_investors(target_count: int) -> None:
    investors = []
    now = datetime.now(timezone.utc)
    for hero in HERO_PROFILES:
        investors.append(_generate_investor(hero, now))

    remaining = max(0, target_count - len(investors))
    for _ in range(remaining):
        category, risk = random.choice(PROFILE_TEMPLATES)
        investors.append(
            _generate_investor(
                {
                    "full_name": fake.name(),
                    "profile_category": category,
                    "risk_category": risk,
                },
                now,
            )
        )

    with get_connection() as conn:
        conn.executemany(
            """
            INSERT INTO investors (
                full_name, profile_category, risk_category, age, employment,
                monthly_investment, investment_horizon, net_worth, liquidity,
                monthly_income, savings_rate, marital_status, financial_goals,
                last_report_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    item["full_name"],
                    item["profile_category"],
                    item["risk_category"],
                    item["age"],
                    item["employment"],
                    item["monthly_investment"],
                    item["investment_horizon"],
                    item["net_worth"],
                    item["liquidity"],
                    item["monthly_income"],
                    item["savings_rate"],
                    item["marital_status"],
                    json.dumps(item["financial_goals"]),
                    item["last_report_date"],
                    item["created_at"],
                )
                for item in investors
            ],
        )


def seed_reports(count: int) -> None:
    with get_connection() as conn:
        investors = conn.execute("SELECT * FROM investors LIMIT ?", (count,)).fetchall()

    for investor in investors:
        analysis_id = fake.uuid4()
        report_id = fake.uuid4()
        risk_category = investor["risk_category"]

        # Vary risk score based on category
        risk_ranges = {
            "Conservative": (25, 40),
            "Low": (30, 45),
            "Moderate": (45, 60),
            "Moderate-High": (55, 72),
            "Moderate-Aggressive": (65, 80),
            "Aggressive": (75, 90),
        }
        lo, hi = risk_ranges.get(risk_category, (45, 65))
        risk_score = random.randint(lo, hi)

        risk_output = {"risk_score": risk_score, "risk_profile": risk_category, "confidence": random.randint(78, 92)}

        # Use actual tool for allocation so it matches risk profile
        alloc_result = portfolio_optimizer_tool(risk_category)
        allocation = alloc_result.output_data

        # Compute varied forecast based on risk assumptions
        assumptions = ASSUMPTIONS_MAP.get(risk_category, ASSUMPTIONS_MAP["Moderate"])
        mc_result = monte_carlo_simulation_tool(
            expected_return=assumptions["return"],
            volatility=assumptions["volatility"],
            years=investor["investment_horizon"],
            iterations=10000,
        )
        forecast_output = {
            **mc_result.output_data,
            "confidence": random.randint(72, 88),
            "assumptions": {**assumptions, "iterations": 10000},
        }

        compliance_output = {"status": "PASS", "violations": [], "confidence": 100}
        advisory_output = {"report_body": _placeholder_report(investor["full_name"], risk_category), "overall_confidence": random.randint(80, 92)}
        report = build_report(dict(investor), risk_output, forecast_output, allocation, compliance_output, advisory_output)
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO analysis_runs (id, investor_id, status, started_at, completed_at) VALUES (?, ?, ?, ?, ?)",
                (analysis_id, investor["id"], "COMPLETED", report["created_at"], report["created_at"]),
            )
            conn.execute(
                "INSERT INTO reports (id, analysis_id, investor_id, title, created_at, report_json) VALUES (?, ?, ?, ?, ?, ?)",
                (report_id, analysis_id, investor["id"], report["title"], report["created_at"], json.dumps(report)),
            )


def _generate_investor(base: Dict[str, str], now: datetime) -> Dict[str, object]:
    risk = base["risk_category"]
    category = base["profile_category"]

    # Age ranges based on profile category
    age_ranges = {
        "Young Professional": (22, 35),
        "Mid-Career Investor": (35, 50),
        "Entrepreneur": (28, 55),
        "Retiree": (55, 75),
        "Retirement Planner": (50, 70),
        "High-Net-Worth Individual": (35, 65),
        "High-Net-Worth Executive": (40, 60),
        "Growth Investor": (25, 45),
        "Tech Lead": (26, 40),
        "Business Owner": (30, 55),
    }
    age_lo, age_hi = age_ranges.get(category, (22, 75))
    age = random.randint(age_lo, age_hi)

    investment_horizon = random.randint(5, 30)
    monthly_investment = round(random.uniform(1200, 25000), 2)
    net_worth = round(random.uniform(200000, 20000000), 2)
    liquidity = round(random.uniform(0.08, 0.35), 2)
    monthly_income = round(random.uniform(8000, 65000), 2)
    savings_rate = round(random.uniform(0.12, 0.35), 2)
    last_report_date = (now - timedelta(days=random.randint(10, 120))).date().isoformat()

    marital_status = random.choice(["Single", "Married", "Divorced", "Widowed"])
    # Weighted: older people more likely married
    if age >= 40:
        marital_status = random.choices(["Married", "Single", "Divorced", "Widowed"], weights=[55, 15, 20, 10])[0]
    elif age >= 30:
        marital_status = random.choices(["Married", "Single", "Divorced"], weights=[45, 40, 15])[0]

    # Generate 2-3 varied financial goals
    num_goals = random.randint(2, 3)
    selected_goals = random.sample(GOAL_POOL, num_goals)
    financial_goals = []
    for goal in selected_goals:
        if goal["category"] == "retirement":
            target = net_worth * random.uniform(1.8, 3.0)
            target_year = now.year + investment_horizon
        elif goal["category"] == "real_estate":
            target = random.uniform(300000, 2000000)
            target_year = now.year + random.randint(2, 7)
        elif goal["category"] == "education":
            target = random.uniform(100000, 500000)
            target_year = now.year + random.randint(3, 15)
        elif goal["category"] == "emergency":
            target = monthly_income * random.randint(6, 12)
            target_year = now.year + 1
        elif goal["category"] == "business":
            target = random.uniform(200000, 5000000)
            target_year = now.year + random.randint(2, 8)
        else:
            target = net_worth * random.uniform(0.3, 0.8)
            target_year = now.year + random.randint(3, 15)

        progress = min(95, max(10, int((net_worth / max(target, 1)) * 100 * random.uniform(0.3, 0.7))))
        financial_goals.append({
            "title": goal["title"],
            "category": goal["category"],
            "target": round(target, 2),
            "target_year": target_year,
            "progress": progress,
        })

    return {
        "full_name": base["full_name"],
        "profile_category": base["profile_category"],
        "risk_category": base["risk_category"],
        "age": age,
        "employment": fake.job(),
        "monthly_investment": monthly_investment,
        "investment_horizon": investment_horizon,
        "net_worth": net_worth,
        "liquidity": liquidity,
        "monthly_income": monthly_income,
        "savings_rate": savings_rate,
        "marital_status": marital_status,
        "financial_goals": financial_goals,
        "last_report_date": last_report_date,
        "created_at": now.isoformat(),
    }


def _placeholder_report(name: str, risk_category: str) -> str:
    tone_map = {
        "Conservative": "capital preservation and stability",
        "Moderate": "balanced growth with prudent risk management",
        "Moderate-High": "growth-oriented allocation with measured risk exposure",
        "Moderate-Aggressive": "aggressive growth positioning within disciplined guardrails",
        "Aggressive": "maximum capital appreciation through high-conviction positioning",
    }
    tone = tone_map.get(risk_category, "balanced portfolio management")
    return (
        f"This advisory overview consolidates the latest risk, forecast, and compliance signals for {name}. "
        f"The current strategy prioritizes {tone}. "
        "The portfolio remains aligned to target diversification while maintaining liquidity buffers. "
        "Strategic recommendations focus on disciplined rebalancing, guardrails for drawdown control, and "
        "capital allocation that matches the stated horizon and risk tolerance parameters."
    )
