import { AuditLog } from '../models/index.js';

export const createAuditLog = async (
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  previousValue,
  newValue,
  req
) => {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress;
    const userAgent = req?.headers?.['user-agent'];

    await AuditLog.create({
      actor: actorId,
      actorRole,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
};
