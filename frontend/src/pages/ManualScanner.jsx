import { useState } from 'react';
import { emailApi } from '../services/api';
import { ScoreBadge, ActionBadge, LabelBadge, AuthBadge, Spinner } from '../components/common';

const ManualScanner = () => {
  const [mode, setMode]       = useState('fields'); // 'fields' | 'raw'
  const [sender, setSender]   = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [rawEmail, setRaw]    = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = mode === 'raw'
        ? { raw_email: rawEmail }
        : { sender, subject, body };
      const { data } = await emailApi.manualScan(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Manual Email Scanner</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            Optional Testing Tool
          </span>
          <span className="text-xs text-gray-500">Gmail integration is the primary ingestion method</span>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[['fields', 'Form Input'], ['raw', 'Raw Email']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setMode(val)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        {mode === 'fields' ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sender Email</label>
              <input
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="sender@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Paste email body text here…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Raw Email (RFC 2822)</label>
            <textarea
              value={rawEmail}
              onChange={(e) => setRaw(e.target.value)}
              rows={12}
              placeholder="Paste raw email headers + body here…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
        )}

        <button
          onClick={handleScan}
          disabled={loading || (mode === 'fields' ? !sender && !body : !rawEmail)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            loading || (mode === 'fields' ? !sender && !body : !rawEmail)
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200'
          }`}
        >
          {loading ? <><Spinner size="sm" /> Scanning…</> : '🔍 Scan Email'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 animate-slide-in">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Scan Results</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Risk Score',       value: <ScoreBadge score={result.risk_score ?? 0} /> },
              { label: 'Decision',         value: <ActionBadge action={result.status} /> },
              { label: 'Threat Type',      value: <span className="text-sm font-medium text-gray-800">{result.threat_type}</span> },
              { label: 'Gmail Label',      value: <LabelBadge label={result.gmail_label} /> },
              { label: 'Confidence',       value: <span className="text-sm font-medium text-gray-800">{result.confidence_score}%</span> },
              { label: 'Scan Time',        value: <span className="text-sm font-medium text-gray-800">{result.scan_duration_ms}ms</span> },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1.5">{label}</p>
                {value}
              </div>
            ))}
          </div>

          {/* Auth results */}
          <div className="flex gap-2 mb-4">
            <AuthBadge label="SPF"   result={result.spf_result} />
            <AuthBadge label="DKIM"  result={result.dkim_result} />
            <AuthBadge label="DMARC" result={result.dmarc_result} />
          </div>

          {/* Threat indicators */}
          {result.threat_indicators?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-800 mb-2">Threat Indicators Detected</p>
              <ul className="space-y-1">
                {result.threat_indicators.map((ind, i) => (
                  <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                    <span>•</span> {ind}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManualScanner;
