export function safeRows<T>(rows: T[] | null | undefined): T[] {
  return Array.isArray(rows) ? rows : [];
}
