export function getPagination(page: number, limit: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(100, Math.floor(limit)) : 20;
  const offset = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, offset };
}
