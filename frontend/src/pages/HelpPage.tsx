import AppShell from "../components/AppShell";

export default function HelpPage() {
  return (
    <AppShell
      active="help"
      headerLeft={
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Help Center</h1>
          <p className="text-on-surface-variant text-body-md">Guidance for investor analysis and report review.</p>
        </div>
      }
    >
      <div className="bg-surface border border-outline-variant p-lg space-y-md">
        <div className="text-label-caps font-label-caps text-on-surface-variant">Common Actions</div>
        <ul className="list-disc pl-lg text-body-md text-on-surface space-y-xs">
          <li>Open an investor profile to review risk and liquidity metrics.</li>
          <li>Start a new analysis run to observe agent and tool orchestration.</li>
          <li>Review audit logs for compliance and execution verification.</li>
        </ul>
        <div className="text-label-caps font-label-caps text-on-surface-variant">Support</div>
        <div className="text-body-md text-on-surface">Contact advisory operations for access and workflow assistance.</div>
      </div>
    </AppShell>
  );
}
