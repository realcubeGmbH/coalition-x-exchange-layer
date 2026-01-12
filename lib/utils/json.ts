/**
 * JSON Utilities
 * Type-safe helpers for working with Prisma JSON fields
 */

import type { Prisma } from "@prisma/client";

/**
 * Convert any typed object to Prisma's InputJsonValue without type assertions.
 * Uses JSON roundtrip to satisfy Prisma's strict index signature requirements.
 */
export function toJsonValue<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Type guard to check if a value is a plain object (Record<string, unknown>).
 * Useful for safely narrowing Prisma JsonValue types.
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is an array.
 */
export function isJsonArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

