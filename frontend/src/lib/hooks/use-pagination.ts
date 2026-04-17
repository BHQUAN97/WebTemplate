'use client';

import { useState, useCallback, useMemo } from 'react';

export function usePagination({ initialPage = 1, initialLimit = 20 } = {}) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);
  const goToPage = useCallback((p: number) => setPage(Math.max(1, p)), []);
  const nextPage = useCallback(() => setPage((p) => Math.min(p + 1, totalPages)), [totalPages]);
  const prevPage = useCallback(() => setPage((p) => Math.max(p - 1, 1)), []);

  return { page, limit, total, totalPages, setPage: goToPage, setLimit, setTotal, nextPage, prevPage, offset: (page - 1) * limit };
}
