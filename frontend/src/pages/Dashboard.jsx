import { useState, useEffect } from 'react';
import { useGmail } from '../contexts/GmailContext';
import { StatCard, EmptyState, TimeAgo, ScoreBadge, LabelBadge, ActionBadge, SeverityBadge, SourceBadge, ErrorAlert } from '../components/common';
import PipelineModal from '../components/inbox/PipelineModal';
import { formatDistanceToNow } from 'date-fns';

const Dashboard = ({ onConnect }) => {
  const {
    gmailStatus, account, emails, stats, alerts,
    isSyncing, syncProgress, syncStage, lastSync,
    newEmailIds, connectionError, setConnectionError,
    syncNow,
  } = useGmail();

  const [showPipeline, setShowPipeline] = useState(false);

  // Auto-show pipeline modal when syncing starts
  useEffect(() => {
    if (isSyncing) setShowPipeline(true);
  }, [isSyncing]);

  // ── Not connected empty state ────────────────────────────────────────────
  if (gmailStatus !== 'Connected') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Inbox Connected</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Connect your Gmail inbox to start automatic AI-powered email threat detection.
          </p>
          <button
            onClick={onConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 mx-auto text-sm shadow-sm shadow-blue-200"
          >
            ✉️ Connect Gmail Now
          </button>
        </div>
      </div>
    );
  }

  const recentEmails   = emails.slice(0, 10);
  const threatsTodayCount = stats?.today?.threats ?? 0;
  const emailsSyncedToday = stats?.today?.total    ?? 0;

  return (
    <>
      {showPipeline && <PipelineModal onClose={() => setShowPipeline(false)} />}

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Connection error */}
        {connectionError && (
          <ErrorAlert
            message={connectionError}
            onDismiss={() => setConnectionError(null)}
            onRetry={syncNow}
          />
        )}

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Real-time AI email threat monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPipeline(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            >
              ⚙️ Pipeline
            </button>
            <button
              onClick={syncNow}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isSyncing
                  ? 'bg-blue-50 text-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200'
              }`}
            >
              {isSyncing ? (
                <>
                  <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  Syncing…
                </>
              ) : '⟳ Sync Now'}
            </button>
          </div>
        </div>

        {/* ── Inbox status widget ── */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Inbox Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-gray-800">Connected</span>
                <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{account?.email}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-blue-200 hidden sm:block" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Last Sync</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {lastSync ? formatDistanceToNow(lastSync, { addSuffix: true }) : 'Never'}
              </p>
            </div>
            <div className="h-8 w-px bg-blue-200 hidden sm:block" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Synced Today</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{emailsSyncedToday.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-blue-200 hidden sm:block" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Threats Today</p>
              <p className="text-sm font-semibold text-red-600 mt-1">{threatsTodayCount.toLocaleString()}</p>
            </div>
          </div>

          {/* Sync progress bar */}
          {isSyncing && (
            <div className="mt-3">
              <p className="text-xs text-blue-600 mb-1">{syncStage}</p>
              <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Processed" value={stats?.total}     icon="📧" color="blue"    sub="All time"       trend={12} />
          <StatCard label="Threats Detected" value={stats?.threats}  icon="🚨" color="red"     sub="Quarantine+Block" trend={8}/>
          <StatCard label="Quarantined"       value={stats?.quarantined} icon="🔒" color="amber" sub="Pending review" trend={-3}/>
          <StatCard label="Blocked"           value={stats?.blocked}  icon="🛑" color="red"     sub="Auto-blocked"   trend={5}/>
        </div>

        {/* ── Live stream + Alerts ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Live email stream */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-gray-800">Live Email Stream</span>
              </div>
              <span className="text-xs text-gray-400">{emails.length} emails</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Sender', 'Subject', 'Label', 'Risk', 'Action', 'Source', 'Time'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentEmails.map((email) => {
                    const id    = email._id || email.email_id;
                    const isNew = newEmailIds.has(id);
                    return (
                      <tr key={id} className={`hover:bg-gray-50 transition-colors ${isNew ? 'bg-blue-50 animate-fade-in' : ''}`}>
                        <td className="px-3 py-2.5 text-xs font-mono text-gray-700 max-w-[130px] truncate">{email.sender}</td>
                        <td className="px-3 py-2.5 text-sm text-gray-800 max-w-[160px] truncate">{email.subject}</td>
                        <td className="px-3 py-2.5"><LabelBadge label={email.gmail_label} /></td>
                        <td className="px-3 py-2.5"><ScoreBadge score={email.risk_score ?? 0} /></td>
                        <td className="px-3 py-2.5"><ActionBadge action={email.status} /></td>
                        <td className="px-3 py-2.5"><SourceBadge source={email.source} /></td>
                        <td className="px-3 py-2.5"><TimeAgo date={email.timestamp} /></td>
                      </tr>
                    );
                  })}
                  {recentEmails.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">
                        Waiting for emails…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alert panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">🔔 Live Alerts</span>
              {alerts.filter((a) => a.sev === 'Critical').length > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {alerts.filter((a) => a.sev === 'Critical').length} Critical
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No alerts yet</p>
              ) : (
                alerts.slice(0, 15).map((a) => (
                  <div key={a.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <SeverityBadge sev={a.sev} />
                      <TimeAgo date={a.ts} />
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{a.msg}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Threat breakdown ── */}
        {stats?.threatBreakdown?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Threat Classification Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.threatBreakdown.map(({ _id: type, count }) => {
                const total = stats.threats || 1;
                const pct   = Math.round((count / total) * 100);
                const colorMap = {
                  Phishing: 'text-red-700 bg-red-400',
                  Malware: 'text-red-700 bg-red-400',
                  Spoofing: 'text-amber-700 bg-amber-400',
                  BEC: 'text-orange-700 bg-orange-400',
                  Spam: 'text-blue-700 bg-blue-400',
                  Clean: 'text-emerald-700 bg-emerald-400',
                };
                const [text, bar] = (colorMap[type] || 'text-gray-700 bg-gray-400').split(' ');
                return (
                  <div key={type} className="text-center">
                    <div className={`text-2xl font-bold ${text}`}>{count}</div>
                    <div className="text-xs text-gray-500 mb-1.5">{type}</div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default Dashboard;
