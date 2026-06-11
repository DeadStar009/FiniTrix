from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .database import get_connection, init_db
from .models import (
    AgentMessageLog,
    AnalysisRunSummary,
    AuditLogEntry,
    AgentCard,
    AnalysisStartResponse,
    InvestorDetail,
    InvestorListResponse,
    LlmCallLog,
    ReportDetail,
    ReportSummary,
    ToolInvocationLog,
)
from .services.analysis import AnalysisService
from .services.event_stream import EventStream
from .services.seed_data import seed_if_empty

app = FastAPI(title="FINTRIX Advisory Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

event_stream = EventStream()
analysis_service = AnalysisService(event_stream)


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    seed_if_empty()


@app.get("/api/investors", response_model=InvestorListResponse)
async def list_investors(
    query: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> InvestorListResponse:
    with get_connection() as conn:
        if query:
            like = f"%{query}%"
            rows = conn.execute(
                "SELECT * FROM investors WHERE full_name LIKE ? OR profile_category LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (like, like, limit, offset),
            ).fetchall()
            total = conn.execute(
                "SELECT COUNT(*) FROM investors WHERE full_name LIKE ? OR profile_category LIKE ?",
                (like, like),
            ).fetchone()[0]
        else:
            rows = conn.execute(
                "SELECT * FROM investors ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
            total = conn.execute("SELECT COUNT(*) FROM investors").fetchone()[0]

    items = [
        {
            "id": row["id"],
            "full_name": row["full_name"],
            "profile_category": row["profile_category"],
            "risk_category": row["risk_category"],
            "investment_horizon": row["investment_horizon"],
            "monthly_investment": row["monthly_investment"],
            "net_worth": row["net_worth"],
            "last_report_date": row["last_report_date"],
        }
        for row in rows
    ]
    return InvestorListResponse(total=total, items=items)


@app.get("/api/investors/{investor_id}", response_model=InvestorDetail)
async def get_investor(investor_id: int) -> InvestorDetail:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM investors WHERE id = ?", (investor_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Investor not found")
    return InvestorDetail(
        id=row["id"],
        full_name=row["full_name"],
        profile_category=row["profile_category"],
        risk_category=row["risk_category"],
        investment_horizon=row["investment_horizon"],
        monthly_investment=row["monthly_investment"],
        last_report_date=row["last_report_date"],
        age=row["age"],
        employment=row["employment"],
        net_worth=row["net_worth"],
        liquidity=row["liquidity"],
        monthly_income=row["monthly_income"],
        savings_rate=row["savings_rate"],
        marital_status=row["marital_status"],
        financial_goals=json.loads(row["financial_goals"]),
    )


@app.post("/analysis/start", response_model=AnalysisStartResponse)
async def start_analysis(investor_id: int) -> AnalysisStartResponse:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM investors WHERE id = ?", (investor_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Investor not found")
    analysis_id = analysis_service.start_analysis(dict(row))
    return AnalysisStartResponse(analysis_id=analysis_id, status="RUNNING")


@app.get("/analysis/{analysis_id}/events")
async def stream_events(analysis_id: str) -> StreamingResponse:
    async def event_generator() -> Any:
        for buffered in event_stream.get_buffer(analysis_id):
            yield format_sse(buffered)
        async for event in event_stream.stream(analysis_id):
            yield format_sse(event)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/reports", response_model=List[ReportSummary])
async def list_reports(limit: int = Query(20, ge=1, le=100)) -> List[ReportSummary]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, analysis_id, investor_id, title, created_at FROM reports ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [ReportSummary(**dict(row)) for row in rows]


@app.get("/api/reports/{report_id}", response_model=ReportDetail)
async def get_report(report_id: str) -> ReportDetail:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    report = dict(row)
    report["report_json"] = json.loads(report["report_json"])
    return ReportDetail(**report)


@app.get("/api/analysis-runs", response_model=List[AnalysisRunSummary])
async def list_analysis_runs(limit: int = Query(25, ge=1, le=200)) -> List[AnalysisRunSummary]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT analysis_runs.id, analysis_runs.investor_id, investors.full_name AS investor_name,
                   analysis_runs.status, analysis_runs.started_at, analysis_runs.completed_at
            FROM analysis_runs
            JOIN investors ON investors.id = analysis_runs.investor_id
            ORDER BY analysis_runs.started_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [AnalysisRunSummary(**dict(row)) for row in rows]


@app.get("/api/audit-logs", response_model=List[AuditLogEntry])
async def list_audit_logs(
    analysis_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
) -> List[AuditLogEntry]:
    with get_connection() as conn:
        if analysis_id:
            rows = conn.execute(
                "SELECT * FROM audit_logs WHERE analysis_id = ? ORDER BY timestamp DESC LIMIT ?",
                (analysis_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            ).fetchall()
    entries = []
    for row in rows:
        entry = dict(row)
        entry["payload"] = json.loads(entry["payload"])
        entries.append(AuditLogEntry(**entry))
    return entries


@app.get("/api/agent-messages", response_model=List[AgentMessageLog])
async def list_agent_messages(
    analysis_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
) -> List[AgentMessageLog]:
    with get_connection() as conn:
        if analysis_id:
            rows = conn.execute(
                "SELECT * FROM agent_messages WHERE analysis_id = ? ORDER BY timestamp DESC LIMIT ?",
                (analysis_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM agent_messages ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            ).fetchall()
    entries = []
    for row in rows:
        entry = dict(row)
        entry["payload"] = json.loads(entry["payload"])
        entries.append(AgentMessageLog(**entry))
    return entries


@app.get("/api/tool-invocations", response_model=List[ToolInvocationLog])
async def list_tool_invocations(
    analysis_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
) -> List[ToolInvocationLog]:
    with get_connection() as conn:
        if analysis_id:
            rows = conn.execute(
                "SELECT * FROM tool_invocations WHERE analysis_id = ? ORDER BY timestamp DESC LIMIT ?",
                (analysis_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM tool_invocations ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            ).fetchall()
    entries = []
    for row in rows:
        entry = dict(row)
        entry["input_json"] = json.loads(entry["input_json"])
        entry["output_json"] = json.loads(entry["output_json"])
        entries.append(ToolInvocationLog(**entry))
    return entries


@app.get("/api/llm-calls", response_model=List[LlmCallLog])
async def list_llm_calls(
    analysis_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
) -> List[LlmCallLog]:
    with get_connection() as conn:
        if analysis_id:
            rows = conn.execute(
                "SELECT * FROM llm_calls WHERE analysis_id = ? ORDER BY timestamp DESC LIMIT ?",
                (analysis_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM llm_calls ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [LlmCallLog(**dict(row)) for row in rows]


@app.get("/agents/{agent_name}/agent-card", response_model=AgentCard)
async def agent_card(agent_name: str) -> AgentCard:
    cards = {
        "risk_agent": AgentCard(name="risk_agent", description="Investor risk assessment", skills=["assess_risk"]),
        "forecast_agent": AgentCard(name="forecast_agent", description="Scenario forecasting", skills=["forecast"]),
        "compliance_agent": AgentCard(name="compliance_agent", description="Policy validation", skills=["validate"]),
        "advisory_agent": AgentCard(name="advisory_agent", description="Final advisory synthesis", skills=["advise"]),
    }
    if agent_name not in cards:
        raise HTTPException(status_code=404, detail="Agent not found")
    return cards[agent_name]


@app.post("/agents/{agent_name}/task")
async def agent_task(agent_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    return {"status": "accepted", "agent": agent_name, "payload": payload}


def format_sse(event: Dict[str, Any]) -> str:
    return f"event: message\ndata: {json.dumps(event)}\n\n"
