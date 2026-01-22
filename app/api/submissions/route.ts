/**
 * Submissions API
 *
 * GET /api/submissions - List all submissions for authenticated organization
 */

import { NextResponse } from "next/server";
import { withAuth, type ApiHandler } from "@/lib/api-auth";
import { submissionService } from "@/lib/services";
import { handleError } from "@/lib/core/ErrorHandler";
import { calculateSkip, createPaginatedResult } from "@/lib/domain/shared";
import type { SubmissionStatus, ValidationStatus, SubmissionType, SourceTag } from "@prisma/client";

// =============================================================================
// GET - List Submissions for Organization
// =============================================================================

const handleGet: ApiHandler = async (request, auth) => {
  try {
    const url = new URL(request.url);

    // Pagination
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const skip = calculateSkip(page, limit);

    // Optional filters
    const filters: {
      status?: SubmissionStatus;
      validationStatus?: ValidationStatus;
      submissionType?: SubmissionType;
      sourceTag?: SourceTag;
    } = {};

    const statusParam = url.searchParams.get("status");
    if (statusParam) {
      filters.status = statusParam as SubmissionStatus;
    }

    const validationStatusParam = url.searchParams.get("validationStatus");
    if (validationStatusParam) {
      filters.validationStatus = validationStatusParam as ValidationStatus;
    }

    const submissionTypeParam = url.searchParams.get("submissionType");
    if (submissionTypeParam) {
      filters.submissionType = submissionTypeParam as SubmissionType;
    }

    const sourceTagParam = url.searchParams.get("sourceTag");
    if (sourceTagParam) {
      filters.sourceTag = sourceTagParam as SourceTag;
    }

    // Fetch submissions and total count
    const [submissions, total] = await Promise.all([
      submissionService.findManyByOrganization({
        organizationId: auth.organizationId!,
        skip,
        take: limit,
        filters,
      }),
      submissionService.countByOrganization({
        organizationId: auth.organizationId!,
        filters,
      }),
    ]);

    return NextResponse.json(
      createPaginatedResult(submissions, page, limit, total)
    );
  } catch (error) {
    return handleError(error);
  }
};

// =============================================================================
// Route Export
// =============================================================================

export const GET = withAuth(handleGet, {
  requiredScopes: ["submissions:read"],
});
