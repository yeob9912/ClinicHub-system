import { PaginationMeta } from '../types';

export interface PaginationParams {
  page: number;
  limit: number;
}

export function parsePagination(
  rawPage?: string | number,
  rawLimit?: string | number,
  maxLimit = 100
): PaginationParams {
  const page = Math.max(1, parseInt(String(rawPage ?? '1'), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(rawLimit ?? '20'), 10) || 20));
  return { page, limit };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
