import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGmail } from '../../contexts/GmailContext';
import { SeverityBadge, TimeAgo } from '../common';

const TopBar = () => {
  const { topBarSyncing, syncProgress, syncStage, alerts, account } = useGmail();
  const [showAlerts, setShowAlerts] = useState(false);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const unread = alerts.filter((a) => !a.read).length;
  const criticals = alerts.filter((a) => a.sev === 'Critical' && !a.read).length;

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center gap-3 flex-shrink-0 z-10">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search emails…  (Enter)"
          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
        />
      </div>

      {/* Sync progress bar */}
      {topBarSyncing && (
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] text-blue-600 font-medium truncate">{syncStage || 'Syncing…'}</p>
            <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
          >
            <span className="text-lg">🔔</span>
            {criticals > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 animate-slide-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Live Alerts</span>
                {unread > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {alerts.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No alerts yet</p>
                ) : (
                  alerts.slice(0, 20).map((a) => (
                    <div key={a.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
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
          )}
        </div>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center">
          {account?.email?.[0]?.toUpperCase() || 'SG'}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
