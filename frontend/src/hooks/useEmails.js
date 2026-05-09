import { useState, useEffect, useCallback } from 'react';
import { emailApi } from '../services/api';

/**
 * Hook to fetch paginated emails from any of the three endpoints.
 * @param {'incoming'|'quarantined'|'blocked'} type
 * @param {string} accountId
 */
const useEmails = (type = 'incoming', accountId = null) => {
  const [emails, setEmails]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  const fetcher = {
    incoming:    emailApi.getIncoming,
    quarantined: emailApi.getQuarantined,
    blocked:     emailApi.getBlocked,
  }[type] || emailApi.getIncoming;

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetcher({ page: p, search: q || undefined, accountId: accountId || undefined });
      setEmails(data.emails || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [type, accountId]);

  useEffect(() => { load(1, search); }, [type, accountId]);

  const refresh = () => load(page, search);
  const goToPage = (p) => { setPage(p); load(p, search); };
  const handleSearch = (q) => { setSearch(q); load(1, q); };

  return { emails, total, page, pages, loading, error, search,
           refresh, goToPage, handleSearch };
};

export default useEmails;
