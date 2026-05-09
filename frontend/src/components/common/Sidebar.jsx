import { NavLink } from 'react-router-dom';
import { useGmail } from '../../contexts/GmailContext';
import { ConnStatusBadge } from '../common';

const NAV_ITEMS = [
  { to: '/',           icon: '📊', label: 'Dashboard' },
  { to: '/inbox',      icon: '🔌', label: 'Inbox Integration' },
  { to: '/emails',     icon: '📧', label: 'Incoming Emails' },
  { to: '/quarantine', icon: '🔒', label: 'Quarantined' },
  { to: '/blocked',    icon: '🛑', label: 'Blocked' },
  { to: '/threats',    icon: '🚨', label: 'Threat Intel' },
  { to: '/search',     icon: '🔍', label: 'Search' },
  { to: '/scanner',    icon: '🧪', label: 'Manual Scanner' },
  { to: '/settings',   icon: '⚙️',  label: 'Settings' },
];

const Sidebar = () => {
  const { gmailStatus, account, stats } = useGmail();

  const badgeMap = {
    '/quarantine': stats?.quarantined,
    '/blocked':    stats?.blocked,
  };

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full select-none">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            SG
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">SecureGate</div>
            <div className="text-[10px] text-gray-400 leading-tight tracking-wide uppercase">AI Email Security</div>
          </div>
        </div>
      </div>

      {/* Gmail connection pill */}
      <div className="px-3 py-2.5 border-b border-gray-100">
        <ConnStatusBadge status={gmailStatus} />
        {account?.email && (
          <p className="text-[11px] text-gray-500 mt-1 truncate font-mono">{account.email}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon, label }) => {
          const badge = badgeMap[to];
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-base w-5 text-center">{icon}</span>
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-red-100 text-red-600'
                    }`}>
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 text-center">
        <span className="text-[10px] text-gray-400">v2.0.0 · SOC-Grade</span>
      </div>
    </aside>
  );
};

export default Sidebar;
