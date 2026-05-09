import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GmailProvider, useGmail } from './contexts/GmailContext';
import Sidebar from './components/common/Sidebar';
import TopBar  from './components/common/TopBar';
import OnboardingModal from './components/inbox/OnboardingModal';

import Dashboard    from './pages/Dashboard';
import InboxIntegration from './pages/InboxIntegration';
import { IncomingEmailsPage, QuarantinedEmailsPage, BlockedEmailsPage } from './pages/EmailPages';
import ThreatIntel  from './pages/ThreatIntel';
import SearchPage   from './pages/SearchPage';
import ManualScanner from './pages/ManualScanner';
import SettingsPage from './pages/SettingsPage';

// ── Inner layout needs context ────────────────────────────────────────────────
const AppLayout = () => {
  const { gmailStatus, connectGmail } = useGmail();
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);

  const showOnboarding = gmailStatus === 'Not Connected' && !dismissedOnboarding;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Onboarding modal */}
      {showOnboarding && (
        <OnboardingModal onDismiss={() => setDismissedOnboarding(true)} />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/"           element={<Dashboard onConnect={connectGmail} />} />
            <Route path="/inbox"      element={<InboxIntegration />} />
            <Route path="/emails"     element={<IncomingEmailsPage />} />
            <Route path="/quarantine" element={<QuarantinedEmailsPage />} />
            <Route path="/blocked"    element={<BlockedEmailsPage />} />
            <Route path="/threats"    element={<ThreatIntel />} />
            <Route path="/search"     element={<SearchPage />} />
            <Route path="/scanner"    element={<ManualScanner />} />
            <Route path="/settings"   element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// ── Root wraps everything in GmailProvider ────────────────────────────────────
export default function App() {
  return (
    <GmailProvider>
      <AppLayout />
    </GmailProvider>
  );
}
