import { base44 } from '@/api/base44Client';

/**
 * Log a user activity event to the ActivityLog entity.
 * @param {string} action - create|update|delete|generate|export|approve|reject|login|share|invite
 * @param {object} opts - { entity_type, entity_id, entity_name, details }
 */
export async function logActivity(action, opts = {}) {
  try {
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    await base44.entities.ActivityLog.create({
      action,
      user_id: user?.id || '',
      user_name: user?.full_name || 'System',
      entity_type: opts.entity_type || '',
      entity_id: opts.entity_id || '',
      entity_name: opts.entity_name || '',
      details: opts.details || '',
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Create a notification for the current user.
 * @param {string} title - Notification title
 * @param {string} message - Notification body
 * @param {object} opts - { type, link }
 */
export async function createNotification(title, message, opts = {}) {
  try {
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    await base44.entities.AppNotification.create({
      title,
      message,
      type: opts.type || 'info',
      link: opts.link || '',
      user_id: user?.id || '',
      read: false,
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}