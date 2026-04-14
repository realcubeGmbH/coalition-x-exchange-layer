-- Remove audit logs referencing removed partner request actions
DELETE FROM "audit_logs"
  WHERE "action" IN ('PARTNER_REQUEST_CREATED', 'PARTNER_REQUEST_APPROVED', 'PARTNER_REQUEST_REJECTED');

-- AlterEnum
CREATE TYPE "AuditAction_new" AS ENUM ('AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_FAILED', 'API_TOKEN_CREATED', 'API_TOKEN_USED', 'API_TOKEN_REVOKED', 'ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_DELETED', 'KPI_SUBMITTED', 'KPI_UPDATED', 'KPI_MERGED', 'SUBMISSION_CREATED', 'SUBMISSION_COMPLETED', 'SUBMISSION_FAILED', 'BATCH_STARTED', 'BATCH_COMPLETED', 'VALIDATION_PASSED', 'VALIDATION_FAILED', 'QUEUE_ITEM_CREATED', 'QUEUE_ITEM_COMPLETED', 'QUEUE_ITEM_FAILED', 'QUEUE_ITEM_RETRY', 'QUEUE_ITEM_DEAD_LETTER', 'FRAUNHOFER_REQUEST_SENT', 'FRAUNHOFER_CALLBACK_RECEIVED', 'FRAUNHOFER_VERIFIED', 'SIGNING_REQUESTED', 'SIGNING_COMPLETED', 'SIGNING_FAILED', 'DOCUMENT_VERIFIED', 'DOCUMENT_ACCESSED', 'DOCUMENT_DOWNLOADED', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'PARTNER_SYNC_RECEIVED', 'WEBHOOK_TRIGGERED', 'WEBHOOK_FAILED', 'ORG_CREATED', 'ORG_UPDATED', 'ORG_ACTIVATED', 'ORG_DELETED', 'API_CREDENTIALS_CREATED', 'API_CREDENTIALS_ROTATED');
ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";

-- DropForeignKey
ALTER TABLE "partner_requests" DROP CONSTRAINT "partner_requests_organizationId_fkey";

-- DropTable
DROP TABLE "partner_requests";

-- DropEnum
DROP TYPE "PartnerRequestStatus";

-- CreateTable
CREATE TABLE "accredited_partners" (
    "id" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "externalOrgId" TEXT NOT NULL,
    "techProviderId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "accreditationFlag" BOOLEAN NOT NULL,
    "did" TEXT NOT NULL,
    "initialSecretHash" TEXT NOT NULL,
    "externalTimestamp" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "sourceOrganizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accredited_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accredited_partners_externalOrgId_idx" ON "accredited_partners"("externalOrgId");

-- CreateIndex
CREATE INDEX "accredited_partners_email_idx" ON "accredited_partners"("email");

-- CreateIndex
CREATE INDEX "accredited_partners_sourceOrganizationId_idx" ON "accredited_partners"("sourceOrganizationId");

-- AddForeignKey
ALTER TABLE "accredited_partners" ADD CONSTRAINT "accredited_partners_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
