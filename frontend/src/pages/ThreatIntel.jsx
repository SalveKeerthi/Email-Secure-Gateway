import { useState, useEffect } from 'react';
import { useGmail } from '../contexts/GmailContext';
import { dashboardApi } from '../services/api';
import { PageHeader, ScoreBadge, ActionBadge, LabelBadge, TimeAgo, Spinner } from '../components/common';

const ThreatIntel = () => {
  const { account, emails: liveEmails } = useGmail();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await dashboardApi.getStats(account?._id);
        setStats(data);
      } catch (_) {} finally {
        setLoading(false);
      }
    };
    load();
  }, [account?._id]);

  const highRisk = [...liveEmails].filter((e) => (e.risk_score ?? 0) > 50).slice(0, 20);

  const TYPE_COLORS = {
    Phishing:          'border-red-200    bg-red-50    text-red-700',
    Malware:           'border-red-200    bg-red-50    text-red-700',
    Spoofing:          'border-orange-200 bg-orange-50 text-orange-700',
    BEC:               'border-orange-200 bg-orange-50 text-orange-700',
    'Credential Harvest': 'border-red-200 bg-red-50    text-red-700',
    Spam:              'border-amber-200  bg-amber-50  text-amber-700',
    Ransomware:        'border-red-200    bg-red-50    text-red-700',
    Clean:             'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <PageHeader title="Threat Intelligence" sub="AI-detected classification breakdown" />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Threat type cards */}
          {stats?.threatBreakdown?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {stats.threatBreakdown.map(({ _id: type, count }) => {
                const cls = TYPE_COLORS[type] || 'border-gray-200 bg-gray-50 text-gray-700';
                const pct = Math.round((count / (stats.threats || 1)) * 100);
                return (
                  <div key={type} className={`rounded-xl border p-4 ${cls}`}>
                    <div className="text-2xl font-bold mb-0.5">{count}</div>
                    <div className="text-sm font-semibold mb-2">{type}</div>
                    <div className="w-full bg-white/60 rounded-full h-1.5">
                      <div className="h-full rounded-full bg-current opacity-50" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] mt-1 opacity-70">{pct}% of threats</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Auth failure summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Email Authentication Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {['SPF', 'DKIM', 'DMARC'].map((proto) => {
                const pass = liveEmails.filter((e) => e[`${proto.toLowerCase()}_result`] === 'pass').length;
                const fail = liveEmails.filter((e) => e[`${proto.toLowerCase()}_result`] === 'fail').length;
                const total = pass + fail || 1;
                return (
                  <div key={proto} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-bold text-gray-800 mb-1">{proto}</div>
                    <div className="text-xs text-emerald-600 font-semibold">✓ {pass} pass</div>
                    <div className="text-xs text-red-600 font-semibold">✗ {fail} fail</div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.round((pass / total) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High-risk email table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">High-Risk Emails</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Sender', 'Subject', 'Threat', 'Risk', 'Action', 'Label', 'Time'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {highRisk.map((e) => (
                    <tr key={e._id || e.email_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-700 max-w-[140px] truncate">{e.sender}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 max-w-[180px] truncate">{e.subject}</td>
                      <td className="px-4 py-3 text-xs font-medium text-red-600">{e.threat_type}</td>
                      <td className="px-4 py-3"><ScoreBadge score={e.risk_score ?? 0} /></td>
                      <td className="px-4 py-3"><ActionBadge action={e.status} /></td>
                      <td className="px-4 py-3"><LabelBadge label={e.gmail_label} /></td>
                      <td className="px-4 py-3"><TimeAgo date={e.timestamp} /></td>
                    </tr>
                  ))}
                  {highRisk.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-xs text-gray-400">No high-risk emails detected.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThreatIntel;
