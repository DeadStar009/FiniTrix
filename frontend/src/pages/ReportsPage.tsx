import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchReports } from "../lib/api";
import type { ReportSummary } from "../lib/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);

  useEffect(() => {
    fetchReports().then(setReports);
  }, []);

  const parsedReports = useMemo(() => {
    return reports.map((report) => {
      const parts = report.title.split(" - ");
      const investorName = parts.length > 1 ? parts.slice(1).join(" - ") : report.title;
      return { ...report, investorName };
    });
  }, [reports]);

  return (
    <AppShell
      active="reports"
      headerLeft={
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Advisory Reports</h1>
          <p className="text-on-surface-variant text-body-md">Latest completed reports across investor profiles.</p>
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
          <div className="text-label-caps font-label-caps text-on-surface-variant uppercase">Report Registry</div>
        </div>
        <div className="overflow-x-auto data-table-container">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest sticky top-0 z-10">
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Investor</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Report Title</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Created</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {parsedReports.map((report, index) => (
                <tr
                  key={report.id}
                  className={`hover:bg-surface-container-low transition-colors ${index % 2 === 1 ? "bg-surface-container-lowest" : ""}`}
                >
                  <td className="px-lg py-md text-body-md font-bold text-on-surface">{report.investorName}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{report.title}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{report.created_at.slice(0, 10)}</td>
                  <td className="px-lg py-md text-right">
                    <div className="flex justify-end gap-md">
                      <Link className="text-primary text-body-sm font-bold hover:underline" to={`/reports/${report.id}`}>
                        Open Report
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
