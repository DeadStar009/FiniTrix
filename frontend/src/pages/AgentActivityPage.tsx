import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchAnalysisRuns } from "../lib/api";
import type { AnalysisRunSummary } from "../lib/types";

export default function AgentActivityPage() {
  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);

  useEffect(() => {
    fetchAnalysisRuns().then(setRuns);
  }, []);

  return (
    <AppShell
      active="activity"
      headerLeft={
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Agent Activity</h1>
          <p className="text-on-surface-variant text-body-md">Recent orchestration runs and workflow status.</p>
        </div>
      }
      headerRight={
        <Link
          className="px-md py-xs border border-outline-variant text-on-surface-variant text-body-md font-medium rounded hover:bg-surface-container-high transition-all"
          to="/investors"
        >
          New Analysis
        </Link>
      }
    >
      <div className="bg-surface border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="text-label-caps font-label-caps text-on-surface-variant uppercase">Workflow Runs</div>
        </div>
        <div className="overflow-x-auto data-table-container">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest sticky top-0 z-10">
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Investor</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Status</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Started</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {runs.map((run, index) => (
                <tr
                  key={run.id}
                  className={`hover:bg-surface-container-low transition-colors ${index % 2 === 1 ? "bg-surface-container-lowest" : ""}`}
                >
                  <td className="px-lg py-md text-body-md font-bold text-on-surface">{run.investor_name}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{run.status}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{run.started_at.slice(0, 19)}</td>
                  <td className="px-lg py-md text-right">
                    <div className="flex justify-end gap-md">
                      <Link className="text-primary text-body-sm font-bold hover:underline" to={`/investors/${run.investor_id}`}>
                        Open Workspace
                      </Link>
                      <Link
                        className="text-primary text-body-sm font-bold hover:underline"
                        to={`/audit?analysis_id=${run.id}`}
                      >
                        Audit Logs
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
