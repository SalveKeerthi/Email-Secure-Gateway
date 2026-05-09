import { formatDistanceToNow } from 'date-fns';

// ─── Score badge ──────────────────────────────────────────────────────────────
export const ScoreBadge = ({ score }) => {
  const cls = score >= 80
    ? 'bg-red-100 text-red-700 border-red-200'
    : score >= 50
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {score}%
    </span>
  );
};

// ─── Action/Status badge ──────────────────────────────────────────────────────
export const ActionBadge = ({ action }) => {
  const map = {
    ALLOW:      'bg-emerald-100 text-emerald-700 border-emerald-200',
    QUARANTINE: 'bg-amber-100   text-amber-700   border-amber-200',
    BLOCK:      'bg-red-100     text-red-700     border-red-200',
    PENDING:    'bg-gray-100    text-gray-600    border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${map[action] || map.PENDING}`}>
      {action}
    </span>
  );
};

// ─── Gmail label badge ────────────────────────────────────────────────────────
export const LabelBadge = ({ label }) => {
  const map = {
    'AI-SAFE':        'bg-emerald-50 text-emerald-700 border-emerald-200',
    'AI-QUARANTINE':  'bg-amber-50   text-amber-700   border-amber-200',
    'AI-BLOCKED':     'bg-red-50     text-red-700     border-red-200',
    PENDING:          'bg-gray-50    text-gray-500    border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[label] || map.PENDING}`}>
      {label || 'PENDING'}
    </span>
  );
};

// ─── Severity badge ───────────────────────────────────────────────────────────
export const SeverityBadge = ({ sev }) => {
  const map = {
    Low:      'bg-blue-50   text-blue-600',
    Medium:   'bg-amber-50  text-amber-700',
    High:     'bg-orange-50 text-orange-700',
    Critical: 'bg-red-50    text-red-700 font-bold',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[sev] || map.Low}`}>
      {sev}
    </span>
  );
};

// ─── Source badge ─────────────────────────────────────────────────────────────
export const SourceBadge = ({ source = 'gmail' }) => {
  const labels = { gmail:'Gmail', manual:'Manual', smtp:'SMTP', outlook:'Outlook' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
      ✉ {labels[source] || source}
    </span>
  );
};

// ─── Connection status badge ──────────────────────────────────────────────────
export const ConnStatusBadge = ({ status }) => {
  const map = {
    Connected:       'bg-emerald-50 text-emerald-700 border-emerald-200',
    Connecting:      'bg-amber-50   text-amber-700   border-amber-200',
    'Not Connected': 'bg-red-50     text-red-700     border-red-200',
  };
  const dot = {
    Connected:       'bg-emerald-500',
    Connecting:      'bg-amber-400 animate-pulse',
    'Not Connected': 'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
      {status}
    </span>
  );
};

// ─── Authentication result badge ──────────────────────────────────────────────
export const AuthBadge = ({ label, result }) => {
  const ok = result === 'pass';
  const cls = ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                 : result === 'unknown' ? 'bg-gray-50 text-gray-500 border-gray-200'
                 : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {ok ? '✓' : result === 'unknown' ? '?' : '✗'} {label}
    </span>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, icon, color = 'blue', sub, trend }) => {
  const colorMap = {
    blue:    'text-blue-600    bg-blue-50',
    red:     'text-red-600     bg-red-50',
    amber:   'text-amber-600   bg-amber-50',
    emerald: 'text-emerald-600 bg-emerald-50',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <span className={`text-lg p-1.5 rounded-lg ${colorMap[color]}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{(value ?? 0).toLocaleString()}</div>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      {trend != null && (
        <p className={`text-xs font-medium ${trend >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs yesterday
        </p>
      )}
    </div>
  );
};

// ─── Relative timestamp ───────────────────────────────────────────────────────
export const TimeAgo = ({ date }) => {
  if (!date) return <span className="text-xs text-gray-400">—</span>;
  try {
    return (
      <span className="text-xs text-gray-400" title={new Date(date).toLocaleString()}>
        {formatDistanceToNow(new Date(date), { addSuffix: true })}
      </span>
    );
  } catch (_) {
    return <span className="text-xs text-gray-400">—</span>;
  }
};

// ─── Page header ──────────────────────────────────────────────────────────────
export const PageHeader = ({ title, sub, children }) => (
  <div className="flex items-center justify-between mb-5">
    <div>
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-3">{icon}</div>
    <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ─── Loading spinner ──────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md', className = '' }) => {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <div className={`${sz} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin ${className}`} />
  );
};

// ─── Error alert ──────────────────────────────────────────────────────────────
export const ErrorAlert = ({ message, onDismiss, onRetry }) => (
  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl animate-slide-in">
    <span className="text-red-500 mt-0.5">⚠️</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-red-800">Connection Error</p>
      <p className="text-xs text-red-600 mt-0.5 break-words">{message}</p>
    </div>
    <div className="flex gap-2 flex-shrink-0">
      {onRetry && (
        <button onClick={onRetry}
          className="text-xs text-red-600 border border-red-300 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">
          Retry
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      )}
    </div>
  </div>
);

// ─── Toggle switch ────────────────────────────────────────────────────────────
export const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div>
      {label && <p className="text-sm font-medium text-gray-800">{label}</p>}
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
export const Pagination = ({ page, pages, onPage }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 pt-3">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}
        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
        ‹ Prev
      </button>
      <span className="px-3 py-1.5 text-xs text-gray-500">
        {page} / {pages}
      </span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages}
        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
        Next ›
      </button>
    </div>
  );
};
