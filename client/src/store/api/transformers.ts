// Common response transformers to reduce duplication in RTK Query slices

// Picks `data` field or returns the response as-is (useful when server wraps payload)
export function pickData<T = unknown, R extends { data?: T } = any>(res: R): T {
  const anyRes = res as any;
  return (anyRes && 'data' in anyRes ? anyRes.data : anyRes) as T;
}

// Picks `data` array or returns an empty array by default
export function pickDataArray<T = unknown, R extends { data?: T[] } = any>(res: R): T[] {
  const anyRes = res as any;
  return (anyRes && Array.isArray(anyRes.data) ? anyRes.data : []) as T[];
}
