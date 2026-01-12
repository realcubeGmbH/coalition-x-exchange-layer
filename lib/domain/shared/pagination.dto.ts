/**
 * Pagination DTOs
 *
 * Shared types for paginated API responses.
 */

import { z } from "zod";

// =============================================================================
// Query DTOs
// =============================================================================

/**
 * Standard pagination query parameters
 */
export interface PaginationQuery {
  page: number;
  limit: number;
}

/**
 * Zod schema for parsing pagination query params
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// Response DTOs
// =============================================================================

/**
 * Pagination metadata included in paginated responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Generic paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Helper to create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Helper to create a paginated result
 */
export function createPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResult<T> {
  return {
    data,
    pagination: createPaginationMeta(page, limit, total),
  };
}

/**
 * Calculate skip value for Prisma pagination
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
