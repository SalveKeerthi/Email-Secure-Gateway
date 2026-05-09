import { ScoreBadge, ActionBadge, LabelBadge, SourceBadge, TimeAgo, Spinner, EmptyState, Pagination } from '../common';

const EmailTable = ({
  emails = [],
  loading = false,
  newEmailIds = new Set(),
  page,
  pages,
  onPage,
  emptyTitle = 'No emails',
  emptyDescription = '',
}) => {
  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (emails.length === 0) {
    return <EmptyState icon="📭" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Sender', 'Subject', 'Label', 'Risk', 'Auth', 'Action', 'Source', 'Time'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {emails.map((email) => {
              const id = email._id || email.email_id;
              const isNew = newEmailIds.has(id);
              return (
                <tr
                  key={id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isNew ? 'bg-blue-50 animate-fade-in' : ''
                  }`}
                >
                  {/* Sender */}
                  <td className="px-4 py-3">
                    <div className="max-w-[160px]">
                      <p className="text-xs font-mono text-gray-800 truncate">{email.sender}</p>
                      {email.sender_name && (
                        <p className="text-[10px] text-gray-400 truncate">{email.sender_name}</p>
                      )}
                    </div>
                  </td>

                  {/* Subject */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-sm text-gray-800 truncate">{email.subject || '(no subject)'}</p>
                    {email.threat_type && email.threat_type !== 'Clean' && (
                      <p className="text-[10px] text-red-500 font-medium">{email.threat_type}</p>
                    )}
                  </td>

                  {/* Label */}
                  <td className="px-4 py-3">
                    <LabelBadge label={email.gmail_label} />
                  </td>

                  {/* Risk */}
                  <td className="px-4 py-3">
                    <ScoreBadge score={email.risk_score ?? 0} />
                  </td>

                  {/* Auth */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {['SPF', 'DKIM', 'DMARC'].map((proto) => {
                        const val = email[`${proto.toLowerCase()}_result`];
                        const ok  = val === 'pass';
                        return (
                          <span
                            key={proto}
                            title={`${proto}: ${val || 'unknown'}`}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              ok        ? 'bg-emerald-100 text-emerald-700'
                              : val === 'fail' ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {proto}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <ActionBadge action={email.status} />
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    <SourceBadge source={email.source} />
                  </td>

                  {/* Time */}
                  <td className="px-4 py-3">
                    <TimeAgo date={email.timestamp} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <Pagination page={page} pages={pages} onPage={onPage} />
      </div>
    </div>
  );
};

export default EmailTable;
