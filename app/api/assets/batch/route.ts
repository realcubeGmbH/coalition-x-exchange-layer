/**
 * Batch Assets API Routes
 *
 * POST /api/assets/batch - Batch create/submit KPIs for multiple assets
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  withAuth,
  type ApiHandler,
  requireOrganizationId,
  noTenantContextResponse,
} from "@/lib/api-auth";
import { ApiError, handleError } from "@/lib/core/ErrorHandler";
import { createRequestLogger } from "@/lib/core/Logger";
import { kpiService, schemaService } from "@/lib/kpi";
import { FlatKpiSchema, type FlatKpiInput } from "@/lib/kpi/schema";
import { validateDependencies } from "@/lib/kpi/validators";
import { toJsonValue } from "@/lib/utils/json";

// =============================================================================
// Types
// =============================================================================

interface BatchItem {
  external_id?: string;
  asset_id?: string;
  name?: string;
  address?: string;
  kpis: FlatKpiInput;
}

interface BatchBody {
  schema_version?: string;
  items: BatchItem[];
  idempotency_key?: string;
}

interface BatchItemResult {
  index: number;
  external_id?: string;
  asset_id?: string;
  status: "success" | "failed";
  kpi_record_id?: string;
  data_version?: number;
  validation_status?: string;
  errors?: object[];
}

// =============================================================================
// POST /api/assets/batch - Batch submission
// =============================================================================

const handlePost: ApiHandler = async (request, auth) => {
  // Require organization context for batch operations
  if (!requireOrganizationId(auth)) {
    return noTenantContextResponse();
  }

  const logger = createRequestLogger({
    requestId: crypto.randomUUID(),
    endpoint: "/api/assets/batch",
    method: "POST",
    organizationId: auth.organizationId,
    userId: auth.userId,
  });

  const { startTime } = logger.requestStart();

  try {
    // Parse body
    let body: BatchBody;
    try {
      body = await request.json();
    } catch {
      throw ApiError.invalidJson();
    }

    // Validate
    if (!body.items || !Array.isArray(body.items)) {
      throw ApiError.missingField("items");
    }

    if (body.items.length === 0) {
      throw ApiError.validation("Items array cannot be empty");
    }

    if (body.items.length > 100) {
      throw ApiError.validation("Batch limit is 100 items per request");
    }

    // Get schema
    const schema = await schemaService.getSchema(body.schema_version);

    logger.setContext({ schemaVersion: schema.version });
    logger.info(`Processing batch of ${body.items.length} items`);

    // Check idempotency
    if (body.idempotency_key) {
      const existing = await prisma.submission.findUnique({
        where: { idempotencyKey: body.idempotency_key },
        include: { batchItems: true },
      });

      if (existing) {
        logger.info("Idempotent request - returning existing result");

        return NextResponse.json({
          transactionId: existing.id,
          idempotent: true,
          total: existing.totalRecords,
          success_count: existing.successCount,
          failure_count: existing.failureCount,
          results: existing.batchItems.map((item) => ({
            index: item.itemIndex,
            external_id: item.externalId,
            asset_id: item.resourceId,
            status: item.status === "SUCCESS" ? "success" : "failed",
            errors: item.errors,
          })),
        });
      }
    }

    // Create batch submission
    const submission = await prisma.submission.create({
      data: {
        organizationId: auth.organizationId!,
        userId: auth.isOrgLevel ? null : auth.userId,
        submissionType: "BATCH",
        resourceType: "KpiRecord",
        sourceTag: "PARTNER",
        status: "PROCESSING",
        totalRecords: body.items.length,
        idempotencyKey: body.idempotency_key,
        requestPayload: toJsonValue(body),
        kpiVersion: schema.version,
      },
    });

    // Process each item
    const results: BatchItemResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const itemResult: BatchItemResult = {
        index: i,
        external_id: item.external_id,
        asset_id: item.asset_id,
        status: "failed",
        errors: [],
      };

      try {
        // 1. Get or create asset
        let asset;

        if (item.asset_id) {
          // Use existing asset
          asset = await prisma.asset.findFirst({
            where: {
              id: item.asset_id,
              organizationId: auth.organizationId,
            },
          });

          if (!asset) {
            itemResult.errors = [
              {
                code: "ASSET_NOT_FOUND",
                message: `Asset ${item.asset_id} not found`,
              },
            ];
            results.push(itemResult);
            failureCount++;
            continue;
          }
        } else if (item.external_id) {
          // Find or create by external ID
          asset = await prisma.asset.findFirst({
            where: {
              organizationId: auth.organizationId,
              externalId: item.external_id,
            },
          });

          if (!asset) {
            // Create new asset
            asset = await prisma.asset.create({
              data: {
                organizationId: auth.organizationId!,
                externalId: item.external_id,
                name: item.name,
                address: item.address,
                dataSource: "API",
                sourceTag: "PARTNER",
              },
            });
          }
        } else {
          itemResult.errors = [
            {
              code: "MISSING_IDENTIFIER",
              message: "Either asset_id or external_id is required",
            },
          ];
          results.push(itemResult);
          failureCount++;
          continue;
        }

        itemResult.asset_id = asset.id;

        // 2. Validate KPI data
        const parseResult = FlatKpiSchema.safeParse(item.kpis);

        if (!parseResult.success) {
          itemResult.errors = parseResult.error.issues.map((e) => ({
            field: String(e.path.join(".")),
            code: String(e.code),
            message: e.message,
          }));
          results.push(itemResult);
          failureCount++;

          // Store batch item
          await prisma.batchSubmissionItem.create({
            data: {
              submissionId: submission.id,
              itemIndex: i,
              externalId: item.external_id,
              resourceId: asset.id,
              status: "FAILED",
              errors: toJsonValue(itemResult.errors),
              itemPayload: toJsonValue(item),
            },
          });

          continue;
        }

        // 3. Validate subset dependencies
        const depResult = validateDependencies(parseResult.data);
        if (!depResult.valid) {
          itemResult.errors = depResult.errors.map((e) => ({
            field: e.field,
            code: "DEPENDENCY_ERROR",
            message: e.message,
          }));
          results.push(itemResult);
          failureCount++;

          await prisma.batchSubmissionItem.create({
            data: {
              submissionId: submission.id,
              itemIndex: i,
              externalId: item.external_id,
              resourceId: asset.id,
              status: "FAILED",
              errors: toJsonValue(itemResult.errors),
              itemPayload: toJsonValue(item),
            },
          });

          continue;
        }

        // 4. Create KPI record
        const kpiResult = await kpiService.submitKpi({
          assetId: asset.id,
          organizationId: auth.organizationId!,
          kpis: item.kpis,
          schemaVersion: schema.version,
          externalAssetId: item.external_id,
          source: "API",
        });

        // Update validation status
        await kpiService.updateValidationStatus(kpiResult.id, "PASSED");

        // Store batch item
        await prisma.batchSubmissionItem.create({
          data: {
            submissionId: submission.id,
            itemIndex: i,
            externalId: item.external_id,
            resourceId: asset.id,
            status: "SUCCESS",
            itemPayload: toJsonValue(item),
          },
        });

        // Success
        itemResult.status = "success";
        itemResult.kpi_record_id = kpiResult.id;
        itemResult.data_version = kpiResult.dataVersion;
        itemResult.validation_status = "PASSED";
        delete itemResult.errors;

        results.push(itemResult);
        successCount++;
      } catch (error) {
        // Unexpected error for this item
        itemResult.errors = [
          {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        ];
        results.push(itemResult);
        failureCount++;

        await prisma.batchSubmissionItem.create({
          data: {
            submissionId: submission.id,
            itemIndex: i,
            externalId: item.external_id,
            resourceId: item.asset_id,
            status: "FAILED",
            errors: toJsonValue(itemResult.errors),
            itemPayload: toJsonValue(item),
          },
        });
      }
    }

    // Update submission status
    const finalStatus =
      failureCount === 0
        ? "SUCCESS"
        : successCount === 0
        ? "FAILED"
        : "PARTIAL_SUCCESS";

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        successCount,
        failureCount,
        completedAt: new Date(),
      },
    });

    // Audit log
    await logger.audit({
      action: "BATCH_COMPLETED",
      resource: "Submission",
      resourceId: submission.id,
      payload: { total: body.items.length, successCount, failureCount },
      schemaVersion: schema.version,
      statusCode: failureCount === 0 ? 201 : 207,
    });

    logger.requestComplete(startTime, failureCount === 0 ? 201 : 207);

    return NextResponse.json(
      {
        transactionId: submission.id,
        total: body.items.length,
        success_count: successCount,
        failure_count: failureCount,
        schema_version: schema.version,
        results,
      },
      { status: failureCount === 0 ? 201 : 207 }
    );
  } catch (error) {
    logger.requestFailed(
      startTime,
      error instanceof ApiError ? error.statusCode : 500,
      error instanceof Error ? error : undefined
    );
    return handleError(error);
  }
};

// =============================================================================
// Route Export
// =============================================================================

export const POST = withAuth(handlePost, {
  requiredScopes: ["assets:write", "kpis:write"],
});
