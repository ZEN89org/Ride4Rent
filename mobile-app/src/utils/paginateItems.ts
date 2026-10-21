export function paginateItems<T>(items: T[], requestedPage: number, pageSize = 5) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1));
  return { page, totalPages, items: items.slice((page - 1) * pageSize, page * pageSize) };
}
