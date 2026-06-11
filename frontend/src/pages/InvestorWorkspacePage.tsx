import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchInvestor, startAnalysis, subscribeToEvents } from "../lib/api";
import type { EventMessage, InvestorDetail } from "../lib/types";

export default function InvestorWorkspacePage() {
  const { id } = useParams();
  const investorId = Number(id);
  const [investor, setInvestor] = useState<InvestorDetail | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventMessage[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [activeMonitorTab, setActiveMonitorTab] = useState<"workflow" | "a2a" | "mcp" | "llm" | "events">("workflow");

  useEffect(() => {
    if (!Number.isFinite(investorId)) return;
    fetchInvestor(investorId).then(setInvestor);
  }, [investorId]);

  useEffect(() => {
    if (!analysisId) return;
    const source = subscribeToEvents(analysisId, (event) => {
      setEvents((prev) => [...prev, event]);
      if (event.event_type === "Report Generated" && event.payload.report_id) {
        setReportId(event.payload.report_id);
      }
    });
    return () => source.close();
  }, [analysisId]);

  const handleStart = async () => {
    if (!investor) return;
    const result = await startAnalysis(investor.id);
    setAnalysisId(result.analysis_id);
    setEvents([]);
    setReportId(null);
    setExpandedEvent(null);
    setActiveMonitorTab("workflow");
  };

  const workflowStatus = useMemo(() => {
    const hasEvent = (name: string) => events.some((e) => e.event_type === name);
    const status = (started: string, completed: string) => {
      if (hasEvent(completed)) return "Completed";
      if (hasEvent(started)) return "Running";
      return "Pending";
    };
    return {
      orchestrator: status("Analysis Started", "Analysis Completed"),
      risk: status("Risk Agent Started", "Risk Agent Completed"),
      forecast: status("Forecast Agent Started", "Forecast Agent Completed"),
      compliance: status("Compliance Agent Started", "Compliance Agent Completed"),
      advisory: status("Advisory Agent Started", "Advisory Agent Completed"),
    };
  }, [events]);

  const workflowNodes = [
    { key: "orchestrator", label: "Orchestrator", subtitle: "Routing Tasks", icon: "hub" },
    { key: "risk", label: "Risk Agent", subtitle: "Risk Assessment", icon: "security" },
    { key: "forecast", label: "Forecast Agent", subtitle: "Running Projections", icon: "insights" },
    { key: "compliance", label: "Compliance Agent", subtitle: "Policy Validation", icon: "gavel" },
    { key: "advisory", label: "Advisory Agent", subtitle: "Advisory Draft", icon: "auto_awesome" },
  ] as const;

  const a2aMessages = useMemo(() => events.filter((e) => e.event_type === "A2A Message"), [events]);
  const mcpCalls = useMemo(() => events.filter((e) => e.event_type.includes("Tool") || e.event_type.includes("Monte Carlo") || e.event_type.includes("Portfolio Optimizer")), [events]);
  const llmCalls = useMemo(() => events.filter((e) => e.event_type === "LLM Call"), [events]);

  const incomeStability = useMemo(() => {
    if (!investor) return "";
    if (investor.monthly_income >= 30000) return "High Stability";
    if (investor.monthly_income >= 15000) return "Moderate Stability";
    return "Stable";
  }, [investor]);

  const savingsTargetMet = useMemo(() => {
    if (!investor) return false;
    return investor.savings_rate >= 0.2;
  }, [investor]);

  if (!investor) {
    return <div className="p-lg">Loading...</div>;
  }

  const goals = investor.financial_goals ?? [];

  return (
    <div className="bg-background text-on-surface overflow-hidden h-screen flex">
      {/* Left sidebar via AppShell-style nav */}
      <aside className="h-screen w-64 flex-shrink-0 bg-surface border-r border-outline-variant flex flex-col py-lg">
        <div className="px-lg mb-xl">
          <h1 className="text-headline-md font-headline-md font-black tracking-tight text-on-surface">FINTRIX</h1>
          <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mt-xs">Enterprise Advisory</p>
        </div>
        <nav className="flex-grow space-y-1">
          <Link className="flex items-center px-lg py-sm text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150" to="/">
            <span className="material-symbols-outlined mr-md">dashboard</span>
            <span className="text-label-caps font-label-caps uppercase">Dashboard</span>
          </Link>
          <Link className="flex items-center px-lg py-sm text-primary font-bold border-r-2 border-primary bg-surface-container-low transition-colors duration-150" to="/investors">
            <span className="material-symbols-outlined mr-md">groups</span>
            <span className="text-label-caps font-label-caps uppercase">Investor Profiles</span>
          </Link>
          <Link className="flex items-center px-lg py-sm text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150" to="/activity">
            <span className="material-symbols-outlined mr-md">monitoring</span>
            <span className="text-label-caps font-label-caps uppercase">Agent Activity</span>
          </Link>
          <Link className="flex items-center px-lg py-sm text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150" to="/reports">
            <span className="material-symbols-outlined mr-md">assessment</span>
            <span className="text-label-caps font-label-caps uppercase">Reports</span>
          </Link>
          <Link className="flex items-center px-lg py-sm text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150" to="/audit">
            <span className="material-symbols-outlined mr-md">history</span>
            <span className="text-label-caps font-label-caps uppercase">Audit Logs</span>
          </Link>
        </nav>
        <div className="px-lg mt-auto pt-lg border-t border-outline-variant">
          <button
            className="w-full bg-primary-container text-on-primary py-md font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-sm"
            onClick={handleStart}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="text-label-caps font-label-caps uppercase">New Analysis</span>
          </button>
          <div className="mt-lg flex items-center gap-md">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden"></div>
            <div>
              <p className="text-body-sm font-bold text-on-surface">FINTRIX Advisory Team</p>
              <p className="text-body-sm text-on-surface-variant">Enterprise Access</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        <header className="h-16 px-lg flex justify-between items-center bg-surface border-b border-outline-variant flex-shrink-0">
          <div className="flex items-center gap-md">
            <Link to="/investors" className="material-symbols-outlined text-on-surface-variant cursor-pointer">arrow_back</Link>
            <h2 className="text-headline-sm font-headline-sm text-on-surface">
              {investor.full_name} <span className="text-on-surface-variant font-normal">/ Overview</span>
            </h2>
          </div>
          <div className="flex items-center gap-lg">
            <button
              className="bg-primary text-on-primary px-lg py-sm rounded-lg text-label-caps font-label-caps uppercase tracking-wider flex items-center gap-sm shadow-sm hover:bg-primary-container transition-all"
              onClick={handleStart}
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Generate Advisory Report
            </button>
          </div>
        </header>
        <div className="flex-grow overflow-y-auto p-lg bg-background">
          <div className="max-w-6xl mx-auto space-y-gutter">
            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
              <div className="bg-surface border border-outline-variant p-md flex flex-col justify-between h-32">
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Net Worth</span>
                <span className="text-headline-lg font-headline-lg font-black text-on-surface">
                  ${Math.round(investor.net_worth / 10000) / 100}M
                </span>
                <span className="text-body-sm text-on-surface-variant">{investor.profile_category}</span>
              </div>
              <div className="bg-surface border border-outline-variant p-md flex flex-col justify-between h-32">
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Liquidity</span>
                <span className="text-headline-lg font-headline-lg font-black text-on-surface">
                  ${Math.round(investor.liquidity * investor.net_worth / 1000)}K
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  {(investor.liquidity * 100).toFixed(0)}% Portfolio Total
                </span>
              </div>
              <div className="bg-surface border border-outline-variant p-md flex flex-col justify-between h-32">
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Monthly Income</span>
                <span className="text-headline-lg font-headline-lg font-black text-on-surface">
                  ${Math.round(investor.monthly_income / 100) / 10}K
                </span>
                <span className="text-body-sm text-on-surface-variant">{incomeStability}</span>
              </div>
              <div className="bg-surface border border-outline-variant p-md flex flex-col justify-between h-32">
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Savings Rate</span>
                <span className="text-headline-lg font-headline-lg font-black text-on-surface">
                  {(investor.savings_rate * 100).toFixed(1)}%
                </span>
                <span className="text-body-sm text-primary flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[14px]">{savingsTargetMet ? "check_circle" : "warning"}</span>
                  Target: 20%
                </span>
              </div>
            </div>

            {/* Profile + Goals row */}
            <div className="grid grid-cols-12 gap-gutter">
              <div className="col-span-4 bg-surface border border-outline-variant rounded-none overflow-hidden">
                <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                  <span className="text-label-caps font-label-caps uppercase text-on-surface font-bold">Personal Profile</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
                </div>
                <div className="p-md space-y-md">
                  {[
                    { label: "Name", value: investor.full_name },
                    { label: "Age", value: String(investor.age) },
                    { label: "Employment", value: investor.employment },
                    { label: "Marital Status", value: investor.marital_status },
                  ].map((row, i) => (
                    <div key={row.label} className={`flex justify-between ${i < 3 ? "border-b border-surface-container-high pb-sm" : ""}`}>
                      <span className="text-body-sm text-on-surface-variant">{row.label}</span>
                      <span className="text-body-sm font-bold">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-body-sm text-on-surface-variant">Risk Appetite</span>
                    <span className="px-sm py-[2px] bg-primary-container text-on-primary text-[10px] font-bold rounded-full">
                      {investor.risk_category.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-8 bg-surface border border-outline-variant">
                <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                  <span className="text-label-caps font-label-caps uppercase text-on-surface font-bold">Financial Goals &amp; Horizon</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">flag</span>
                </div>
                <div className="p-md grid grid-cols-2 gap-lg h-[calc(100%-52px)]">
                  <div className="space-y-md">
                    <p className="text-label-caps font-label-caps text-on-surface-variant">Active Objectives</p>
                    <div className="space-y-sm">
                      {goals.map((goal, index) => (
                        <div
                          key={goal.title}
                          className={`p-sm bg-surface-container flex items-center justify-between border-l-4 ${index === 0 ? "border-primary" : "border-outline"}`}
                        >
                          <div>
                            <p className="text-body-sm font-bold">{goal.title}</p>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                              Target: ${(goal.target / 1_000_000).toFixed(1)}M | {goal.target_year}
                            </p>
                          </div>
                          <span className="text-body-sm font-data-mono">{goal.progress}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-l border-outline-variant pl-lg flex flex-col justify-center items-center text-center">
                    <p className="text-label-caps font-label-caps text-on-surface-variant mb-md">Investment Horizon</p>
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle className="text-surface-variant" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                        <circle
                          className="text-primary"
                          cx="64" cy="64" fill="transparent" r="58" stroke="currentColor"
                          strokeDasharray="364"
                          strokeDashoffset={364 - (364 * Math.min(investor.investment_horizon, 30)) / 30}
                          strokeWidth="8"
                        ></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-headline-md font-black">{investor.investment_horizon}</span>
                        <span className="text-label-caps font-label-caps text-on-surface-variant">YEARS</span>
                      </div>
                    </div>
                    <p className="text-body-sm mt-md font-bold text-on-surface-variant italic">
                      "{investor.investment_horizon >= 20 ? "Compounding Priority" : investor.investment_horizon >= 10 ? "Growth Focus" : "Capital Preservation"}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Right sidebar: Agent Execution Monitor */}
      <aside className="w-80 flex-shrink-0 bg-surface border-l border-outline-variant flex flex-col overflow-hidden">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-primary-container text-on-primary">
          <span className="text-label-caps font-label-caps uppercase font-black">Agent Execution Monitor</span>
          <span className="flex items-center gap-xs">
            <span className={`w-2 h-2 rounded-full ${analysisId ? "bg-green-400 animate-pulse" : "bg-blue-400"}`}></span>
            <span className="text-[10px] font-bold">{analysisId ? "LIVE" : "IDLE"}</span>
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant bg-surface-container-low overflow-x-auto">
          {([
            { key: "workflow", label: "Status", icon: "route" },
            { key: "a2a", label: "A2A", icon: "swap_horiz" },
            { key: "mcp", label: "MCP", icon: "build" },
            { key: "llm", label: "LLM", icon: "psychology" },
            { key: "events", label: "Log", icon: "list" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 py-sm px-xs text-center text-[9px] font-bold uppercase tracking-wider transition-colors ${
                activeMonitorTab === tab.key
                  ? "text-primary border-b-2 border-primary bg-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              onClick={() => setActiveMonitorTab(tab.key)}
            >
              <span className="material-symbols-outlined text-[14px] block mb-[2px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-grow overflow-y-auto">
          {activeMonitorTab === "workflow" && (
            <div className="p-md">
              <div className="flex flex-col gap-sm">
                {workflowNodes.map((node, index) => {
                  const status = workflowStatus[node.key];
                  const statusIcon = status === "Completed" ? "verified" : status === "Running" ? "sync" : "schedule";
                  const statusClass = status === "Completed" ? "text-green-600" : status === "Running" ? "text-primary animate-spin" : "text-on-surface-variant";
                  return (
                    <div key={node.key}>
                      <div className="flex items-center gap-md">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm ring-2 ring-primary-container">
                          <span className="material-symbols-outlined text-[16px]">{node.icon}</span>
                        </div>
                        <div className="flex-grow">
                          <p className="text-[11px] font-bold leading-none">{node.label}</p>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-tighter">{node.subtitle}</p>
                        </div>
                        <span className={`material-symbols-outlined text-[18px] ${statusClass}`}>{statusIcon}</span>
                      </div>
                      {index < workflowNodes.length - 1 && <div className="ml-4 border-l-2 border-outline-variant h-4"></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeMonitorTab === "a2a" && (
            <div className="p-sm space-y-sm">
              {a2aMessages.length === 0 && <div className="text-body-sm text-on-surface-variant p-md">No A2A messages yet.</div>}
              {a2aMessages.map((msg, i) => (
                <div key={i} className="border border-outline-variant rounded bg-surface-container-lowest">
                  <button className="w-full p-sm flex justify-between items-center text-left" onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}>
                    <div>
                      <div className="text-[10px] font-bold text-on-surface">{msg.payload.sender} → {msg.payload.receiver}</div>
                      <div className="text-[9px] text-on-surface-variant">Task: {msg.payload.task}</div>
                    </div>
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">{expandedEvent === i ? "expand_less" : "expand_more"}</span>
                  </button>
                  {expandedEvent === i && (
                    <pre className="p-sm bg-surface-container text-[9px] font-data-mono text-on-surface-variant overflow-x-auto border-t border-outline-variant whitespace-pre-wrap">
                      {JSON.stringify(msg.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeMonitorTab === "mcp" && (
            <div className="p-sm space-y-sm">
              {mcpCalls.length === 0 && <div className="text-body-sm text-on-surface-variant p-md">No MCP tool calls yet.</div>}
              {mcpCalls.map((call, i) => {
                const idx = a2aMessages.length + i;
                return (
                  <div key={i} className="border border-outline-variant rounded bg-surface-container-lowest">
                    <button className="w-full p-sm flex justify-between items-center text-left" onClick={() => setExpandedEvent(expandedEvent === idx ? null : idx)}>
                      <div>
                        <div className="text-[10px] font-bold text-on-surface">{call.event_type}</div>
                        <div className="text-[9px] text-on-surface-variant">{new Date(call.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">{expandedEvent === idx ? "expand_less" : "expand_more"}</span>
                    </button>
                    {expandedEvent === idx && (
                      <pre className="p-sm bg-surface-container text-[9px] font-data-mono text-on-surface-variant overflow-x-auto border-t border-outline-variant whitespace-pre-wrap">
                        {JSON.stringify(call.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeMonitorTab === "llm" && (
            <div className="p-sm space-y-sm">
              {llmCalls.length === 0 && <div className="text-body-sm text-on-surface-variant p-md">No LLM calls yet.</div>}
              {llmCalls.map((call, i) => {
                const idx = a2aMessages.length + mcpCalls.length + i;
                return (
                  <div key={i} className="border border-outline-variant rounded bg-surface-container-lowest">
                    <button className="w-full p-sm flex justify-between items-center text-left" onClick={() => setExpandedEvent(expandedEvent === idx ? null : idx)}>
                      <div>
                        <div className="text-[10px] font-bold text-on-surface">Model: {call.payload.model ?? "local"}</div>
                        <div className="text-[9px] text-on-surface-variant">
                          {call.payload.prompt_tokens ?? 0} prompt / {call.payload.response_tokens ?? 0} response tokens
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">{expandedEvent === idx ? "expand_less" : "expand_more"}</span>
                    </button>
                    {expandedEvent === idx && (
                      <pre className="p-sm bg-surface-container text-[9px] font-data-mono text-on-surface-variant overflow-x-auto border-t border-outline-variant whitespace-pre-wrap">
                        {JSON.stringify(call.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeMonitorTab === "events" && (
            <div className="p-md space-y-sm">
              {events.length === 0 && <div className="text-body-sm text-on-surface-variant">Awaiting events...</div>}
              {events.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="text-[10px] font-data-mono text-on-surface-variant">
                  [{new Date(event.timestamp).toLocaleTimeString()}] {event.event_type}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with report link */}
        <div className="p-md border-t border-outline-variant space-y-sm">
          {analysisId && (
            <div className="text-[10px] font-data-mono text-on-surface-variant truncate">
              Analysis: {analysisId.slice(0, 8)}...
            </div>
          )}
          {reportId && (
            <Link
              className="w-full py-sm bg-primary text-on-primary text-label-caps font-label-caps font-bold flex items-center justify-center gap-sm rounded hover:opacity-90 transition-all"
              to={`/reports/${reportId}`}
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              Open Advisory Report
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
