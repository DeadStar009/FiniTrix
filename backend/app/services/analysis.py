from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from ..database import get_connection
from .event_stream import EventStream
from .llm_client import call_llm
from .report_builder import build_report
from .tools import (
    ToolResult,
    compliance_validation_tool,
    monte_carlo_simulation_tool,
    portfolio_optimizer_tool,
    risk_score_tool,
)

FAST_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"


class AnalysisService:
    def __init__(self, events: EventStream) -> None:
        self.events = events

    def start_analysis(self, investor: Dict[str, Any]) -> str:
        analysis_id = str(uuid.uuid4())
        now = utc_now()
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO analysis_runs (id, investor_id, status, started_at) VALUES (?, ?, ?, ?)",
                (analysis_id, investor["id"], "RUNNING", now),
            )
        self.events.ensure(analysis_id)
        self._emit(analysis_id, "Analysis Started", {"investor_id": investor["id"]})
        asyncio.create_task(self._run_analysis(analysis_id, investor))
        return analysis_id

    async def _run_analysis(self, analysis_id: str, investor: Dict[str, Any]) -> None:
        try:
            risk_output, risk_profile = await self._run_risk_agent(analysis_id, investor)
            forecast_output = await self._run_forecast_agent(analysis_id, risk_profile, investor)
            allocation = await self._run_advisory_allocator(analysis_id, risk_profile)
            compliance_output = await self._run_compliance_agent(analysis_id, risk_profile, allocation)
            advisory_output = await self._run_advisory_agent(
                analysis_id,
                investor,
                risk_output,
                forecast_output,
                allocation,
                compliance_output,
            )

            report = build_report(
                investor,
                risk_output,
                forecast_output,
                allocation,
                compliance_output,
                advisory_output,
            )
            report_id = str(uuid.uuid4())
            with get_connection() as conn:
                conn.execute(
                    "INSERT INTO reports (id, analysis_id, investor_id, title, created_at, report_json) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        report_id,
                        analysis_id,
                        investor["id"],
                        report["title"],
                        report["created_at"],
                        json.dumps(report),
                    ),
                )
                conn.execute(
                    "UPDATE analysis_runs SET status = ?, completed_at = ? WHERE id = ?",
                    ("COMPLETED", utc_now(), analysis_id),
                )
            self._emit(analysis_id, "Report Generated", {"report_id": report_id})
            self._emit(analysis_id, "Analysis Completed", {"analysis_id": analysis_id})
        except Exception as exc:
            with get_connection() as conn:
                conn.execute(
                    "UPDATE analysis_runs SET status = ?, completed_at = ? WHERE id = ?",
                    ("FAILED", utc_now(), analysis_id),
                )
            self._emit(analysis_id, "Analysis Failed", {"error": str(exc)})

    async def _run_risk_agent(self, analysis_id: str, investor: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
        self._emit(analysis_id, "Risk Agent Started", {})
        message_id = str(uuid.uuid4())
        agent_message = {
            "message_id": message_id,
            "sender": "orchestrator",
            "receiver": "risk_agent",
            "task": "assess_risk",
            "payload": {
                "age": investor["age"],
                "income": investor["monthly_income"],
                "monthly_investment": investor["monthly_investment"],
                "investment_horizon": investor["investment_horizon"],
            },
            "timestamp": utc_now(),
        }
        self._log_agent_message(analysis_id, agent_message)
        self._emit(analysis_id, "A2A Message", agent_message)

        tool_result = risk_score_tool(
            age=investor["age"],
            income=investor["monthly_income"],
            monthly_investment=investor["monthly_investment"],
            investment_horizon=investor["investment_horizon"],
        )
        self._log_tool_invocation(analysis_id, tool_result)
        self._emit(analysis_id, "MCP Tool Called", tool_result.output_data)
        await self._pause()

        risk_score = tool_result.output_data["risk_score"]
        risk_profile = classify_risk(risk_score)
        investor_profile = investor.get("risk_category")
        if investor_profile:
            risk_profile = investor_profile
            low, high = risk_score_range(risk_profile)
            if not (low <= risk_score <= high):
                risk_score = int(round((low + high) / 2))
        prompt = (
            "Provide a concise risk interpretation aligned to the client risk profile. "
            "Do not contradict the stated profile.\n\n"
            f"Risk score: {risk_score}\n"
            f"Risk profile: {risk_profile}\n"
        )
        response, llm_meta = call_llm(prompt)
        self._log_llm_call(analysis_id, llm_meta)
        self._emit(analysis_id, "LLM Call", llm_meta)

        output = {
            "risk_score": risk_score,
            "risk_profile": risk_profile,
            "confidence": 84,
            "reasoning": [response],
        }
        self._emit(analysis_id, "Risk Agent Completed", output)
        return output, risk_profile

    async def _run_forecast_agent(self, analysis_id: str, risk_profile: str, investor: Dict[str, Any]) -> Dict[str, Any]:
        self._emit(analysis_id, "Forecast Agent Started", {})
        message_id = str(uuid.uuid4())
        assumptions = select_assumptions(risk_profile)
        forecast_message = {
            "message_id": message_id,
            "sender": "orchestrator",
            "receiver": "forecast_agent",
            "task": "portfolio_forecast",
            "payload": {
                "expected_return": assumptions["return"],
                "volatility": assumptions["volatility"],
                "years": investor["investment_horizon"],
                "iterations": 10000,
                "risk_profile": risk_profile,
            },
            "timestamp": utc_now(),
        }
        self._log_agent_message(analysis_id, forecast_message)
        self._emit(analysis_id, "A2A Message", forecast_message)
        tool_result = monte_carlo_simulation_tool(
            expected_return=assumptions["return"],
            volatility=assumptions["volatility"],
            years=investor["investment_horizon"],
            iterations=10000,
        )
        self._log_tool_invocation(analysis_id, tool_result)
        self._emit(analysis_id, "Monte Carlo Completed", tool_result.output_data)
        await self._pause()

        prompt = (
            "Summarize the portfolio return forecast using the Monte Carlo outputs below. "
            "Focus on P10, P50, and P90 and keep the tone institutional. "
            "This is a financial forecast, not weather or climate.\n\n"
            f"Risk profile: {risk_profile}\n"
            f"Horizon (years): {investor['investment_horizon']}\n"
            f"Expected return: {assumptions['return']}%\n"
            f"Volatility: {assumptions['volatility']}%\n"
            f"Iterations: {tool_result.output_data.get('assumptions', {}).get('iterations', 10000)}\n"
            f"P10: {tool_result.output_data.get('p10')}%\n"
            f"P50: {tool_result.output_data.get('p50')}%\n"
            f"P90: {tool_result.output_data.get('p90')}%\n"
        )
        response, llm_meta = call_llm(prompt)
        self._log_llm_call(analysis_id, llm_meta)
        self._emit(analysis_id, "LLM Call", llm_meta)

        output = {
            **tool_result.output_data,
            "confidence": 79,
            "assumptions": assumptions,
            "summary": response,
        }
        self._emit(analysis_id, "Forecast Agent Completed", output)
        return output

    async def _run_advisory_allocator(self, analysis_id: str, risk_profile: str) -> Dict[str, float]:
        self._emit(analysis_id, "Advisory Agent Started", {})
        message_id = str(uuid.uuid4())
        allocator_message = {
            "message_id": message_id,
            "sender": "orchestrator",
            "receiver": "allocator_agent",
            "task": "build_allocation",
            "payload": {"risk_profile": risk_profile},
            "timestamp": utc_now(),
        }
        self._log_agent_message(analysis_id, allocator_message)
        self._emit(analysis_id, "A2A Message", allocator_message)
        tool_result = portfolio_optimizer_tool(risk_profile)
        self._log_tool_invocation(analysis_id, tool_result)
        self._emit(analysis_id, "Portfolio Optimizer", tool_result.output_data)
        await self._pause()
        return tool_result.output_data

    async def _run_compliance_agent(self, analysis_id: str, risk_profile: str, allocation: Dict[str, float]) -> Dict[str, Any]:
        self._emit(analysis_id, "Compliance Agent Started", {})
        message_id = str(uuid.uuid4())
        compliance_message = {
            "message_id": message_id,
            "sender": "orchestrator",
            "receiver": "compliance_agent",
            "task": "validate_compliance",
            "payload": {"risk_profile": risk_profile, "allocation": allocation},
            "timestamp": utc_now(),
        }
        self._log_agent_message(analysis_id, compliance_message)
        self._emit(analysis_id, "A2A Message", compliance_message)
        tool_result = compliance_validation_tool(risk_profile, allocation)
        self._log_tool_invocation(analysis_id, tool_result)
        self._emit(analysis_id, "Compliance Tool Called", tool_result.output_data)
        await self._pause()

        prompt = "Explain compliance validation outcome in two sentences with clear justification."
        response, llm_meta = call_llm(prompt)
        self._log_llm_call(analysis_id, llm_meta)
        self._emit(analysis_id, "LLM Call", llm_meta)

        output = {
            **tool_result.output_data,
            "confidence": 100,
            "explanation": response,
        }
        self._emit(analysis_id, "Compliance Agent Completed", output)
        return output

    async def _run_advisory_agent(
        self,
        analysis_id: str,
        investor: Dict[str, Any],
        risk_output: Dict[str, Any],
        forecast_output: Dict[str, Any],
        allocation: Dict[str, float],
        compliance_output: Dict[str, Any],
    ) -> Dict[str, Any]:
        message_id = str(uuid.uuid4())
        advisory_message = {
            "message_id": message_id,
            "sender": "orchestrator",
            "receiver": "advisory_agent",
            "task": "generate_advisory_report",
            "payload": {
                "investor": {
                    "name": investor.get("full_name"),
                    "horizon": investor.get("investment_horizon"),
                },
                "risk": risk_output,
                "forecast": {
                    "p10": forecast_output.get("p10"),
                    "p50": forecast_output.get("p50"),
                    "p90": forecast_output.get("p90"),
                    "assumptions": forecast_output.get("assumptions"),
                },
                "allocation": allocation,
                "compliance": compliance_output,
            },
            "timestamp": utc_now(),
        }
        self._log_agent_message(analysis_id, advisory_message)
        self._emit(analysis_id, "A2A Message", advisory_message)
        investor_name = investor.get("full_name", "the investor")
        net_worth = investor.get("net_worth", 0)
        liquidity_ratio = investor.get("liquidity", 0)
        liquidity_amount = round(net_worth * liquidity_ratio, 2)
        monthly_income = investor.get("monthly_income", 0)
        annual_income = round(monthly_income * 12, 2)
        goals = investor.get("financial_goals", [])
        if isinstance(goals, str):
            try:
                goals = json.loads(goals)
            except json.JSONDecodeError:
                goals = []
        if not isinstance(goals, list):
            goals = []
        goals_lines = "\n".join(
            f"- {goal.get('title')}: target ${goal.get('target')} by {goal.get('target_year')}, progress {goal.get('progress')}%"
            for goal in goals
        )
        prompt = (
            "Generate a formal personal wealth advisory report (700+ words). "
            "Use ONLY the data provided below. Do not introduce corporate KPIs, "
            "regulatory frameworks (GDPR/HIPAA/OSHA/PCI), or placeholders like [industry]. "
            "Focus on asset allocation, risk alignment, liquidity, savings rate, goal progress, "
            "and investment horizon. Provide clear, actionable recommendations tied to the data. "
            "Do not infer additional calculations beyond the provided values.\n\n"
            f"Client: {investor_name}\n"
            f"Age: {investor.get('age')}\n"
            f"Marital status: {investor.get('marital_status')}\n"
            f"Occupation: {investor.get('employment')}\n"
            f"Net worth: ${investor.get('net_worth')}\n"
            f"Liquidity ratio: {liquidity_ratio}\n"
            f"Liquidity amount: ${liquidity_amount}\n"
            f"Monthly income: ${monthly_income}\n"
            f"Annual income: ${annual_income}\n"
            f"Savings rate: {investor.get('savings_rate')}\n"
            f"Investment horizon (years): {investor.get('investment_horizon')}\n\n"
            f"Risk score: {risk_output.get('risk_score')}\n"
            f"Risk profile: {risk_output.get('risk_profile')}\n\n"
            "Strategic allocation (%):\n"
            f"- Equity: {allocation.get('equity')}\n"
            f"- Fixed income: {allocation.get('debt')}\n"
            f"- Gold/commodities: {allocation.get('gold')}\n\n"
            "Forecast (annualized returns, %):\n"
            f"- P10: {forecast_output.get('p10')}\n"
            f"- P50: {forecast_output.get('p50')}\n"
            f"- P90: {forecast_output.get('p90')}\n\n"
            "Compliance summary:\n"
            f"- Status: {compliance_output.get('status')}\n"
            f"- Violations: {compliance_output.get('violations')}\n"
            "\nGoals:\n"
            f"{goals_lines}\n"
        )
        context = {
            "investor_name": investor_name,
            "risk_profile": risk_output.get("risk_profile", "Moderate"),
            "horizon": investor.get("investment_horizon", 10),
        }
        response, llm_meta = call_llm(prompt, context)
        self._log_llm_call(analysis_id, llm_meta)
        self._emit(analysis_id, "LLM Call", llm_meta)
        output = {
            "report_body": response,
            "overall_confidence": 87,
        }
        self._emit(analysis_id, "Advisory Agent Completed", output)
        return output

    def _emit(self, analysis_id: str, event_type: str, payload: Dict[str, Any]) -> None:
        event = {"event_type": event_type, "payload": payload, "timestamp": utc_now()}
        self._log_audit_event(analysis_id, event)
        self.events.add(analysis_id, event)

    def _log_audit_event(self, analysis_id: str, event: Dict[str, Any]) -> None:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO audit_logs (analysis_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?)",
                (analysis_id, event["event_type"], json.dumps(event["payload"]), event["timestamp"]),
            )

    def _log_agent_message(self, analysis_id: str, message: Dict[str, Any]) -> None:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO agent_messages (analysis_id, message_id, sender, receiver, task, payload, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    analysis_id,
                    message["message_id"],
                    message["sender"],
                    message["receiver"],
                    message["task"],
                    json.dumps(message["payload"]),
                    message["timestamp"],
                ),
            )

    def _log_tool_invocation(self, analysis_id: str, tool_result: ToolResult) -> None:
        start = time.perf_counter()
        elapsed_ms = (time.perf_counter() - start) * 1000
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO tool_invocations (analysis_id, tool_name, input_json, output_json, execution_ms, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    analysis_id,
                    tool_result.name,
                    json.dumps(tool_result.input_data),
                    json.dumps(tool_result.output_data),
                    elapsed_ms,
                    "ok",
                    utc_now(),
                ),
            )

    def _log_llm_call(self, analysis_id: str, meta: Dict[str, Any]) -> None:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO llm_calls (analysis_id, model, prompt_tokens, response_tokens, latency_ms, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    analysis_id,
                    meta["model"],
                    meta["prompt_tokens"],
                    meta["response_tokens"],
                    meta["latency_ms"],
                    meta["status"],
                    utc_now(),
                ),
            )

    async def _pause(self) -> None:
        delay = 0.2 if FAST_MODE else 0.8
        await asyncio.sleep(delay)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def classify_risk(score: int) -> str:
    if score >= 75:
        return "Moderate-Aggressive"
    if score >= 60:
        return "Moderate-High"
    if score >= 45:
        return "Moderate"
    if score >= 30:
        return "Low"
    return "Conservative"


def select_assumptions(risk_profile: str) -> Dict[str, float]:
    mapping = {
        "Conservative": {"return": 0.08, "volatility": 0.10},
        "Moderate": {"return": 0.12, "volatility": 0.18},
        "Aggressive": {"return": 0.15, "volatility": 0.25},
        "Moderate-Aggressive": {"return": 0.13, "volatility": 0.20},
        "Moderate-High": {"return": 0.12, "volatility": 0.18},
        "Low": {"return": 0.09, "volatility": 0.12},
    }
    return mapping.get(risk_profile, mapping["Moderate"])


def risk_score_range(risk_profile: str) -> Tuple[int, int]:
    ranges = {
        "Conservative": (25, 40),
        "Low": (30, 45),
        "Moderate": (45, 60),
        "Moderate-High": (55, 72),
        "Moderate-Aggressive": (65, 80),
        "Aggressive": (75, 90),
    }
    return ranges.get(risk_profile, (45, 65))
