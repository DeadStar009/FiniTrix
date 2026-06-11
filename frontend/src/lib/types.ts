export type InvestorSummary = {
  id: number;
  full_name: string;
  profile_category: string;
  risk_category: string;
  investment_horizon: number;
  monthly_investment: number;
  net_worth: number;
  last_report_date?: string | null;
};

export type FinancialGoal = {
  title: string;
  category: string;
  target: number;
  target_year: number;
  progress: number;
};

export type InvestorDetail = InvestorSummary & {
  age: number;
  employment: string;
  net_worth: number;
  liquidity: number;
  monthly_income: number;
  savings_rate: number;
  marital_status: string;
  financial_goals: FinancialGoal[];
};

export type InvestorListResponse = {
  total: number;
  items: InvestorSummary[];
};

export type AnalysisStartResponse = {
  analysis_id: string;
  status: string;
};

export type ReportSummary = {
  id: string;
  analysis_id: string;
  investor_id: number;
  title: string;
  created_at: string;
};

export type ReportDetail = ReportSummary & {
  report_json: Record<string, any>;
};

export type AnalysisRunSummary = {
  id: string;
  investor_id: number;
  investor_name: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
};

export type AuditLogEntry = {
  id: number;
  analysis_id: string;
  event_type: string;
  payload: Record<string, any>;
  timestamp: string;
};

export type AgentMessageLog = {
  id: number;
  analysis_id: string;
  message_id: string;
  sender: string;
  receiver: string;
  task: string;
  payload: Record<string, any>;
  timestamp: string;
};

export type ToolInvocationLog = {
  id: number;
  analysis_id: string;
  tool_name: string;
  input_json: Record<string, any>;
  output_json: Record<string, any>;
  execution_ms: number;
  status: string;
  timestamp: string;
};

export type LlmCallLog = {
  id: number;
  analysis_id: string;
  model: string;
  prompt_tokens: number;
  response_tokens: number;
  latency_ms: number;
  status: string;
  timestamp: string;
};

export type EventMessage = {
  event_type: string;
  payload: Record<string, any>;
  timestamp: string;
};
