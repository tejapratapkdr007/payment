import { AuditAction, ActorType } from "@prisma/client";
import { prisma } from "../config/prisma";

interface WriteAuditLogInput {
  action: AuditAction;
  actorType: ActorType;
  teacherId?: string | null;
  actorLabel: string;
  targetType?: string;
  targetId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Writes a single, immutable audit log entry. There is intentionally no
 * update/delete counterpart exposed anywhere in the codebase — combined
 * with the database-level trigger in the initial migration that rejects
 * UPDATE/DELETE on audit_logs, this makes the trail tamper-resistant even
 * against a compromised application server, not just well-behaved code.
 */
export async function writeAuditLog(input: WriteAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      action: input.action,
      actorType: input.actorType,
      teacherId: input.teacherId ?? null,
      actorLabel: input.actorLabel,
      targetType: input.targetType,
      targetId: input.targetId,
      description: input.description,
      metadata: input.metadata as any,
      ipAddress: input.ipAddress,
    },
  });
}
