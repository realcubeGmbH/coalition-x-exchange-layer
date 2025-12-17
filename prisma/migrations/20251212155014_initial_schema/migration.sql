-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('ACCREDITED_PARTNER', 'CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

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
CREATE TYPE "AuditAction" AS ENUM ('AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_FAILED', 'API_TOKEN_CREATED', 'API_TOKEN_USED', 'API_TOKEN_REVOKED', 'BUILDING_CREATED', 'BUILDING_UPDATED', 'BUILDING_DELETED', 'KPI_SUBMITTED', 'KPI_UPDATED', 'KPI_MERGED', 'SUBMISSION_CREATED', 'SUBMISSION_COMPLETED', 'SUBMISSION_FAILED', 'BATCH_STARTED', 'BATCH_COMPLETED', 'VALIDATION_PASSED', 'VALIDATION_FAILED', 'DATA_ENRICHED', 'DATA_MERGED', 'DATA_VERSIONED', 'QUEUE_ITEM_CREATED', 'QUEUE_ITEM_COMPLETED', 'QUEUE_ITEM_FAILED', 'QUEUE_ITEM_RETRY', 'QUEUE_ITEM_DEAD_LETTER', 'FRAUNHOFER_REQUEST_SENT', 'FRAUNHOFER_CALLBACK_RECEIVED', 'FRAUNHOFER_VERIFIED', 'SIGNING_REQUESTED', 'SIGNING_COMPLETED', 'SIGNING_FAILED', 'DOCUMENT_VERIFIED', 'DOCUMENT_ACCESSED', 'DOCUMENT_DOWNLOADED', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'PARTNER_REQUEST_CREATED', 'PARTNER_REQUEST_APPROVED', 'PARTNER_REQUEST_REJECTED', 'WEBHOOK_TRIGGERED', 'WEBHOOK_FAILED');

-- CreateEnum
CREATE TYPE "BuildingUseType" AS ENUM ('RESIDENTIAL', 'RETAIL', 'OFFICE', 'HOTEL_ACCOMMODATION_GASTRONOMY', 'HEALTHCARE_SOCIAL', 'INDUSTRIAL_LOGISTICS', 'INFRASTRUCTURE', 'RECREATION_CULTURE_EDUCATION', 'MIXED_USE', 'OTHER');

-- CreateEnum
CREATE TYPE "BuildingCategory" AS ENUM ('RESIDENTIAL', 'NON_RESIDENTIAL');

-- CreateEnum
CREATE TYPE "ActivityInValueChain" AS ENUM ('CONSTRUCTION', 'EXISTING_BUILDING', 'RENOVATION', 'DEMOLITION');

-- CreateEnum
CREATE TYPE "TaxonomyAlignment" AS ENUM ('YES_CA', 'YES_CE', 'YES_CM', 'NO');

-- CreateEnum
CREATE TYPE "FossilFuelsBasis" AS ENUM ('BY_NET_BASE_RENT', 'BY_REAL_ESTATE_VALUE');

-- CreateEnum
CREATE TYPE "RenovationType" AS ENUM ('MORE_THAN_25_PERCENT_ENVELOPE_RENOVATED', 'AT_LEAST_30_PERCENT_ENERGY_REDUCTION', 'MORE_THAN_25_PERCENT_COST_OF_VALUE', 'OTHER');

-- CreateEnum
CREATE TYPE "EPCType" AS ENUM ('CONSUMPTION_BASED', 'DEMAND_BASED', 'NO_OBLIGATION', 'NON_EXISTENT');

-- CreateEnum
CREATE TYPE "HeatingMedium" AS ENUM ('DISTRICT_HEATING', 'GAS', 'OIL', 'ELECTRICITY', 'HEAT_PUMP', 'HYBRID');

-- CreateEnum
CREATE TYPE "GHGMethodology" AS ENUM ('MARKET_BASED', 'LOCATION_BASED');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('CREATED', 'UPDATED', 'MERGED', 'ROLLBACK');

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

-- CreateEnum
CREATE TYPE "KpiDataType" AS ENUM ('DATE', 'INTEGER', 'FLOAT', 'STRING', 'ENUM', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "KpiList" AS ENUM ('BASIC', 'EXTENDED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
    "apiKey" TEXT,
    "apiKeyHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "description" TEXT,
    "dataSource" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "sourceTag" "SourceTag" NOT NULL DEFAULT 'MANUAL',
    "submittedVia" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyData" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "dateBuildingPermitApplication" TIMESTAMP(3),
    "yearOfConstruction" INTEGER,
    "primaryUseOfBuilding" "BuildingUseType",
    "usageForFossilFuels" DOUBLE PRECISION,
    "fossilFuelsBasis" "FossilFuelsBasis",
    "usableAreaHeated" DOUBLE PRECISION,
    "usableAreaCooled" DOUBLE PRECISION,
    "netFloorAreaHeated" DOUBLE PRECISION,
    "netFloorAreaCooled" DOUBLE PRECISION,
    "grossExternalAreaIPMS1" DOUBLE PRECISION,
    "totalGrossInternalAreaIPMS2" DOUBLE PRECISION,
    "rentalArea" DOUBLE PRECISION,
    "taxonomyAlignment" "TaxonomyAlignment",
    "buildingCategory" "BuildingCategory",
    "activityInValueChain" "ActivityInValueChain",
    "listedBuilding" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenovationHistory" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "renovationType" "RenovationType",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenovationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyPerformance" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "epcFile" TEXT,
    "epcClass" TEXT,
    "epcPrimaryEnergyConsumption" DOUBLE PRECISION,
    "epcPrimaryEnergyDemand" DOUBLE PRECISION,
    "epcEndEnergyConsumption" DOUBLE PRECISION,
    "epcEndEnergyConsumptionHeating" DOUBLE PRECISION,
    "epcEndEnergyConsumptionElectricity" DOUBLE PRECISION,
    "epcEndEnergyDemand" DOUBLE PRECISION,
    "epcEndEnergyDemandHeating" DOUBLE PRECISION,
    "epcEndEnergyDemandElectricity" DOUBLE PRECISION,
    "epcExpiryDate" TIMESTAMP(3),
    "epcType" "EPCType",
    "totalEndEnergyConsumption" DOUBLE PRECISION,
    "totalEndEnergyDemand" DOUBLE PRECISION,
    "buildingCategory" "BuildingCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyConsumption" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "heatingMedium" "HeatingMedium",
    "actualEndEnergyConsumption" DOUBLE PRECISION,
    "consumptionBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GreenhouseGases" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "directGHGEmissions" DOUBLE PRECISION,
    "indirectGHGEmissionsFromEnergy" DOUBLE PRECISION,
    "otherIndirectGHGEmissions" DOUBLE PRECISION,
    "shareOfEstimatedGHGEmissions" DOUBLE PRECISION,
    "indirectGHGMethodology" "GHGMethodology",
    "supplierSpecificEmissionFactor" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GreenhouseGases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityCheck" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCompatible" BOOLEAN NOT NULL,
    "issues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompatibilityCheck_pkey" PRIMARY KEY ("id")
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
    "payload" JSONB,
    "response" JSONB,
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
    "buildingId" TEXT NOT NULL,
    "status" "SigningStatus" NOT NULL DEFAULT 'PENDING',
    "requestPayload" JSONB,
    "trustLayerRequestId" TEXT,
    "holderIdentity" TEXT,
    "verifierDetails" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "signedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SigningRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignedDocument" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
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
CREATE TABLE "DataVersion" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousData" JSONB,
    "currentData" JSONB NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changedFields" TEXT[],
    "organizationId" TEXT,
    "userId" TEXT,
    "submissionId" TEXT,
    "mergeSource" TEXT,
    "mergeConflicts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataVersion_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "KpiDefinition" (
    "id" TEXT NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "kpiNumber" TEXT NOT NULL,
    "targetModel" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "dataType" "KpiDataType" NOT NULL,
    "enumValues" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "format" TEXT,
    "nameEn" TEXT NOT NULL,
    "nameDe" TEXT NOT NULL,
    "unit" TEXT,
    "domain" TEXT NOT NULL,
    "list" "KpiList" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deprecatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_apiKey_key" ON "Organization"("apiKey");

-- CreateIndex
CREATE INDEX "Organization_apiKey_idx" ON "Organization"("apiKey");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "Building_organizationId_idx" ON "Building"("organizationId");

-- CreateIndex
CREATE INDEX "Building_name_idx" ON "Building"("name");

-- CreateIndex
CREATE INDEX "Building_externalId_idx" ON "Building"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_organizationId_externalId_key" ON "Building"("organizationId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyData_buildingId_key" ON "PropertyData"("buildingId");

-- CreateIndex
CREATE INDEX "PropertyData_buildingId_idx" ON "PropertyData"("buildingId");

-- CreateIndex
CREATE INDEX "PropertyData_primaryUseOfBuilding_idx" ON "PropertyData"("primaryUseOfBuilding");

-- CreateIndex
CREATE INDEX "PropertyData_buildingCategory_idx" ON "PropertyData"("buildingCategory");

-- CreateIndex
CREATE INDEX "RenovationHistory_buildingId_year_idx" ON "RenovationHistory"("buildingId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "RenovationHistory_buildingId_year_key" ON "RenovationHistory"("buildingId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyPerformance_buildingId_key" ON "EnergyPerformance"("buildingId");

-- CreateIndex
CREATE INDEX "EnergyPerformance_buildingId_idx" ON "EnergyPerformance"("buildingId");

-- CreateIndex
CREATE INDEX "EnergyPerformance_epcType_idx" ON "EnergyPerformance"("epcType");

-- CreateIndex
CREATE INDEX "EnergyConsumption_buildingId_year_idx" ON "EnergyConsumption"("buildingId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyConsumption_buildingId_year_month_key" ON "EnergyConsumption"("buildingId", "year", "month");

-- CreateIndex
CREATE INDEX "GreenhouseGases_buildingId_year_idx" ON "GreenhouseGases"("buildingId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "GreenhouseGases_buildingId_year_key" ON "GreenhouseGases"("buildingId", "year");

-- CreateIndex
CREATE INDEX "CompatibilityCheck_buildingId_checkDate_idx" ON "CompatibilityCheck"("buildingId", "checkDate");

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
CREATE UNIQUE INDEX "SigningRequest_signedDocumentId_key" ON "SigningRequest"("signedDocumentId");

-- CreateIndex
CREATE INDEX "SigningRequest_buildingId_idx" ON "SigningRequest"("buildingId");

-- CreateIndex
CREATE INDEX "SigningRequest_status_idx" ON "SigningRequest"("status");

-- CreateIndex
CREATE INDEX "SigningRequest_trustLayerRequestId_idx" ON "SigningRequest"("trustLayerRequestId");

-- CreateIndex
CREATE INDEX "SignedDocument_buildingId_idx" ON "SignedDocument"("buildingId");

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
CREATE INDEX "DataVersion_entityType_entityId_idx" ON "DataVersion"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DataVersion_entityType_entityId_version_idx" ON "DataVersion"("entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "DataVersion_submissionId_idx" ON "DataVersion"("submissionId");

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

-- CreateIndex
CREATE UNIQUE INDEX "KpiDefinition_kpiKey_key" ON "KpiDefinition"("kpiKey");

-- CreateIndex
CREATE INDEX "KpiDefinition_kpiKey_isActive_idx" ON "KpiDefinition"("kpiKey", "isActive");

-- CreateIndex
CREATE INDEX "KpiDefinition_list_isActive_idx" ON "KpiDefinition"("list", "isActive");

-- CreateIndex
CREATE INDEX "KpiDefinition_targetModel_idx" ON "KpiDefinition"("targetModel");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyData" ADD CONSTRAINT "PropertyData_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenovationHistory" ADD CONSTRAINT "RenovationHistory_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyPerformance" ADD CONSTRAINT "EnergyPerformance_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyConsumption" ADD CONSTRAINT "EnergyConsumption_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreenhouseGases" ADD CONSTRAINT "GreenhouseGases_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityCheck" ADD CONSTRAINT "CompatibilityCheck_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "SignedDocument" ADD CONSTRAINT "SignedDocument_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessGrant" ADD CONSTRAINT "DocumentAccessGrant_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SignedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SignedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookConfig" ADD CONSTRAINT "WebhookConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequest" ADD CONSTRAINT "PartnerRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
