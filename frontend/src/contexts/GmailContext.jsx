import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi, gmailApi, dashboardApi } from '../services/api';
import { getSocket, SOCKET_EVENTS } from '../services/socket';

const GmailContext = createContext(null);

export const GmailProvider = ({ children }) => {
  const [account, setAccount]             = useState(null);   // GmailAccount doc
  const [gmailStatus, setGmailStatus]     = useState('Not Connected'); // 'Not Connected' | 'Connecting' | 'Connected'
  const [emails, setEmails]               = useState([]);
  const [stats, setStats]                 = useState({ total:0, threats:0, quarantined:0, blocked:0, today:{} });
  const [alerts, setAlerts]               = useState([]);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [syncProgress, setSyncProgress]   = useState(0);
  const [syncStage, setSyncStage]         = useState('');
  const [lastSync, setLastSync]           = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [newEmailIds, setNewEmailIds]     = useState(new Set());
  const [topBarSyncing, setTopBarSyncing] = useState(false);
  const socketRef = useRef(null);

  // ─── Load persisted account from localStorage ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('sg_account');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAccount(parsed);
        setGmailStatus('Connected');
        refreshStats(parsed._id);
        loadRecentEmails(parsed._id);
      } catch (_) {
        localStorage.removeItem('sg_account');
      }
    }
  }, []);

  // ─── Handle OAuth callback params from URL ────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (oauth === 'success') {
      const accountId = params.get('accountId');
      const email     = params.get('email');
      const name      = params.get('name');
      const acct = { _id: accountId, email, display_name: name };
      setAccount(acct);
      setGmailStatus('Connected');
      localStorage.setItem('sg_account', JSON.stringify(acct));
      // Clean URL
      window.history.replaceState({}, '', '/');
      refreshStats(accountId);
      loadRecentEmails(accountId);
    } else if (oauth === 'error') {
      const reason = params.get('reason') || 'Unknown error';
      setConnectionError(reason);
      setGmailStatus('Not Connected');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // ─── Socket.IO listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Log connection state explicitly (helps debug “network connection error”)
    const onConnect = () => setConnectionError(null);
    socket.on('connect', onConnect);

    socket.on(SOCKET_EVENTS.SYNC_STARTED, (data) => {
      setIsSyncing(true);
      setTopBarSyncing(true);
      setSyncProgress(0);
      setSyncStage(data.stages?.[0] || 'Connecting…');
    });

    socket.on(SOCKET_EVENTS.SYNC_PROGRESS, (data) => {
      setSyncProgress(data.percent || 0);
      setSyncStage(data.stageName || '');
    });

    socket.on(SOCKET_EVENTS.SYNC_COMPLETED, (data) => {
      setIsSyncing(false);
      setTopBarSyncing(false);
      setSyncProgress(100);
      setLastSync(new Date());
      if (account?._id) {
        refreshStats(account._id);
      }
    });

    socket.on(SOCKET_EVENTS.EMAIL_ALLOWED, (email) => {
      appendEmail(email);
    });

    socket.on(SOCKET_EVENTS.EMAIL_QUARANTINED, (email) => {
      appendEmail(email);
      pushAlert({ msg: `Email quarantined from ${email.sender}`, sev: 'Medium', email });
    });

    socket.on(SOCKET_EVENTS.EMAIL_BLOCKED, (email) => {
      appendEmail(email);
      pushAlert({ msg: `🛑 Blocked: ${email.threat_type} from ${email.sender}`, sev: 'High', email });
    });

    socket.on(SOCKET_EVENTS.NEW_THREAT, (email) => {
      const sevMap = { Phishing:'Critical', Malware:'Critical', BEC:'High', Spoofing:'High', Spam:'Medium' };
      pushAlert({
        msg: `${email.threat_type} detected from ${email.sender}`,
        sev: sevMap[email.threat_type] || 'Medium',
        email,
      });
    });

    socket.on(SOCKET_EVENTS.CONNECTION_ERROR, (data) => {
      setConnectionError(data.message || 'Connection error');
    });

    return () => {
      // Cleanup socket listeners on unmount
      Object.values(SOCKET_EVENTS).forEach((ev) => {
        socket.off(ev);
      });
    };
  }, [account]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const appendEmail = (email) => {
    setEmails((prev) => {
      if (prev.find((e) => e._id === email._id || e.email_id === email.email_id)) return prev;
      return [email, ...prev].slice(0, 200);
    });
    setNewEmailIds((prev) => {
      const next = new Set(prev);
      next.add(email._id || email.email_id);
      setTimeout(() => setNewEmailIds((s) => { const n = new Set(s); n.delete(email._id || email.email_id); return n; }), 4000);
      return next;
    });
  };

  const pushAlert = ({ msg, sev, email }) => {
    setAlerts((prev) => [{
      id: Date.now(),
      msg,
      sev,
      ts: new Date(),
      email,
    }, ...prev].slice(0, 50));
  };

  const refreshStats = useCallback(async (accountId) => {
    try {
      const { data } = await dashboardApi.getStats(accountId);
      setStats(data);
    } catch (_) {}
  }, []);

  const loadRecentEmails = useCallback(async (accountId) => {
    try {
      const { data } = await dashboardApi.getRecentEmails(accountId, 50);
      setEmails(data.emails || []);
    } catch (_) {}
  }, []);

  // ─── Public actions ───────────────────────────────────────────────────────
  const connectGmail = async () => {
    setGmailStatus('Connecting');
    setConnectionError(null);
    try {
      const { data } = await authApi.getGmailAuthUrl();
      // Open OAuth popup
      window.location.href = data.url;
    } catch (err) {
      setGmailStatus('Not Connected');
      setConnectionError(err.message);
    }
  };

  const disconnectGmail = async () => {
    if (!account?._id) return;
    try {
      await authApi.disconnectGmail(account._id);
      setAccount(null);
      setGmailStatus('Not Connected');
      setEmails([]);
      setStats({ total:0, threats:0, quarantined:0, blocked:0, today:{} });
      localStorage.removeItem('sg_account');
    } catch (err) {
      setConnectionError(err.message);
    }
  };

  const syncNow = async () => {
    if (!account?._id || isSyncing) return;
    try {
      await gmailApi.syncNow(account._id);
    } catch (err) {
      setConnectionError(err.message);
    }
  };

  return (
    <GmailContext.Provider value={{
      account, gmailStatus, emails, stats, alerts,
      isSyncing, syncProgress, syncStage, lastSync,
      connectionError, setConnectionError,
      newEmailIds, topBarSyncing,
      connectGmail, disconnectGmail, syncNow,
      refreshStats, loadRecentEmails,
    }}>
      {children}
    </GmailContext.Provider>
  );
};

export const useGmail = () => {
  const ctx = useContext(GmailContext);
  if (!ctx) throw new Error('useGmail must be used inside GmailProvider');
  return ctx;
};
