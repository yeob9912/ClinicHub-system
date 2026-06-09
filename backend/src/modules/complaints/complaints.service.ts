import { ComplaintModel } from '../../models/Complaint';
import { NotificationModel } from '../../models/Notification';
import { UserModel } from '../../models/User';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { logger } from '../../config/logger';

export class ComplaintsService {
  /** User submits a new complaint */
  async submit(userId: string, input: {
    pharmacy_name: string;
    issue: string;
    description: string;
    category?: string;
    attachments_count?: number;
  }) {
    const complaint = await ComplaintModel.create({
      user_id: userId,
      pharmacy_name: input.pharmacy_name,
      issue: input.issue,
      description: input.description,
      category: input.category ?? 'Other',
      attachments_count: input.attachments_count ?? 0,
    });

    // Notify all admins
    try {
      const admins = await UserModel.find({ role: 'admin', is_active: true }).lean();
      const user = await UserModel.findById(userId).lean();
      const userName = (user as any)?.full_name ?? 'A user';

      const notifications = admins.map(admin => ({
        user_id: admin._id,
        type: 'new_complaint',
        title: '🚨 New Complaint Submitted',
        body: `${userName} submitted a complaint about "${input.pharmacy_name}": ${input.issue.slice(0, 100)}`,
        data: { complaint_id: complaint._id.toString() },
      }));

      if (notifications.length > 0) {
        await NotificationModel.insertMany(notifications);
      }
    } catch (err) {
      logger.warn('Failed to notify admins of new complaint', err);
    }

    logger.info(`Complaint ${complaint._id} submitted by user ${userId}`);
    return complaint.toObject();
  }

  /** Get complaints for the current user */
  async listForUser(userId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const { page: p, limit: l } = parsePagination(page, limit);
    const skip = (p - 1) * l;

    const filter = { user_id: userId };
    const data = await ComplaintModel.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(l)
      .lean();
    const count = await ComplaintModel.countDocuments(filter);

    return { data, meta: buildPaginationMeta(count, p, l) };
  }

  /** Admin: list all complaints with optional filters */
  async listAll(params: { status?: string; priority?: string; page?: number; limit?: number }) {
    const { status, priority, page = 1, limit = 20 } = params;
    const { page: p, limit: l } = parsePagination(page, limit);
    const skip = (p - 1) * l;

    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const data = await ComplaintModel.find(filter)
      .populate('user_id', 'full_name email avatar_url')
      .populate('responded_by', 'full_name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(l)
      .lean();
    const count = await ComplaintModel.countDocuments(filter);

    return { data, meta: buildPaginationMeta(count, p, l) };
  }

  /** Admin: respond to a complaint (with optional text) and update status */
  async respond(adminId: string, complaintId: string, input: {
    response?: string;
    status?: string;
    priority?: string | null;
  }) {
    const complaint = await ComplaintModel.findById(complaintId);
    if (!complaint) {
      throw Object.assign(new Error('Complaint not found'), { statusCode: 404 });
    }

    const previousPriority = complaint.priority;
    const newPriority = input.priority !== undefined ? input.priority : previousPriority;

    if (input.response) complaint.admin_response = input.response;
    if (input.status)   complaint.status = input.status as any;
    if (input.priority !== undefined) complaint.priority = (input.priority as any) ?? null;
    complaint.responded_by = adminId as any;
    complaint.responded_at = new Date();

    await complaint.save();

    const admin = await UserModel.findById(adminId).lean();
    const adminName = (admin as any)?.full_name ?? 'Admin';

    // ── Notify user of priority assignment / change ──────────────────────────
    const priorityChanged = input.priority !== undefined && input.priority !== previousPriority;
    if (priorityChanged && newPriority) {
      try {
        const priorityEmoji: Record<string, string> = {
          Critical: '🔴',
          High:     '🟠',
          Medium:   '🟡',
          Low:      '🟢',
        };
        const priorityEta: Record<string, string> = {
          Critical: 'within 2 hours',
          High:     'within 24 hours',
          Medium:   'within 3 days',
          Low:      'within 7 days',
        };
        const emoji = priorityEmoji[newPriority as string] ?? '📋';
        const eta   = priorityEta[newPriority as string] ?? 'soon';

        await NotificationModel.create({
          user_id: complaint.user_id,
          type: 'complaint_priority_assigned',
          title: `${emoji} Complaint Priority Set — ${newPriority}`,
          body: `${adminName} assigned ${newPriority} priority to your complaint about "${complaint.pharmacy_name}". Expect a response ${eta}.`,
          data: {
            complaint_id: complaintId,
            priority: newPriority,
            pharmacy_name: complaint.pharmacy_name,
          },
          is_read: false,
        });
      } catch (err) {
        logger.warn('Failed to notify user of priority assignment', err);
      }
    }

    // ── Notify user of status change or admin response ────────────────────────
    try {
      const statusLabel = complaint.status;

      await NotificationModel.create({
        user_id: complaint.user_id,
        type: 'complaint_update',
        title: `📋 Complaint Update — ${statusLabel}`,
        body: input.response
          ? `${adminName} responded to your complaint about "${complaint.pharmacy_name}": ${input.response.slice(0, 120)}`
          : `Your complaint about "${complaint.pharmacy_name}" has been marked as ${statusLabel}.`,
        data: { complaint_id: complaintId, status: statusLabel },
        is_read: false,
      });
    } catch (err) {
      logger.warn('Failed to notify user of complaint update', err);
    }

    logger.info(`Complaint ${complaintId} updated by admin ${adminId} → status: ${complaint.status}, priority: ${complaint.priority}`);
    return complaint.toObject();
  }


  /** Admin: quick approve/close only (no reply text needed) */
  async updateStatus(adminId: string, complaintId: string, status: string, priority?: string | null) {
    return this.respond(adminId, complaintId, { status, priority });
  }
}
