import mongoose from 'mongoose';
import { MessageModel } from '../../models/Message';
import { PharmacyModel } from '../../models/Pharmacy';
import { UserModel } from '../../models/User';
import { NotificationModel } from '../../models/Notification';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

export class ChatsService {
  // ─── Send a message ──────────────────────────────────────────────────────────
  async send(
    senderId: string,
    input: {
      pharmacy_id: string;
      recipient_id: string;
      message: string;
    }
  ) {
    const pharmacy = await PharmacyModel.findById(input.pharmacy_id);
    if (!pharmacy) throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });

    const recipient = await UserModel.findById(input.recipient_id);
    if (!recipient) throw Object.assign(new Error('Recipient not found'), { statusCode: 404 });

    const msg = await MessageModel.create({
      sender_id: new mongoose.Types.ObjectId(senderId),
      recipient_id: new mongoose.Types.ObjectId(input.recipient_id),
      pharmacy_id: new mongoose.Types.ObjectId(input.pharmacy_id),
      message: input.message.trim(),
    });

    // Notify recipient of new message
    try {
      const sender = await UserModel.findById(senderId);
      await NotificationModel.create({
        user_id: new mongoose.Types.ObjectId(input.recipient_id),
        type: 'chat_message',
        title: `New Message from ${sender?.full_name || 'Patient'}`,
        body: input.message.trim().length > 60 ? `${input.message.trim().substring(0, 57)}...` : input.message.trim(),
        data: { pharmacy_id: input.pharmacy_id, sender_id: senderId },
      });
    } catch (err) {
      // Ignored: notification failure shouldn't crash message delivery
    }

    return (await msg.populate('sender_id', 'full_name avatar_url')).toObject();
  }

  // ─── List conversations for a user (grouped by pharmacy) ────────────────────
  async listConversations(userId: string) {
    const uid = new mongoose.Types.ObjectId(userId);

    // Find all pharmacies the user has chatted with (as sender or recipient)
    const pharmacyIds = await MessageModel.distinct('pharmacy_id', {
      $or: [{ sender_id: uid }, { recipient_id: uid }],
    });

    const conversations = await Promise.all(
      pharmacyIds.map(async (pharmacyId: mongoose.Types.ObjectId) => {
        const lastMessage = await MessageModel.findOne({
          pharmacy_id: pharmacyId,
          $or: [{ sender_id: uid }, { recipient_id: uid }],
        })
          .sort({ created_at: -1 })
          .populate('sender_id', 'full_name avatar_url')
          .lean();

        const unreadCount = await MessageModel.countDocuments({
          pharmacy_id: pharmacyId,
          recipient_id: uid,
          is_read: false,
        });

        const pharmacy = await PharmacyModel.findById(pharmacyId)
          .select('name logo_url address')
          .lean();

        return { pharmacy, last_message: lastMessage, unread_count: unreadCount };
      })
    );

    // Sort by most recent message
    conversations.sort((a, b) => {
      const aTime = a.last_message?.created_at?.getTime() ?? 0;
      const bTime = b.last_message?.created_at?.getTime() ?? 0;
      return bTime - aTime;
    });

    return conversations;
  }

  // ─── Get all conversations for a pharmacy (staff view) ─────────────────────
  async listPharmacyConversations(pharmacyId: string) {
    const pid = new mongoose.Types.ObjectId(pharmacyId);

    // Find all unique user IDs who have sent/received messages in this pharmacy
    const userIds = await MessageModel.distinct('sender_id', { pharmacy_id: pid });
    const recipientIds = await MessageModel.distinct('recipient_id', { pharmacy_id: pid });

    // Merge and deduplicate
    const allIds = [...new Set([...userIds.map(String), ...recipientIds.map(String)])];

    const conversations = await Promise.all(
      allIds.map(async (uid) => {
        const userOid = new mongoose.Types.ObjectId(uid);

        const lastMessage = await MessageModel.findOne({
          pharmacy_id: pid,
          $or: [{ sender_id: userOid }, { recipient_id: userOid }],
        })
          .sort({ created_at: -1 })
          .populate('sender_id', 'full_name avatar_url role')
          .lean();

        const unreadCount = await MessageModel.countDocuments({
          pharmacy_id: pid,
          sender_id: userOid,
          is_read: false,
        });

        const user = await UserModel.findById(uid).select('full_name avatar_url role').lean();

        return {
          other_user: user ? { _id: uid, full_name: (user as any).full_name, avatar_url: (user as any).avatar_url } : null,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      })
    );

    // Sort by most recent
    conversations.sort((a, b) => {
      const aTime = (a.last_message as any)?.created_at?.getTime?.() ?? 0;
      const bTime = (b.last_message as any)?.created_at?.getTime?.() ?? 0;
      return bTime - aTime;
    });

    return conversations.filter((c) => c.other_user !== null);
  }

  // ─── Get full chat history between user and pharmacy ────────────────────────
  async getHistory(
    userId: string,
    pharmacyId: string,
    params: { page?: number | string; limit?: number | string; user_id?: string }
  ) {
    const uid = new mongoose.Types.ObjectId(userId);
    const pid = new mongoose.Types.ObjectId(pharmacyId);
    const { page, limit } = parsePagination(params.page, params.limit, 50);
    const skip = (page - 1) * limit;

    // If user_id is supplied (staff viewing a specific patient's convo)
    let filter: any;
    if (params.user_id) {
      const patientId = new mongoose.Types.ObjectId(params.user_id);
      filter = {
        pharmacy_id: pid,
        $or: [
          { sender_id: patientId, recipient_id: uid },
          { sender_id: uid, recipient_id: patientId },
          // also include all messages in pharmacy for that patient
          { pharmacy_id: pid, $or: [{ sender_id: patientId }, { recipient_id: patientId }] },
        ],
      };
      // Simpler: just get all messages in pharmacy involving this patient
      filter = {
        pharmacy_id: pid,
        $or: [{ sender_id: patientId }, { recipient_id: patientId }],
      };
    } else {
      filter = {
        pharmacy_id: pid,
        $or: [{ sender_id: uid }, { recipient_id: uid }],
      };
    }

    const data = await MessageModel.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender_id', 'full_name avatar_url role')
      .lean();

    const count = await MessageModel.countDocuments(filter);

    // Mark all unread messages to this user as read
    await MessageModel.updateMany(
      { pharmacy_id: pid, recipient_id: uid, is_read: false },
      { $set: { is_read: true } }
    );

    return { data: data.reverse(), meta: buildPaginationMeta(count, page, limit) };
  }

  // ─── Mark messages as read ───────────────────────────────────────────────────
  async markRead(userId: string, pharmacyId: string) {
    await MessageModel.updateMany(
      {
        pharmacy_id: new mongoose.Types.ObjectId(pharmacyId),
        recipient_id: new mongoose.Types.ObjectId(userId),
        is_read: false,
      },
      { $set: { is_read: true } }
    );
    return { marked_read: true };
  }
}
