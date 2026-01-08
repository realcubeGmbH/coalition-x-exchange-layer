-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('ACCREDITED_PARTNER', 'CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PARTNER_ADMIN', 'PARTNER_USER', 'CLIENT_ADMIN', 'CLIENT_USER');

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
CREATE TABLE "Organization" (
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

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
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

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemaRegistry" (
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

    CONSTRAINT "SchemaRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationRule" (
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

    CONSTRAINT "ValidationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiRecord" (
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

    CONSTRAINT "KpiRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
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

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
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

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
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

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchSubmissionItem" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "externalId" TEXT,
    "resourceId" TEXT,
    "status" "SubmissionStatus" NOT NULL,
    "errors" JSONB,
    "itemPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchSubmissionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueItem" (
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

    CONSTRAINT "QueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraunhoferRequest" (
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

    CONSTRAINT "FraunhoferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SigningRequest" (
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

    CONSTRAINT "SigningRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignedDocument" (
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

    CONSTRAINT "SignedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessGrant" (
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

    CONSTRAINT "DocumentAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
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

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
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

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRequest" (
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

    CONSTRAINT "PartnerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_clientId_key" ON "Organization"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_apiKey_key" ON "Organization"("apiKey");

-- CreateIndex
CREATE INDEX "Organization_clientId_idx" ON "Organization"("clientId");

-- CreateIndex
CREATE INDEX "Organization_apiKey_idx" ON "Organization"("apiKey");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");

-- CreateIndex
CREATE INDEX "Asset_name_idx" ON "Asset"("name");

-- CreateIndex
CREATE INDEX "Asset_externalId_idx" ON "Asset"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_organizationId_externalId_key" ON "Asset"("organizationId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemaRegistry_version_key" ON "SchemaRegistry"("version");

-- CreateIndex
CREATE INDEX "SchemaRegistry_version_idx" ON "SchemaRegistry"("version");

-- CreateIndex
CREATE INDEX "SchemaRegistry_checksum_idx" ON "SchemaRegistry"("checksum");

-- CreateIndex
CREATE INDEX "ValidationRule_isActive_idx" ON "ValidationRule"("isActive");

-- CreateIndex
CREATE INDEX "ValidationRule_name_isActive_idx" ON "ValidationRule"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationRule_name_version_key" ON "ValidationRule"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "KpiRecord_submissionId_key" ON "KpiRecord"("submissionId");

-- CreateIndex
CREATE INDEX "KpiRecord_assetId_createdAt_idx" ON "KpiRecord"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "KpiRecord_organizationId_createdAt_idx" ON "KpiRecord"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "KpiRecord_schemaVersionId_idx" ON "KpiRecord"("schemaVersionId");

-- CreateIndex
CREATE INDEX "KpiRecord_validationStatus_idx" ON "KpiRecord"("validationStatus");

-- CreateIndex
CREATE INDEX "KpiRecord_checksum_idx" ON "KpiRecord"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "KpiRecord_assetId_dataVersion_key" ON "KpiRecord"("assetId", "dataVersion");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_token_key" ON "ApiToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_refreshToken_key" ON "ApiToken"("refreshToken");

-- CreateIndex
CREATE INDEX "ApiToken_token_idx" ON "ApiToken"("token");

-- CreateIndex
CREATE INDEX "ApiToken_organizationId_idx" ON "ApiToken"("organizationId");

-- CreateIndex
CREATE INDEX "ApiToken_expiresAt_idx" ON "ApiToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiToken_revoked_idx" ON "ApiToken"("revoked");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_idempotencyKey_key" ON "Submission"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Submission_organizationId_submittedAt_idx" ON "Submission"("organizationId", "submittedAt");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_validationStatus_idx" ON "Submission"("validationStatus");

-- CreateIndex
CREATE INDEX "Submission_idempotencyKey_idx" ON "Submission"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Submission_sourceTag_idx" ON "Submission"("sourceTag");

-- CreateIndex
CREATE INDEX "BatchSubmissionItem_submissionId_idx" ON "BatchSubmissionItem"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchSubmissionItem_submissionId_itemIndex_key" ON "BatchSubmissionItem"("submissionId", "itemIndex");

-- CreateIndex
CREATE UNIQUE INDEX "QueueItem_submissionId_key" ON "QueueItem"("submissionId");

-- CreateIndex
CREATE INDEX "QueueItem_queueStatus_priority_queuedAt_idx" ON "QueueItem"("queueStatus", "priority", "queuedAt");

-- CreateIndex
CREATE INDEX "QueueItem_queueName_queueStatus_idx" ON "QueueItem"("queueName", "queueStatus");

-- CreateIndex
CREATE INDEX "QueueItem_isDeadLetter_idx" ON "QueueItem"("isDeadLetter");

-- CreateIndex
CREATE INDEX "QueueItem_nextRetryAt_idx" ON "QueueItem"("nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "FraunhoferRequest_submissionId_key" ON "FraunhoferRequest"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "FraunhoferRequest_callbackId_key" ON "FraunhoferRequest"("callbackId");

-- CreateIndex
CREATE INDEX "FraunhoferRequest_status_idx" ON "FraunhoferRequest"("status");

-- CreateIndex
CREATE INDEX "FraunhoferRequest_callbackId_idx" ON "FraunhoferRequest"("callbackId");

-- CreateIndex
CREATE UNIQUE INDEX "SigningRequest_trustLayerRequestId_key" ON "SigningRequest"("trustLayerRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "SigningRequest_idempotencyKey_key" ON "SigningRequest"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SigningRequest_signedDocumentId_key" ON "SigningRequest"("signedDocumentId");

-- CreateIndex
CREATE INDEX "SigningRequest_assetId_idx" ON "SigningRequest"("assetId");

-- CreateIndex
CREATE INDEX "SigningRequest_status_idx" ON "SigningRequest"("status");

-- CreateIndex
CREATE INDEX "SigningRequest_trustLayerRequestId_idx" ON "SigningRequest"("trustLayerRequestId");

-- CreateIndex
CREATE INDEX "SigningRequest_idempotencyKey_idx" ON "SigningRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SignedDocument_assetId_idx" ON "SignedDocument"("assetId");

-- CreateIndex
CREATE INDEX "SignedDocument_signedAt_idx" ON "SignedDocument"("signedAt");

-- CreateIndex
CREATE INDEX "SignedDocument_expiresAt_idx" ON "SignedDocument"("expiresAt");

-- CreateIndex
CREATE INDEX "DocumentAccessGrant_granteeType_granteeId_idx" ON "DocumentAccessGrant"("granteeType", "granteeId");

-- CreateIndex
CREATE INDEX "DocumentAccessGrant_documentId_idx" ON "DocumentAccessGrant"("documentId");

-- CreateIndex
CREATE INDEX "DocumentAccessGrant_expiresAt_idx" ON "DocumentAccessGrant"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAccessGrant_documentId_granteeType_granteeId_key" ON "DocumentAccessGrant"("documentId", "granteeType", "granteeId");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_documentId_createdAt_idx" ON "DocumentAccessLog"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_accessorType_accessorId_createdAt_idx" ON "DocumentAccessLog"("accessorType", "accessorId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_action_createdAt_idx" ON "DocumentAccessLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookConfig_organizationId_isActive_idx" ON "WebhookConfig"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookConfig_organizationId_name_key" ON "WebhookConfig"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRequest_contactEmail_key" ON "PartnerRequest"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRequest_organizationId_key" ON "PartnerRequest"("organizationId");

-- CreateIndex
CREATE INDEX "PartnerRequest_status_idx" ON "PartnerRequest"("status");

-- CreateIndex
CREATE INDEX "PartnerRequest_contactEmail_idx" ON "PartnerRequest"("contactEmail");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationRule" ADD CONSTRAINT "ValidationRule_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "ValidationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiRecord" ADD CONSTRAINT "KpiRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiRecord" ADD CONSTRAINT "KpiRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiRecord" ADD CONSTRAINT "KpiRecord_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiRecord" ADD CONSTRAINT "KpiRecord_schemaVersionId_fkey" FOREIGN KEY ("schemaVersionId") REFERENCES "SchemaRegistry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSubmissionItem" ADD CONSTRAINT "BatchSubmissionItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraunhoferRequest" ADD CONSTRAINT "FraunhoferRequest_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SigningRequest" ADD CONSTRAINT "SigningRequest_signedDocumentId_fkey" FOREIGN KEY ("signedDocumentId") REFERENCES "SignedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedDocument" ADD CONSTRAINT "SignedDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessGrant" ADD CONSTRAINT "DocumentAccessGrant_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SignedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SignedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookConfig" ADD CONSTRAINT "WebhookConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequest" ADD CONSTRAINT "PartnerRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
