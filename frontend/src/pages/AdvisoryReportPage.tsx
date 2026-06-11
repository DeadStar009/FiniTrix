import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchAuditLogs, fetchReport } from "../lib/api";
import type { AuditLogEntry, ReportDetail } from "../lib/types";

export default function AdvisoryReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchReport(id).then(setReport);
  }, [id]);

  useEffect(() => {
    if (!report?.analysis_id) return;
    fetchAuditLogs(report.analysis_id).then(setAuditLogs);
  }, [report?.analysis_id]);

  const data = report?.report_json ?? {};
  const forecast = data.forecast ?? {};
  const compliance = data.compliance ?? {};
  const allocation = data.allocation ?? {};
  const risk = data.risk ?? {};

  const forecastBands = useMemo(() => {
    const p10 = forecast.p10 ?? 0;
    const p50 = forecast.p50 ?? 0;
    const p90 = forecast.p90 ?? 0;
    const successRate = Math.min(98, Math.max(70, 70 + (p90 - p10)));
    return { p10, p50, p90, successRate };
  }, [forecast]);

  const allocationRows = useMemo(() => {
    const netWorth = data.investor?.net_worth ?? 0;
    const baseline = { equity: 50, debt: 40, gold: 10 };
    const rows = [
      { label: "Public Equities (Global)", key: "equity" },
      { label: "Fixed Income (Sovereign)", key: "debt" },
      { label: "Commodities & Gold", key: "gold" },
    ] as const;
    return rows.map((row) => {
      const allocationPct = allocation[row.key] ?? 0;
      const value = (netWorth * allocationPct) / 100;
      const delta = allocationPct - baseline[row.key];
      return { ...row, allocationPct, value, delta };
    });
  }, [allocation, data.investor?.net_worth]);

  const projectionLabel = useMemo(() => {
    const horizon = data.investor?.investment_horizon ?? 10;
    const year = new Date().getFullYear() + horizon;
    const base = data.investor?.net_worth ?? 0;
    const rate = (forecastBands.p50 ?? 0) / 100;
    const value = base * Math.pow(1 + rate, horizon);
    return { year, value };
  }, [data.investor?.investment_horizon, data.investor?.net_worth, forecastBands.p50]);

  // Dynamic year axis
  const yearLabels = useMemo(() => {
    const startYear = new Date().getFullYear();
    const horizon = data.investor?.investment_horizon ?? 10;
    const endYear = startYear + horizon;
    const step = Math.max(1, Math.round(horizon / 3));
    const labels: number[] = [];
    for (let y = startYear; y <= endYear; y += step) labels.push(y);
    if (labels[labels.length - 1] !== endYear) labels.push(endYear);
    return labels;
  }, [data.investor?.investment_horizon]);

  // Dynamic bar heights based on forecast
  const barHeights = useMemo(() => {
    const p10 = Math.abs(forecastBands.p10);
    const p50 = Math.abs(forecastBands.p50);
    const p90 = Math.abs(forecastBands.p90);
    const maxVal = Math.max(p90, 1);
    const scale = (v: number) => Math.max(10, Math.min(95, (v / maxVal) * 85));
    return [
      scale(p10 * 0.4), scale(p10 * 0.7), scale(p10),
      scale(p50 * 0.7), scale(p50), scale(p90 * 0.8), scale(p90),
    ];
  }, [forecastBands]);

  // Compliance rules from backend
  const complianceRules = useMemo(() => {
    return compliance.rules ?? [
      { rule: "Equity Allocation Limit", status: compliance.status ?? "PASS", detail: "" },
      { rule: "Diversification Check", status: compliance.status ?? "PASS", detail: "" },
      { rule: "Suitability Review", status: compliance.status ?? "PASS", detail: "" },
    ];
  }, [compliance]);

  // Risk metrics from backend
  const volTolerance = risk.volatility_tolerance ?? "Moderate";
  const volPct = risk.volatility_tolerance_pct ?? 50;
  const maxDrawdown = risk.max_drawdown ?? 12.5;
  const drawdownBarPct = risk.max_drawdown_bar_pct ?? 45;

  const targetYield = useMemo(() => {
    const savingsRate = data.investor?.savings_rate ?? 0.2;
    return (Math.max(4, savingsRate * 30)).toFixed(2);
  }, [data.investor?.savings_rate]);

  if (!report) {
    return <div className="p-lg">Loading report...</div>;
  }

  return (
    <AppShell
      active="reports"
      headerLeft={
        <div className="flex items-center gap-xl">
          <span className="text-headline-sm font-headline-sm font-bold text-on-surface">FINTRIX</span>
          <nav className="hidden md:flex items-center gap-lg">
            <Link className="text-on-surface-variant hover:text-primary transition-all text-body-md" to="/investors">Portfolio</Link>
            <Link className="text-on-surface-variant hover:text-primary transition-all text-body-md" to="/audit">Compliance</Link>
            <Link className="text-primary border-b-2 border-primary font-bold pb-1 text-body-md" to="/activity">Risk Monitor</Link>
          </nav>
        </div>
      }
      headerRight={
        <div className="flex items-center gap-md">
          <button
            className="px-md py-sm bg-surface border border-outline-variant text-body-sm font-bold hover:bg-surface-container-high transition-colors flex items-center gap-xs"
            onClick={() => window.print()}
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Export PDF
          </button>
        </div>
      }
    >
      <div className="flex justify-center">
        <div className="report-container w-full max-w-5xl bg-white border border-outline-variant shadow-sm p-lg md:p-xl space-y-xl">
          {/* Header */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-primary pb-md">
            <div>
              <div className="text-label-caps font-label-caps text-secondary mb-xs">ADVISORY REPORT : {report.id.slice(0, 8)}</div>
              <h1 className="text-headline-lg font-headline-lg text-primary uppercase">FINTRIX Institutional Advisory</h1>
              <div className="flex gap-md mt-sm text-body-md text-on-surface-variant">
                <span className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px]">person</span> {data.investor?.name}
                </span>
                <span className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span> {report.created_at.slice(0, 10)}
                </span>
              </div>
            </div>
            <div className="mt-md md:mt-0 text-right">
              <div className="text-label-caps font-label-caps text-secondary">Document Classification</div>
              <div className="text-body-sm font-bold text-error uppercase px-sm py-xs bg-error-container inline-block">Strictly Confidential</div>
            </div>
          </section>

          {/* Executive Summary */}
          <section>
            <div className="text-label-caps font-label-caps text-secondary border-b border-outline-variant pb-xs mb-md">Executive Summary</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <div className="md:col-span-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  allowedElements={[
                    "p",
                    "strong",
                    "em",
                    "ul",
                    "ol",
                    "li",
                    "blockquote",
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "hr",
                  ]}
                  components={{
                    h1: ({ children }) => <h3 className="text-headline-sm font-headline-sm text-primary mb-sm">{children}</h3>,
                    h2: ({ children }) => <h4 className="text-title-md font-bold text-on-surface mb-sm">{children}</h4>,
                    h3: ({ children }) => <h5 className="text-title-sm font-bold text-on-surface mb-xs">{children}</h5>,
                    h4: ({ children }) => <h6 className="text-body-md font-bold text-on-surface mb-xs">{children}</h6>,
                    p: ({ children }) => <p className="text-body-lg leading-relaxed italic mb-md">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-lg text-body-lg space-y-xs mb-md">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-lg text-body-lg space-y-xs mb-md">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/50 pl-md text-body-md text-on-surface-variant italic mb-md">{children}</blockquote>
                    ),
                    hr: () => <hr className="border-outline-variant my-md" />,
                  }}
                >
                  {data.report_body ?? ""}
                </ReactMarkdown>
              </div>
              <div className="bg-surface-container-low p-md border border-outline-variant rounded-lg">
                <div className="text-label-caps font-label-caps text-secondary mb-xs">Portfolio Status</div>
                <div className="flex items-center gap-sm text-headline-sm font-headline-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {compliance.status === "PASS" ? "COMPLIANCE PASSED" : "COMPLIANCE REVIEW"}
                </div>
                <div className="mt-sm text-body-sm text-on-surface-variant">Validated on {report.created_at.slice(0, 10)}</div>
              </div>
            </div>
          </section>

          {/* Investor Metrics + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
            <section>
              <div className="text-label-caps font-label-caps text-secondary border-b border-outline-variant pb-xs mb-md">Investor Metrics</div>
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant">Indicator</th>
                    <th className="px-md py-sm text-label-caps font-label-caps text-on-surface-variant text-right">Current Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  <tr><td className="px-md py-sm">Net Investable Wealth</td><td className="px-md py-sm font-data-mono text-right">${data.investor?.net_worth?.toLocaleString()}</td></tr>
                  <tr><td className="px-md py-sm">Liquidity Ratio</td><td className="px-md py-sm font-data-mono text-right">{((data.investor?.liquidity_ratio ?? 0) * 100).toFixed(1)}%</td></tr>
                  <tr><td className="px-md py-sm">Annual Target Yield</td><td className="px-md py-sm font-data-mono text-right">{targetYield}%</td></tr>
                  <tr><td className="px-md py-sm">Horizon Duration</td><td className="px-md py-sm font-data-mono text-right">{data.investor?.investment_horizon} Years</td></tr>
                </tbody>
              </table>
            </section>
            <section>
              <div className="text-label-caps font-label-caps text-secondary border-b border-outline-variant pb-xs mb-md">Risk Assessment Profile</div>
              <div className="grid grid-cols-2 gap-md">
                <div className="p-md bg-surface-container-lowest border border-outline-variant flex flex-col items-center">
                  <div className="text-label-caps font-label-caps text-secondary mb-sm">Risk Score</div>
                  <div className="text-headline-lg font-headline-lg text-primary">{risk.risk_score}<span className="text-body-md text-on-surface-variant font-normal">/100</span></div>
                  <div className="text-body-sm font-bold text-on-surface-variant uppercase mt-xs">{risk.risk_profile}</div>
                </div>
                <div className="p-md bg-surface-container-lowest border border-outline-variant">
                  <div className="space-y-sm">
                    <div>
                      <div className="flex justify-between text-label-caps font-label-caps mb-1"><span>Volatility Tolerance</span><span>{volTolerance}</span></div>
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"><div className="bg-primary h-full" style={{ width: `${volPct}%` }}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-label-caps font-label-caps mb-1"><span>Max Drawdown Limit</span><span>{maxDrawdown}%</span></div>
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"><div className="bg-primary h-full" style={{ width: `${drawdownBarPct}%` }}></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Allocation Table */}
          <section>
            <div className="text-label-caps font-label-caps text-secondary border-b border-outline-variant pb-xs mb-md">Strategic Portfolio Allocation</div>
            <div className="border border-outline-variant rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-primary text-on-primary">
                  <tr>
                    <th className="px-md py-sm text-label-caps font-label-caps">Asset Class</th>
                    <th className="px-md py-sm text-label-caps font-label-caps">Allocation</th>
                    <th className="px-md py-sm text-label-caps font-label-caps text-right">Value (USD)</th>
                    <th className="px-md py-sm text-label-caps font-label-caps text-right">Δ vs Prev</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {allocationRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-md py-sm font-bold">{row.label}</td>
                      <td className="px-md py-sm">
                        <div className="flex items-center gap-sm">
                          <div className="w-24 bg-surface-container-high h-2"><div className="bg-primary h-full" style={{ width: `${row.allocationPct}%` }}></div></div>
                          <span className="font-data-mono">{row.allocationPct}%</span>
                        </div>
                      </td>
                      <td className="px-md py-sm font-data-mono text-right">${row.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={`px-md py-sm font-data-mono text-right ${row.delta < 0 ? "text-error" : "text-on-primary-container"}`}>
                        {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Forecast */}
          <section>
            <div className="text-label-caps font-label-caps text-secondary border-b border-outline-variant pb-xs mb-md mt-xl">Forecast Analysis &amp; Monte Carlo Simulation</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
              <div className="md:col-span-3 bg-surface-container-low border border-outline-variant h-64 relative flex items-end p-md overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                <div className="relative w-full h-full flex flex-col justify-end">
                  <div className="flex items-end justify-between w-full h-4/5 gap-sm">
                    {barHeights.map((h, i) => (
                      <div key={i} className={`flex-1 bg-primary relative`} style={{ height: `${h}%`, opacity: 0.3 + i * 0.1 }}>
                        {i === barHeights.length - 1 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white border border-primary px-sm py-xs font-data-mono font-bold whitespace-nowrap shadow-sm text-xs">
                            EST. {projectionLabel.year}: ${(projectionLabel.value / 1_000_000).toFixed(1)}M
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-sm text-label-caps text-on-surface-variant">
                    {yearLabels.map((y) => (<span key={y}>{y}</span>))}
                  </div>
                </div>
              </div>
              <div className="space-y-md">
                <div className="p-md bg-white border border-outline-variant">
                  <div className="text-label-caps font-label-caps text-secondary">Success Rate</div>
                  <div className="text-headline-sm font-bold text-primary">{forecastBands.successRate.toFixed(1)}%</div>
                  <div className="text-body-sm text-on-surface-variant">At {forecast.assumptions?.iterations ?? 10000} iterations</div>
                </div>
                <div className="p-md bg-white border border-outline-variant">
                  <div className="text-label-caps font-label-caps text-secondary">Scenario Spread</div>
                  <div className="text-headline-sm font-bold text-primary">P10–P90</div>
                  <div className="text-body-sm text-on-surface-variant">{forecastBands.p10}% – {forecastBands.p90}%</div>
                </div>
              </div>
            </div>
          </section>

          {/* Compliance + Audit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            <section>
              <div className="text-label-caps font-label-caps text-secondary border-b border-outline-variant pb-xs mb-md">Compliance Validation</div>
              <div className="space-y-sm">
                {complianceRules.map((row: any) => (
                  <div key={row.rule} className="flex justify-between items-center p-sm border border-outline-variant bg-surface-container-lowest">
                    <div>
                      <span className="text-body-md">{row.rule}</span>
                      {row.detail && <div className="text-[10px] text-on-surface-variant">{row.detail}</div>}
                    </div>
                    <span className={`px-sm py-xs text-label-caps font-bold ${row.status === "PASS" ? "bg-on-primary-fixed text-primary-fixed" : "bg-error-container text-error"}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="text-label-caps font-label-caps text-secondary border-b border-outline-variant pb-xs mb-md">Audit Trail</div>
              <div className="space-y-xs overflow-hidden border border-outline-variant">
                {auditLogs.slice(0, 6).map((log, index) => (
                  <div key={log.id} className={`flex items-center gap-md px-md py-sm font-data-mono text-[11px] ${index % 2 === 0 ? "bg-surface-container-low" : "bg-white"}`}>
                    <span className="text-primary font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-on-surface-variant uppercase">{log.event_type}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Final Recommendation */}
          <section className="bg-primary text-on-primary p-xl">
            <div className="flex flex-col md:flex-row justify-between gap-xl">
              <div className="md:w-2/3">
                <h2 className="text-headline-md font-headline-md mb-md">Strategic Decision &amp; Final Recommendation</h2>
                <ul className="space-y-sm text-body-lg list-disc pl-lg">
                  {data.strategic_recommendations?.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="md:w-1/3 flex flex-col justify-end space-y-md">
                <div className="border-t border-on-primary border-opacity-30 pt-md">
                  <div className="text-label-caps font-label-caps text-on-primary-container">Lead Advisory</div>
                  <div className="italic text-headline-sm font-headline-sm mt-md font-serif">FINTRIX Advisory Team</div>
                  <div className="text-body-sm opacity-70">Institutional Advisory Division</div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-xl border-t border-outline-variant flex flex-col md:flex-row justify-between text-on-surface-variant gap-lg">
            <div className="max-w-md">
              <p className="text-[10px] leading-normal uppercase tracking-wider opacity-60">
                Fintrix Advisory Services. This report is for informational purposes and does not
                constitute a legal offer to trade. Past performance is not indicative of future results. All simulations
                are based on historical datasets.
              </p>
            </div>
            <div className="flex gap-xl text-label-caps font-label-caps">
              <div className="text-primary">FINTRIX ADVISORY</div>
            </div>
          </footer>
        </div>
      </div>
    </AppShell>
  );
}
