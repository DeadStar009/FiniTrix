import type {
  AnalysisStartResponse,
  AnalysisRunSummary,
  AuditLogEntry,
  EventMessage,
  InvestorDetail,
  InvestorListResponse,
  AgentMessageLog,
  LlmCallLog,
  ReportDetail,
  ReportSummary,
  ToolInvocationLog,
} from "./types";

const API_BASE = "http://127.0.0.1:8000";

export async function fetchInvestors(query?: string): Promise<InvestorListResponse> {
  const url = new URL(`${API_BASE}/api/investors`);
  if (query) {
    url.searchParams.set("query", query);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load investors");
  return res.json();
}

export async function fetchInvestor(id: number): Promise<InvestorDetail> {
  const res = await fetch(`${API_BASE}/api/investors/${id}`);
  if (!res.ok) throw new Error("Failed to load investor");
  return res.json();
}

export async function startAnalysis(investorId: number): Promise<AnalysisStartResponse> {
  const res = await fetch(`${API_BASE}/analysis/start?investor_id=${investorId}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to start analysis");
  return res.json();
}

export function subscribeToEvents(analysisId: string, onMessage: (event: EventMessage) => void): EventSource {
  const source = new EventSource(`${API_BASE}/analysis/${analysisId}/events`);
  source.onmessage = (event) => {
    const data = JSON.parse(event.data) as EventMessage;
    onMessage(data);
  };
  return source;
}

export async function fetchReports(): Promise<ReportSummary[]> {
  const res = await fetch(`${API_BASE}/api/reports`);
  if (!res.ok) throw new Error("Failed to load reports");
  return res.json();
}

export async function fetchReport(reportId: string): Promise<ReportDetail> {
  const res = await fetch(`${API_BASE}/api/reports/${reportId}`);
  if (!res.ok) throw new Error("Failed to load report");
  return res.json();
}

export async function fetchAnalysisRuns(): Promise<AnalysisRunSummary[]> {
  const res = await fetch(`${API_BASE}/api/analysis-runs`);
  if (!res.ok) throw new Error("Failed to load analysis runs");
  return res.json();
}

export async function fetchAuditLogs(analysisId?: string): Promise<AuditLogEntry[]> {
  const url = new URL(`${API_BASE}/api/audit-logs`);
  if (analysisId) url.searchParams.set("analysis_id", analysisId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load audit logs");
  return res.json();
}

export async function fetchAgentMessages(analysisId?: string): Promise<AgentMessageLog[]> {
  const url = new URL(`${API_BASE}/api/agent-messages`);
  if (analysisId) url.searchParams.set("analysis_id", analysisId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load agent messages");
  return res.json();
}

export async function fetchToolInvocations(analysisId?: string): Promise<ToolInvocationLog[]> {
  const url = new URL(`${API_BASE}/api/tool-invocations`);
  if (analysisId) url.searchParams.set("analysis_id", analysisId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load tool invocations");
  return res.json();
}

export async function fetchLlmCalls(analysisId?: string): Promise<LlmCallLog[]> {
  const url = new URL(`${API_BASE}/api/llm-calls`);
  if (analysisId) url.searchParams.set("analysis_id", analysisId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load llm calls");
  return res.json();
}
