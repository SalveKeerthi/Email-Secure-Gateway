import { useEffect } from 'react';
import { useGmail } from '../contexts/GmailContext';
import useEmails from '../hooks/useEmails';
import EmailTable from '../components/emails/EmailTable';
import { PageHeader, Spinner } from '../components/common';

const EmailListPage = ({ type }) => {
  const { account, newEmailIds } = useGmail();
  const { emails, total, page, pages, loading, error, search, refresh, goToPage, handleSearch } =
    useEmails(type, account?._id);

  // Refresh when account connects
  useEffect(() => {
    if (account?._id) refresh();
  }, [account?._id]);

  const config = {
    incoming:    { title: 'Incoming Emails',     icon: '📧', emptyTitle: 'No emails yet',          emptyDesc: 'Emails will appear here once Gmail is connected and synced.' },
    quarantined: { title: 'Quarantined Emails',  icon: '🔒', emptyTitle: 'No quarantined emails',  emptyDesc: 'Emails with risk score 50–79 are quarantined for review.' },
    blocked:     { title: 'Blocked Emails',      icon: '🛑', emptyTitle: 'No blocked emails',      emptyDesc: 'Emails with risk score ≥ 80 are blocked automatically.' },
  }[type];

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <PageHeader title={config.title} sub={`${total.toLocaleString()} total emails`}>
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search sender, subject…"
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-52"
          />
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? <Spinner size="sm" /> : '⟳'} Refresh
        </button>
      </PageHeader>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <EmailTable
          emails={emails}
          loading={loading}
          newEmailIds={newEmailIds}
          page={page}
          pages={pages}
          onPage={goToPage}
          emptyTitle={config.emptyTitle}
          emptyDescription={config.emptyDesc}
        />
      </div>
    </div>
  );
};

export const IncomingEmailsPage    = () => <EmailListPage type="incoming"    />;
export const QuarantinedEmailsPage = () => <EmailListPage type="quarantined" />;
export const BlockedEmailsPage     = () => <EmailListPage type="blocked"     />;
