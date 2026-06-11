import { Route, Routes, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import InvestorProfilesPage from "./pages/InvestorProfilesPage";
import InvestorWorkspacePage from "./pages/InvestorWorkspacePage";
import AdvisoryReportPage from "./pages/AdvisoryReportPage";
import ReportsPage from "./pages/ReportsPage";
import AgentActivityPage from "./pages/AgentActivityPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/investors" element={<InvestorProfilesPage />} />
      <Route path="/investors/:id" element={<InvestorWorkspacePage />} />
      <Route path="/activity" element={<AgentActivityPage />} />
      <Route path="/audit" element={<AuditLogsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/reports/:id" element={<AdvisoryReportPage />} />
      {/* Legacy monitor route redirects to investor workspace */}
      <Route path="/analysis/:id/monitor" element={<Navigate to="/activity" replace />} />
    </Routes>
  );
}
