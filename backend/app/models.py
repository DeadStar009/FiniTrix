from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class InvestorBase(BaseModel):
    id: int
    full_name: str
    profile_category: str
    risk_category: str
    investment_horizon: int
    monthly_investment: float
    net_worth: float
    last_report_date: Optional[str]


class InvestorDetail(InvestorBase):
    age: int
    employment: str
    net_worth: float
    liquidity: float
    monthly_income: float
    savings_rate: float
    marital_status: str
    financial_goals: List[Dict[str, Any]]


class InvestorListResponse(BaseModel):
    total: int
    items: List[InvestorBase]


class AnalysisStartResponse(BaseModel):
    analysis_id: str
    status: str


class ReportSummary(BaseModel):
    id: str
    analysis_id: str
    investor_id: int
    title: str
    created_at: str


class ReportDetail(ReportSummary):
    report_json: Dict[str, Any]


class AnalysisRunSummary(BaseModel):
    id: str
    investor_id: int
    investor_name: str
    status: str
    started_at: str
    completed_at: Optional[str]


class AuditLogEntry(BaseModel):
    id: int
    analysis_id: str
    event_type: str
    payload: Dict[str, Any]
    timestamp: str


class AgentMessageLog(BaseModel):
    id: int
    analysis_id: str
    message_id: str
    sender: str
    receiver: str
    task: str
    payload: Dict[str, Any]
    timestamp: str


class ToolInvocationLog(BaseModel):
    id: int
    analysis_id: str
    tool_name: str
    input_json: Dict[str, Any]
    output_json: Dict[str, Any]
    execution_ms: float
    status: str
    timestamp: str


class LlmCallLog(BaseModel):
    id: int
    analysis_id: str
    model: str
    prompt_tokens: int
    response_tokens: int
    latency_ms: float
    status: str
    timestamp: str


class AgentCard(BaseModel):
    name: str
    description: str
    skills: List[str]


class AgentMessage(BaseModel):
    message_id: str
    sender: str
    receiver: str
    task: str
    payload: Dict[str, Any]
    timestamp: str


class ToolInvocation(BaseModel):
    tool_name: str
    input_json: Dict[str, Any]
    output_json: Dict[str, Any]
    execution_ms: float
    status: str
    timestamp: str


class LlmCall(BaseModel):
    model: str
    prompt_tokens: int
    response_tokens: int
    latency_ms: float
    status: str
    timestamp: str


class EventPayload(BaseModel):
    event_type: str
    payload: Dict[str, Any]
    timestamp: str
