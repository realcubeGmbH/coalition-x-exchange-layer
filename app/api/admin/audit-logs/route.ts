/**
 * Audit Logs API
 *
 * GET /api/admin/audit-logs - View audit logs (Admin only)
 */

import { NextResponse } from "next/server";
import { withAuth, type ApiHandler } from "@/lib/api-auth";
import { auditRepository } from "@/lib/repositories";

// =============================================================================
// GET - List Audit Logs
// =============================================================================

const handleGet: ApiHandler = async (request) => {
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const skip = (page - 1) * limit;

  // Optional filters
  const filters = {
    action: (url.searchParams.get("action") as never) || undefined,
    resource: url.searchParams.get("resource") || undefined,
    userId: url.searchParams.get("userId") || undefined,
    organizationId: url.searchParams.get("organizationId") || undefined,
  };

  const [logs, total] = await Promise.all([
    auditRepository.findMany({ filters, skip, take: limit }),
    auditRepository.count(filters),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

export const GET = withAuth(handleGet, {
  requiredScopes: ["admin:audit"],
});
