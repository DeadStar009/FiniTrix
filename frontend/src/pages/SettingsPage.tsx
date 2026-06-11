import AppShell from "../components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell
      active="settings"
      headerLeft={
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">Settings</h1>
          <p className="text-on-surface-variant text-body-md">Configuration for advisory workflows and notifications.</p>
        </div>
      }
    >
      <div className="bg-surface border border-outline-variant p-lg space-y-md">
        <div className="text-label-caps font-label-caps text-on-surface-variant">Workflow Defaults</div>
        <div className="text-body-md text-on-surface">Agent orchestration cadence, event streaming, and report retention are managed by admin policy.</div>
        <div className="text-label-caps font-label-caps text-on-surface-variant">Notification Routing</div>
        <div className="text-body-md text-on-surface">All alerts are routed to compliance and advisory leads for review.</div>
      </div>
    </AppShell>
  );
}
