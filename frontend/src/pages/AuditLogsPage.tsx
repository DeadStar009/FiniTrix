import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchAuditLogs } from "../lib/api";
import type { AuditLogEntry } from "../lib/types";

function useQueryParam(name: string) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return params.get(name) ?? "";
}

export default function AuditLogsPage() {
  const initialAnalysisId = useQueryParam("analysis_id");
  const [analysisId, setAnalysisId] = useState(initialAnalysisId);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    fetchAuditLogs(analysisId || undefined).then(setLogs);
  }, [analysisId]);

  return (
    <AppShell
      active="audit"
      headerLeft={
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Audit Logs</h1>
          <p className="text-on-surface-variant text-body-md">Immutable event trail across agent workflows.</p>
        </div>
      }
      headerRight={
        <div className="flex items-center gap-md">
          <input
            className="bg-surface-container-low border border-outline-variant rounded-lg px-md py-xs text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            placeholder="Filter by analysis id"
            value={analysisId}
            onChange={(event) => setAnalysisId(event.target.value)}
          />
          <Link
            className="px-md py-xs border border-outline-variant text-on-surface-variant text-body-md font-medium rounded hover:bg-surface-container-high transition-all"
            to="/investors"
          >
            New Analysis
          </Link>
        </div>
      }
    >
      <div className="bg-surface border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="text-label-caps font-label-caps text-on-surface-variant uppercase">Audit Trail</div>
        </div>
        <div className="overflow-x-auto data-table-container">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest sticky top-0 z-10">
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Timestamp</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Event</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Analysis</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {logs.map((log, index) => (
                <tr
                  key={log.id}
                  className={`hover:bg-surface-container-low transition-colors ${index % 2 === 1 ? "bg-surface-container-lowest" : ""}`}
                >
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{log.timestamp.slice(0, 19)}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface">{log.event_type}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{log.analysis_id}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{JSON.stringify(log.payload)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
