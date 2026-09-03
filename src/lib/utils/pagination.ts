import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants";

export type PaginationInput = {
  page?: number | string | null;
  pageSize?: number | string | null;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizePagination(input: PaginationInput = {}) {
  const page = positiveInteger(input.page, 1);
  const pageSize = Math.min(positiveInteger(input.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  } as const;
}

export function buildPaginationMeta(total: number, input: PaginationInput = {}): PaginationMeta {
  const { page, pageSize } = normalizePagination(input);
  const safeTotal = Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0;
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / pageSize);
  return {
    page,
    pageSize,
    total: safeTotal,
    totalPages,
    hasNextPage: totalPages > 0 && page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

export function getSupabaseRange(input: PaginationInput = {}) {
  const { offset, limit } = normalizePagination(input);
  return { from: offset, to: offset + limit - 1 };
}
