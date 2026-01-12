/**
 * Checksum Utilities
 * MD5 checksums for JSON objects (used for KPI data and schema comparison)
 */

import { createHash } from "crypto";
import { isJsonObject } from "./json";

/**
 * Compute MD5 checksum of a JSON object
 * Uses deterministic JSON stringification (sorted keys) for consistency
 */
export function computeChecksum(data: unknown): string {
  const normalized = normalizeJson(data);
  const jsonString = JSON.stringify(normalized);
  return createHash("md5").update(jsonString).digest("hex");
}

/**
 * Normalize JSON for consistent checksums
 * - Sorts object keys alphabetically (recursive)
 * - Handles arrays, nested objects, and primitives
 */
function normalizeJson(data: unknown): unknown {
  if (data === null || data === undefined) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map(normalizeJson);
  }

  if (isJsonObject(data)) {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(data).sort();

    for (const key of keys) {
      sorted[key] = normalizeJson(data[key]);
    }

    return sorted;
  }

  return data;
}

/**
 * Check if two JSON objects are equal by comparing checksums
 */
export function checksumEquals(a: unknown, b: unknown): boolean {
  return computeChecksum(a) === computeChecksum(b);
}

/**
 * Verify data matches an expected checksum
 */
export function verifyChecksum(data: unknown, checksum: string): boolean {
  return computeChecksum(data) === checksum;
}
