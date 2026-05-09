import { useGmail } from '../contexts/GmailContext';
import { ConnStatusBadge, ErrorAlert } from '../components/common';

const InboxIntegration = () => {
  const { gmailStatus, account, connectGmail, disconnectGmail, connectionError, setConnectionError } = useGmail();

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Inbox Integration</h1>
        <p className="text-xs text-gray-500 mt-0.5">Connect and manage Gmail OAuth2 integration</p>
      </div>

      {connectionError && (
        <ErrorAlert message={connectionError} onDismiss={() => setConnectionError(null)} onRetry={connectGmail} />
      )}

      {/* Connection card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-xl">✉️</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Gmail Account</h2>
            <p className="text-xs text-gray-500">Secured via Google OAuth2</p>
          </div>
          <ConnStatusBadge status={gmailStatus} />
        </div>

        {gmailStatus === 'Connected' ? (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <span className="text-emerald-600 text-lg">✓</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Connected Successfully</p>
                <p className="text-xs text-emerald-600 font-mono">{account?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={disconnectGmail}
                className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Disconnect Gmail
              </button>
              <button
                onClick={connectGmail}
                className="flex-1 border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Reconnect Gmail
              </button>
            </div>
          </>
        ) : gmailStatus === 'Connecting' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Authenticating with Google…</p>
              <p className="text-xs text-amber-600">Redirecting to Google OAuth consent screen</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Connect your Gmail account to automatically scan all incoming emails for phishing, malware, BEC and spoofing threats in real-time.
            </p>
            <ul className="space-y-2 mb-4">
              {[
                'Read-only access to inbox',
                'Labels applied automatically after classification',
                'No email data shared with third parties',
                'Revoke access any time from Google settings',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-emerald-500 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={connectGmail}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-200"
            >
              ✉️ Connect Gmail
            </button>
          </>
        )}
      </div>

      {/* OAuth scopes card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">OAuth2 Scopes Requested</h3>
        <div className="space-y-2">
          {[
            { scope: 'gmail.readonly',          desc: 'Read email content for AI threat analysis' },
            { scope: 'gmail.modify',            desc: 'Apply AI-SAFE / AI-QUARANTINE / AI-BLOCKED labels' },
            { scope: 'userinfo.email',          desc: 'Identify connected Gmail address' },
            { scope: 'userinfo.profile',        desc: 'Display name and avatar in dashboard' },
          ].map(({ scope, desc }) => (
            <div key={scope} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
              <span className="text-blue-500 mt-0.5">🔑</span>
              <div>
                <p className="text-xs font-mono font-semibold text-gray-700">{scope}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connection error types card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Possible Connection Issues</h3>
        <div className="space-y-2 text-xs text-gray-600">
          {[
            ['OAuth token expired',       'Token refresh happens automatically. Reconnect if it persists.'],
            ['Gmail permission denied',   'Ensure you granted all requested scopes during OAuth.'],
            ['API quota exceeded',        'Google enforces daily Gmail API limits. Wait or contact support.'],
            ['Connection timeout',        'Check your network connection and retry.'],
          ].map(([issue, fix]) => (
            <div key={issue} className="flex gap-2 p-2 bg-gray-50 rounded">
              <span className="text-red-400">⚠</span>
              <div><span className="font-semibold">{issue}:</span> {fix}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InboxIntegration;
