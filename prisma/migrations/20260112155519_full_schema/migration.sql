-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('ACCREDITED_PARTNER', 'CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMIN', 'PARTNER_ADMIN', 'PARTNER_USER', 'CLIENT_ADMIN', 'CLIENT_USER');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUAL', 'API', 'BULK_UPLOAD');

-- CreateEnum
CREATE TYPE "SourceTag" AS ENUM ('MANUAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('SINGLE', 'BATCH');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'VALIDATING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_FAILED', 'API_TOKEN_CREATED', 'API_TOKEN_USED', 'API_TOKEN_REVOKED', 'ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_DELETED', 'KPI_SUBMITTED', 'KPI_UPDATED', 'KPI_MERGED', 'SUBMISSION_CREATED', 'SUBMISSION_COMPLETED', 'SUBMISSION_FAILED', 'BATCH_STARTED', 'BATCH_COMPLETED', 'VALIDATION_PASSED', 'VALIDATION_FAILED', 'QUEUE_ITEM_CREATED', 'QUEUE_ITEM_COMPLETED', 'QUEUE_ITEM_FAILED', 'QUEUE_ITEM_RETRY', 'QUEUE_ITEM_DEAD_LETTER', 'FRAUNHOFER_REQUEST_SENT', 'FRAUNHOFER_CALLBACK_RECEIVED', 'FRAUNHOFER_VERIFIED', 'SIGNING_REQUESTED', 'SIGNING_COMPLETED', 'SIGNING_FAILED', 'DOCUMENT_VERIFIED', 'DOCUMENT_ACCESSED', 'DOCUMENT_DOWNLOADED', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'PARTNER_REQUEST_CREATED', 'PARTNER_REQUEST_APPROVED', 'PARTNER_REQUEST_REJECTED', 'WEBHOOK_TRIGGERED', 'WEBHOOK_FAILED', 'ORG_CREATED', 'ORG_UPDATED', 'ORG_ACTIVATED', 'ORG_DELETED', 'API_CREDENTIALS_CREATED', 'API_CREDENTIALS_ROTATED');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "FraunhoferStatus" AS ENUM ('PENDING', 'SENT', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SigningStatus" AS ENUM ('PENDING', 'REQUESTED', 'PROCESSING', 'SIGNED', 'FAILED');

-- CreateEnum
CREATE TYPE "GranteeType" AS ENUM ('BANK', 'INVESTOR', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('STATUS_CHECK', 'DOWNLOAD', 'VERIFY');

-- CreateEnum
CREATE TYPE "PartnerRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT,
    "apiKey" TEXT,
    "apiKeyHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT,
    "address" TEXT,
    "description" TEXT,
    "dataSource" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "sourceTag" "SourceTag" NOT NULL DEFAULT 'MANUAL',
    "submittedVia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_registries" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "checksum" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "changelog" TEXT,
    "deprecatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schema_registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "previousVersionId" TEXT,
    "description" TEXT,
    "changedBy" TEXT,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_records" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submissionId" TEXT,
    "dataVersion" INTEGER NOT NULL,
    "schemaVersionId" TEXT NOT NULL,
    "kpiData" JSONB NOT NULL,
    "checksum" TEXT,
    "externalAssetId" TEXT,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationErrors" JSONB,
    "source" "DataSource" NOT NULL DEFAULT 'API',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT,
    "refreshExpiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "method" TEXT,
    "endpoint" TEXT,
    "statusCode" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestHeaders" JSONB,
    "payload" JSONB,
    "response" JSONB,
    "schemaVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "submissionType" "SubmissionType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "sourceTag" "SourceTag" NOT NULL DEFAULT 'MANUAL',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "totalRecords" INTEGER NOT NULL DEFAULT 1,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationErrors" JSONB,
    "errors" JSONB,
    "warnings" JSONB,
    "idempotencyKey" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestPayload" JSONB,
    "responseTime" INTEGER,
    "kpiVersion" TEXT,
    "ingestTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrichedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_submission_items" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "externalId" TEXT,
    "resourceId" TEXT,
    "status" "SubmissionStatus" NOT NULL,
    "errors" JSONB,
    "itemPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_submission_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_items" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "queueName" TEXT NOT NULL DEFAULT 'fraunhofer',
    "queueStatus" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "isDeadLetter" BOOLEAN NOT NULL DEFAULT false,
    "deadLetterAt" TIMESTAMP(3),
    "deadLetterReason" TEXT,

    CONSTRAINT "queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraunhofer_requests" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" "FraunhoferStatus" NOT NULL DEFAULT 'PENDING',
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "endpoint" TEXT,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "callbackId" TEXT,
    "callbackReceived" BOOLEAN NOT NULL DEFAULT false,
    "pollCount" INTEGER NOT NULL DEFAULT 0,
    "lastPolledAt" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fraunhofer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signing_requests" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" "SigningStatus" NOT NULL DEFAULT 'PENDING',
    "requestPayload" JSONB,
    "trustLayerRequestId" TEXT,
    "holderIdentity" TEXT,
    "verifierDetails" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "idempotencyKey" TEXT,
    "requestDuration" INTEGER,
    "responseDuration" INTEGER,
    "kpiVersion" TEXT,
    "userId" TEXT,
    "systemId" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "signedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signed_documents" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER,
    "storageUrl" TEXT NOT NULL,
    "checksum" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "signatureTimestamp" TIMESTAMP(3),
    "signerIdentity" TEXT,
    "signatureContext" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationDetails" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_access_grants" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "granteeType" "GranteeType" NOT NULL,
    "granteeId" TEXT NOT NULL,
    "granteeName" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "canDownload" BOOLEAN NOT NULL DEFAULT true,
    "canVerify" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimit" INTEGER NOT NULL DEFAULT 100,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "limitResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_access_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "accessorType" "GranteeType" NOT NULL,
    "accessorId" TEXT NOT NULL,
    "action" "AccessAction" NOT NULL,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "duration" INTEGER,
    "verified" BOOLEAN,
    "verificationResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_requests" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "website" TEXT,
    "integrationType" TEXT NOT NULL,
    "estimatedVolume" INTEGER,
    "useCase" TEXT NOT NULL,
    "status" "PartnerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "organizationId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "partner_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_clientId_key" ON "organizations"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_apiKey_key" ON "organizations"("apiKey");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "organizations"("type");

-- CreateIndex
CREATE INDEX "assets_organizationId_idx" ON "assets"("organizationId");

-- CreateIndex
CREATE INDEX "assets_name_idx" ON "assets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "assets_organizationId_externalId_key" ON "assets"("organizationId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "schema_registries_version_key" ON "schema_registries"("version");

-- CreateIndex
CREATE INDEX "schema_registries_checksum_idx" ON "schema_registries"("checksum");

-- CreateIndex
CREATE INDEX "validation_rules_name_isActive_idx" ON "validation_rules"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "validation_rules_name_version_key" ON "validation_rules"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_records_submissionId_key" ON "kpi_records"("submissionId");

-- CreateIndex
CREATE INDEX "kpi_records_assetId_createdAt_idx" ON "kpi_records"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "kpi_records_organizationId_createdAt_idx" ON "kpi_records"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "kpi_records_schemaVersionId_idx" ON "kpi_records"("schemaVersionId");

-- CreateIndex
CREATE INDEX "kpi_records_validationStatus_idx" ON "kpi_records"("validationStatus");

-- CreateIndex
CREATE INDEX "kpi_records_checksum_idx" ON "kpi_records"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_records_assetId_dataVersion_key" ON "kpi_records"("assetId", "dataVersion");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_key" ON "api_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_refreshToken_key" ON "api_tokens"("refreshToken");

-- CreateIndex
CREATE INDEX "api_tokens_organizationId_idx" ON "api_tokens"("organizationId");

-- CreateIndex
CREATE INDEX "api_tokens_expiresAt_idx" ON "api_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "api_tokens_revoked_idx" ON "api_tokens"("revoked");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_idempotencyKey_key" ON "submissions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "submissions_organizationId_submittedAt_idx" ON "submissions"("organizationId", "submittedAt");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submissions_validationStatus_idx" ON "submissions"("validationStatus");

-- CreateIndex
CREATE INDEX "submissions_sourceTag_idx" ON "submissions"("sourceTag");

-- CreateIndex
CREATE UNIQUE INDEX "batch_submission_items_submissionId_itemIndex_key" ON "batch_submission_items"("submissionId", "itemIndex");

-- CreateIndex
CREATE UNIQUE INDEX "queue_items_submissionId_key" ON "queue_items"("submissionId");

-- CreateIndex
CREATE INDEX "queue_items_queueStatus_priority_queuedAt_idx" ON "queue_items"("queueStatus", "priority", "queuedAt");

-- CreateIndex
CREATE INDEX "queue_items_queueName_queueStatus_idx" ON "queue_items"("queueName", "queueStatus");

-- CreateIndex
CREATE INDEX "queue_items_isDeadLetter_idx" ON "queue_items"("isDeadLetter");

-- CreateIndex
CREATE INDEX "queue_items_nextRetryAt_idx" ON "queue_items"("nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "fraunhofer_requests_submissionId_key" ON "fraunhofer_requests"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "fraunhofer_requests_callbackId_key" ON "fraunhofer_requests"("callbackId");

-- CreateIndex
CREATE INDEX "fraunhofer_requests_status_idx" ON "fraunhofer_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "signing_requests_trustLayerRequestId_key" ON "signing_requests"("trustLayerRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "signing_requests_idempotencyKey_key" ON "signing_requests"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "signing_requests_signedDocumentId_key" ON "signing_requests"("signedDocumentId");

-- CreateIndex
CREATE INDEX "signing_requests_assetId_idx" ON "signing_requests"("assetId");

-- CreateIndex
CREATE INDEX "signing_requests_status_idx" ON "signing_requests"("status");

-- CreateIndex
CREATE INDEX "signed_documents_assetId_idx" ON "signed_documents"("assetId");

-- CreateIndex
CREATE INDEX "signed_documents_signedAt_idx" ON "signed_documents"("signedAt");

-- CreateIndex
CREATE INDEX "signed_documents_expiresAt_idx" ON "signed_documents"("expiresAt");

-- CreateIndex
CREATE INDEX "document_access_grants_granteeType_granteeId_idx" ON "document_access_grants"("granteeType", "granteeId");

-- CreateIndex
CREATE INDEX "document_access_grants_expiresAt_idx" ON "document_access_grants"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "document_access_grants_documentId_granteeType_granteeId_key" ON "document_access_grants"("documentId", "granteeType", "granteeId");

-- CreateIndex
CREATE INDEX "document_access_logs_documentId_createdAt_idx" ON "document_access_logs"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "document_access_logs_accessorType_accessorId_createdAt_idx" ON "document_access_logs"("accessorType", "accessorId", "createdAt");

-- CreateIndex
CREATE INDEX "document_access_logs_action_createdAt_idx" ON "document_access_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_configs_organizationId_isActive_idx" ON "webhook_configs"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_configs_organizationId_name_key" ON "webhook_configs"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "partner_requests_contactEmail_key" ON "partner_requests"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "partner_requests_organizationId_key" ON "partner_requests"("organizationId");

-- CreateIndex
CREATE INDEX "partner_requests_status_idx" ON "partner_requests"("status");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_rules" ADD CONSTRAINT "validation_rules_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "validation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_schemaVersionId_fkey" FOREIGN KEY ("schemaVersionId") REFERENCES "schema_registries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_submission_items" ADD CONSTRAINT "batch_submission_items_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraunhofer_requests" ADD CONSTRAINT "fraunhofer_requests_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_requests" ADD CONSTRAINT "signing_requests_signedDocumentId_fkey" FOREIGN KEY ("signedDocumentId") REFERENCES "signed_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_access_grants" ADD CONSTRAINT "document_access_grants_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "signed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "signed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
