import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { emailApi } from '../services/api';
import { useGmail } from '../contexts/GmailContext';
import { PageHeader, ScoreBadge, ActionBadge, LabelBadge, SourceBadge, TimeAgo, Spinner } from '../components/common';

const SearchPage = () => {
  const { account } = useGmail();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery]   = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await emailApi.search(q, account?._id);
      setResults(data.emails || []);
    } catch (_) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Search on mount if there's a query param
  useEffect(() => {
    if (searchParams.get('q')) doSearch(searchParams.get('q'));
  }, []);

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSearchParams(e.target.value ? { q: e.target.value } : {});
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') doSearch(query);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <PageHeader title="Global Search" sub="Search Gmail-ingested emails by sender, subject, domain, or threat" />

      {/* Search bar */}
      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            autoFocus
            value={query}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder="Search sender, subject, domain, threat type, risk score…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={() => doSearch(query)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Search
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : query.length >= 2 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {results.length} result{results.length !== 1 ? 's' : ''} for <strong>"{query}"</strong>
            </span>
          </div>

          {results.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No emails matched your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Sender', 'Subject', 'Label', 'Risk', 'Threat', 'Action', 'Source', 'Time'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map((e) => (
                    <tr key={e._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-700 max-w-[140px] truncate">{e.sender}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 max-w-[180px] truncate">{e.subject}</td>
                      <td className="px-4 py-3"><LabelBadge label={e.gmail_label} /></td>
                      <td className="px-4 py-3"><ScoreBadge score={e.risk_score ?? 0} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{e.threat_type}</td>
                      <td className="px-4 py-3"><ActionBadge action={e.status} /></td>
                      <td className="px-4 py-3"><SourceBadge source={e.source} /></td>
                      <td className="px-4 py-3"><TimeAgo date={e.timestamp} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400 text-sm">
          Type at least 2 characters and press Enter to search.
        </div>
      )}
    </div>
  );
};

export default SearchPage;
