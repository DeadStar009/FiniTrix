import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchInvestors } from "../lib/api";
import type { InvestorSummary } from "../lib/types";

const riskBadgeClasses: Record<string, string> = {
  Aggressive: "bg-error-container text-on-error-container",
  "Moderate-High": "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  Moderate: "bg-secondary-container text-on-secondary-container",
  Low: "bg-surface-container-highest text-on-surface-variant",
  Conservative: "bg-surface-container-high text-on-surface-variant",
};

export default function InvestorProfilesPage() {
  const [investors, setInvestors] = useState<InvestorSummary[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchInvestors(query).then((data) => setInvestors(data.items));
  }, [query]);

  const totalAum = useMemo(() => {
    const total = investors.reduce((sum, investor) => sum + investor.net_worth, 0);
    return `$${(total / 1_000_000).toFixed(1)}M`;
  }, [investors]);

  const activeAlerts = useMemo(() => {
    return investors.filter((investor) => ["Aggressive", "Moderate-High"].includes(investor.risk_category)).length;
  }, [investors]);

  const firstInvestorId = investors[0]?.id;

  return (
    <AppShell
      active="investors"
      searchValue={query}
      onSearchChange={setQuery}
      primaryActionHref={firstInvestorId ? `/investors/${firstInvestorId}` : "/investors"}
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Investor Profiles</h1>
          <p className="text-on-surface-variant text-body-md mt-xs">
            Analyzing {investors.length} active high-net-worth individual profiles.
          </p>
        </div>
        <div className="flex gap-sm">
          <div className="px-md py-sm bg-surface border border-outline-variant flex items-center gap-sm">
            <span className="text-label-caps font-label-caps text-on-surface-variant">TOTAL AUM</span>
            <span className="text-headline-sm font-data-mono font-bold">{totalAum}</span>
          </div>
          <div className="px-md py-sm bg-surface border border-outline-variant flex items-center gap-sm">
            <span className="text-label-caps font-label-caps text-on-surface-variant">ACTIVE ALERTS</span>
            <span className="text-headline-sm font-data-mono font-bold text-error">{activeAlerts}</span>
          </div>
        </div>
      </div>
      <div className="bg-surface border border-outline-variant shadow-sm overflow-hidden flex flex-col mt-lg">
        <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="text-label-caps font-label-caps text-on-surface-variant uppercase">Core Advisory Database</div>
          <div className="flex gap-md">
            <button className="text-body-sm text-primary font-bold flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
            </button>
            <button className="text-body-sm text-primary font-bold flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">sort</span> Sort
            </button>
          </div>
        </div>
        <div className="overflow-x-auto data-table-container">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest sticky top-0 z-10">
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Investor Name</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant">Risk Category</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant text-right">Horizon</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant text-right">Monthly Investment</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant text-center">Last Report</th>
                <th className="px-lg py-md text-label-caps font-label-caps text-on-surface-variant border-b border-outline-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {investors.map((investor, index) => (
                <tr
                  key={investor.id}
                  className={`hover:bg-surface-container-low transition-colors group ${index % 2 === 1 ? "bg-surface-container-lowest" : ""}`}
                >
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-md">
                      <div className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-body-sm">
                        {investor.full_name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <div className="text-body-md font-bold text-on-surface">{investor.full_name}</div>
                        <div className="text-body-sm text-on-surface-variant">{investor.profile_category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-md">
                    <span
                      className={`px-sm py-1 text-label-caps font-label-caps rounded uppercase ${
                        riskBadgeClasses[investor.risk_category] ?? "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {investor.risk_category}
                    </span>
                  </td>
                  <td className="px-lg py-md text-right font-data-mono text-body-md">{investor.investment_horizon} Years</td>
                  <td className="px-lg py-md text-right font-data-mono text-body-md">
                    ${investor.monthly_investment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-lg py-md text-center font-data-mono text-body-sm text-on-surface-variant">
                    {investor.last_report_date ?? "-"}
                  </td>
                  <td className="px-lg py-md text-right">
                    <Link className="text-primary text-body-sm font-bold hover:underline" to={`/investors/${investor.id}`}>
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center">
          <div className="text-body-sm text-on-surface-variant">Showing {investors.length} results</div>
          <div className="flex gap-xs">
            <button className="p-xs hover:bg-surface-container-high rounded transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-primary text-on-primary font-bold text-body-sm rounded-sm">1</button>
            <button className="p-xs hover:bg-surface-container-high rounded transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
