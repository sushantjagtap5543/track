// saas/src/services/auditService.js
const prisma = require('../lib/prisma');

/**
 * Roles for audit events
 */
const AUDIT_ACTIONS = {
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_SESSION_SYNC: 'ADMIN_SESSION_SYNC',
  ACTIVATE_USER: 'ACTIVATE_USER',
  SUSPEND_USER: 'SUSPEND_USER',
  BULK_ACTIVATE_USERS: 'BULK_ACTIVATE_USERS',
  BULK_SUSPEND_USERS: 'BULK_SUSPEND_USERS',
  BULK_DELETE_USERS: 'BULK_DELETE_USERS',
  EXTEND_GRACE: 'EXTEND_GRACE',
  UPDATE_GLOBAL_SETTINGS: 'UPDATE_GLOBAL_SETTINGS',
  MANUAL_SUBSCRIPTION_UPDATE: 'MANUAL_SUBSCRIPTION_UPDATE',
  UPDATE_BILLING_PLAN: 'UPDATE_BILLING_PLAN',
  CREATE_BILLING_PLAN: 'CREATE_BILLING_PLAN',
  DELETE_BILLING_PLAN: 'DELETE_BILLING_PLAN',
  ADMIN_VIEW_USER_SESSION: 'ADMIN_VIEW_USER_SESSION',
  EXIT_ADMIN_VIEW_SESSION: 'EXIT_ADMIN_VIEW_SESSION',
  MANUAL_USER_ONBOARD: 'MANUAL_USER_ONBOARD',
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',
  BULK_DEVICE_PROVISION: 'BULK_DEVICE_PROVISION',
  USER_REGISTRATION: 'USER_REGISTRATION',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE'
};

/**
 * Log an administrative or sensitive user action.
 * @param {Object} params
 * @param {number} params.adminId - ID of the admin performing the action (optional)
 * @param {number} params.userId - ID of the target user (optional)
 * @param {string} params.action - Action constant from AUDIT_ACTIONS
 * @param {Object|string} params.details - Additional context for the log
 * @param {string} params.ipAddress - IP address of the requester (optional)
 */
const logAction = async ({ adminId, userId, action, details, ipAddress }) => {
  try {
    const detailString = typeof details === 'object' ? JSON.stringify(details) : details;
    
    await prisma.auditLog.create({
      data: {
        adminId: adminId || null,
        userId: userId || null,
        action,
        details: detailString,
        ipAddress: ipAddress || null
      }
    });
    
    console.log(`[AuditLog] ${action} recorded for ${adminId ? 'Admin:' + adminId : 'User:' + userId}`);
  } catch (error) {
    console.error('[AuditLog] Failed to create audit entry:', error.message);
    // We don't throw here to avoid crashing the main request if logging fails
  }
};

module.exports = {
  logAction,
  AUDIT_ACTIONS
};
