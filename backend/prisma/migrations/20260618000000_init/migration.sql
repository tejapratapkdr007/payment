-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PENDING_PAYMENT', 'APPROVED', 'REJECTED', 'LATE', 'REUPLOAD_REQUESTED');

-- CreateEnum
CREATE TYPE "FraudRisk" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SUBMISSION_RECEIVED', 'APPROVED', 'REJECTED', 'REUPLOAD_REQUESTED', 'DEADLINE_APPROACHING', 'GENERAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'IMPORT_STUDENTS', 'APPROVE_PAYMENT', 'REJECT_PAYMENT', 'REQUEST_REUPLOAD', 'SETTINGS_CHANGE', 'CREATE_CLASS', 'CREATE_COLLECTION', 'UPDATE_COLLECTION', 'DELETE_COLLECTION', 'CREATE_TEACHER', 'RECONCILE_STATEMENT', 'GENERATE_RECEIPT');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('TEACHER', 'STUDENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('MANUAL_OCR', 'STATEMENT_RECONCILIATION', 'MANUAL_OVERRIDE');

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "phone" TEXT,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "deadline" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "utrEntered" TEXT,
    "utrOcr" TEXT,
    "amountOcr" DECIMAL(10,2),
    "dateOcr" TIMESTAMP(3),
    "screenshotUrl" TEXT,
    "screenshotPublicId" TEXT,
    "imageHash" TEXT,
    "fileSha256" TEXT,
    "fileMetadata" JSONB,
    "ocrRawText" TEXT,
    "ocrSuccessTextFound" BOOLEAN,
    "ocrConfidence" DOUBLE PRECISION,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "fraudRisk" "FraudRisk" NOT NULL DEFAULT 'NONE',
    "fraudReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verificationMethod" "VerificationMethod",
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "receiptNumber" TEXT,
    "receiptGeneratedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_status_history" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "reason" TEXT,
    "changedByActorType" "ActorType" NOT NULL,
    "changedByTeacherId" TEXT,
    "changedByStudentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL DEFAULT 'My Institution',
    "teacherDisplayName" TEXT NOT NULL DEFAULT 'Teacher',
    "upiId" TEXT,
    "upiPhoneNumber" TEXT,
    "defaultAmount" DECIMAL(10,2) NOT NULL DEFAULT 300,
    "institutionLogoUrl" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "collectionDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "teacherId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "classes_teacherId_name_key" ON "classes"("teacherId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "students_pin_key" ON "students"("pin");

-- CreateIndex
CREATE INDEX "students_classId_idx" ON "students"("classId");

-- CreateIndex
CREATE INDEX "collections_teacherId_idx" ON "collections"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_studentId_collectionId_key" ON "payments"("studentId", "collectionId");

-- CreateIndex
CREATE INDEX "payments_collectionId_idx" ON "payments"("collectionId");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_utrEntered_idx" ON "payments"("utrEntered");

-- CreateIndex
CREATE INDEX "payment_status_history_paymentId_idx" ON "payment_status_history"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_teacherId_key" ON "settings"("teacherId");

-- CreateIndex
CREATE INDEX "notifications_studentId_idx" ON "notifications"("studentId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_status_history" ADD CONSTRAINT "payment_status_history_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_status_history" ADD CONSTRAINT "payment_status_history_changedByTeacherId_fkey" FOREIGN KEY ("changedByTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_status_history" ADD CONSTRAINT "payment_status_history_changedByStudentId_fkey" FOREIGN KEY ("changedByStudentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce immutability of audit logs at the database level: no updates or
-- deletes are permitted once a row is written, even via a raw SQL console.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs rows are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
