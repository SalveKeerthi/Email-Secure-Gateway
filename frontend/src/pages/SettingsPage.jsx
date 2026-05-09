import { useState, useEffect } from 'react';
import { useGmail } from '../contexts/GmailContext';
import { settingsApi, gmailApi } from '../services/api';
import { Toggle, ConnStatusBadge, PageHeader, Spinner } from '../components/common';

const SettingsPage = () => {
  const { account, gmailStatus, connectGmail, disconnectGmail } = useGmail();

  const [settings, setSettings] = useState({
    monitoring_enabled:   true,
    sync_interval:        '30s',
    block_threshold:      80,
    quarantine_threshold: 50,
    notify_on_block:      true,
    notify_on_quarantine: true,
    notify_on_critical:   true,
    auto_label:           true,
  });
  const [loading, setLoading]   = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    if (!account?._id) return;
    settingsApi.get(account._id).then(({ data }) => setSettings(data)).catch(() => {});
  }, [account?._id]);

  const handleChange = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!account?._id) return;
    setLoading(true);
    try {
      await settingsApi.update(account._id, settings);
      // Sync interval to backend scheduler
      const intervalMap = { '30s': 30, '1m': 60, '5m': 300, manual: null };
      await gmailApi.updateMonitoring(account._id, settings.monitoring_enabled, intervalMap[settings.sync_interval]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 max-w-2xl">
      <PageHeader title="Settings" sub="Configure AI scanning and inbox integration" />

      {/* Monitoring */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Automatic Inbox Monitoring</h3>
        <Toggle
          label="Enable Automatic Inbox Monitoring"
          description="Continuously scan incoming Gmail messages via background scheduler"
          checked={settings.monitoring_enabled}
          onChange={(v) => handleChange('monitoring_enabled', v)}
        />
        {!settings.monitoring_enabled && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-amber-500">⚠️</span>
            <span className="text-xs text-amber-700 font-medium">Inbox monitoring is currently disabled</span>
          </div>
        )}
      </section>

      {/* Sync interval */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Inbox Sync Frequency</h3>
        <select
          value={settings.sync_interval}
          onChange={(e) => handleChange('sync_interval', e.target.value)}
          className="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="30s">Every 30 seconds</option>
          <option value="1m">Every 1 minute</option>
          <option value="5m">Every 5 minutes</option>
          <option value="manual">Manual only</option>
        </select>
      </section>

      {/* Connected accounts */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Connected Gmail Accounts</h3>
        {gmailStatus === 'Connected' && account ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
              {account.email?.[0]?.toUpperCase() || 'G'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{account.email}</p>
              <ConnStatusBadge status={gmailStatus} />
            </div>
            <div className="flex gap-2">
              <button onClick={disconnectGmail}
                className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                Disconnect
              </button>
              <button onClick={connectGmail}
                className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                Reconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">No Gmail accounts connected.</div>
        )}
      </section>

      {/* Risk thresholds */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Risk Score Thresholds</h3>
        <div className="space-y-4">
          {[
            { label: 'BLOCK threshold (≥)',        key: 'block_threshold',      color: 'red' },
            { label: 'QUARANTINE threshold (≥)',   key: 'quarantine_threshold', color: 'amber' },
          ].map(({ label, key, color }) => {
            const cls = color === 'red' ? 'accent-red-600' : 'accent-amber-500';
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">{label}</span>
                  <span className={`text-sm font-bold ${color === 'red' ? 'text-red-600' : 'text-amber-600'}`}>
                    {settings[key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={settings[key]}
                  onChange={(e) => handleChange(key, parseInt(e.target.value))}
                  className={`w-full h-2 rounded-full ${cls}`}
                />
              </div>
            );
          })}
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-medium">BLOCK ≥ {settings.block_threshold}</span>
            <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">QUARANTINE {settings.quarantine_threshold}–{settings.block_threshold - 1}</span>
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">ALLOW &lt; {settings.quarantine_threshold}</span>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Notifications</h3>
        <div className="space-y-2">
          <Toggle label="Notify on BLOCK"      checked={settings.notify_on_block}      onChange={(v) => handleChange('notify_on_block', v)} />
          <Toggle label="Notify on QUARANTINE" checked={settings.notify_on_quarantine} onChange={(v) => handleChange('notify_on_quarantine', v)} />
          <Toggle label="Notify on Critical"   checked={settings.notify_on_critical}   onChange={(v) => handleChange('notify_on_critical', v)} />
          <Toggle label="Auto-apply Gmail Labels" description="Automatically apply AI-SAFE / AI-QUARANTINE / AI-BLOCKED labels"
            checked={settings.auto_label} onChange={(v) => handleChange('auto_label', v)} />
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-blue-200"
        >
          {loading ? <><Spinner size="sm" /> Saving…</> : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium animate-fade-in">✓ Settings saved</span>}
      </div>
    </div>
  );
};

export default SettingsPage;
