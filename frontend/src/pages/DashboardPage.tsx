import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchAnalysisRuns, fetchInvestors, fetchReports } from "../lib/api";
import type { AnalysisRunSummary, InvestorSummary, ReportSummary } from "../lib/types";

export default function DashboardPage() {
  const [investors, setInvestors] = useState<InvestorSummary[]>([]);
  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);

  useEffect(() => {
    fetchInvestors().then((data) => setInvestors(data.items));
    fetchAnalysisRuns().then(setRuns);
    fetchReports().then(setReports);
  }, []);

  const totalAum = useMemo(() => {
    const total = investors.reduce((sum, inv) => sum + inv.net_worth, 0);
    return `$${(total / 1_000_000).toFixed(1)}M`;
  }, [investors]);

  const activeProfiles = investors.length;
  const completedRuns = runs.filter((r) => r.status === "COMPLETED").length;
  const recentReports = reports.slice(0, 5);
  const recentRuns = runs.slice(0, 5);

  return (
    <AppShell active="dashboard">
      <div className="max-w-6xl mx-auto space-y-lg">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Dashboard</h1>
          <p className="text-on-surface-variant text-body-md mt-xs">
            Enterprise advisory platform overview and key metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
          <div className="bg-surface border border-outline-variant p-md flex flex-col justify-between h-32">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Total AUM</span>
            <span className="text-headline-lg font-headline-lg font-black text-on-surface">{totalAum}</span>
            <span className="text-body-sm text-on-surface-variant">{activeProfiles} active profiles</span>
          </div>
          <div className="bg-surface border border-outline-variant p-md flex flex-col justify-between h-32">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Completed Analyses</span>
            <span className="text-headline-lg font-headline-lg font-black text-on-surface">{completedRuns}</span>
            <span className="text-body-sm text-on-surface-variant">{runs.length} total runs</span>
          </div>
          <div className="bg-surface border border-outline-variant p-md flex flex-col justify-between h-32">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Reports Generated</span>
            <span className="text-headline-lg font-headline-lg font-black text-on-surface">{reports.length}</span>
            <span className="text-body-sm text-on-surface-variant">Advisory reports</span>
          </div>
          <div className="bg-surface border border-outline-variant p-md flex flex-col justify-between h-32">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">System Status</span>
            <span className="text-headline-lg font-headline-lg font-black text-primary flex items-center gap-sm">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
              Online
            </span>
            <span className="text-body-sm text-on-surface-variant">All agents operational</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <div className="bg-surface border border-outline-variant">
            <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Recent Reports</span>
              <Link className="text-body-sm text-primary font-bold" to="/reports">
                View All
              </Link>
            </div>
            <div className="divide-y divide-surface-container-high">
              {recentReports.length === 0 && (
                <div className="px-lg py-md text-body-sm text-on-surface-variant">No reports yet.</div>
              )}
              {recentReports.map((report) => {
                const parts = report.title.split(" - ");
                const investorName = parts.length > 1 ? parts.slice(1).join(" - ") : report.title;
                return (
                  <div key={report.id} className="px-lg py-md flex justify-between items-center hover:bg-surface-container-low transition-colors">
                    <div>
                      <div className="text-body-md font-bold text-on-surface">{investorName}</div>
                      <div className="text-body-sm text-on-surface-variant">{report.created_at.slice(0, 10)}</div>
                    </div>
                    <Link className="text-primary text-body-sm font-bold hover:underline" to={`/reports/${report.id}`}>
                      Open
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface border border-outline-variant">
            <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Recent Analysis Runs</span>
              <Link className="text-body-sm text-primary font-bold" to="/activity">
                View All
              </Link>
            </div>
            <div className="divide-y divide-surface-container-high">
              {recentRuns.length === 0 && (
                <div className="px-lg py-md text-body-sm text-on-surface-variant">No analysis runs yet.</div>
              )}
              {recentRuns.map((run) => (
                <div key={run.id} className="px-lg py-md flex justify-between items-center hover:bg-surface-container-low transition-colors">
                  <div>
                    <div className="text-body-md font-bold text-on-surface">{run.investor_name}</div>
                    <div className="text-body-sm text-on-surface-variant">
                      {run.started_at.slice(0, 19)} · <span className={run.status === "COMPLETED" ? "text-green-600" : run.status === "RUNNING" ? "text-primary" : "text-error"}>{run.status}</span>
                    </div>
                  </div>
                  <Link className="text-primary text-body-sm font-bold hover:underline" to={`/investors/${run.investor_id}`}>
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
