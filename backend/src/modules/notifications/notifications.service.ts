import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { WatchlistModel } from '../../models/Watchlist';
import { NotificationModel } from '../../models/Notification';
import { MedicineModel } from '../../models/Medicine';
import { PharmacyModel } from '../../models/Pharmacy';
import { InventoryModel } from '../../models/Inventory';

export class NotificationsService {
  // ─── Watchlist ─────────────────────────────────────────────────────────────

  async getWatchlist(userId: string, params: { page?: number; limit?: number }) {
    const { page, limit } = parsePagination(params.page, params.limit);
    const skip = (page - 1) * limit;

    const total = await WatchlistModel.countDocuments({ user_id: userId });
    const items = await WatchlistModel.find({ user_id: userId })
      .populate('medicine_id', 'id name generic_name dosage_form strength image_url requires_rx')
      .populate('pharmacy_id', 'id name address phone')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich with current inventory snapshot
    const enriched = await Promise.all(
      items.map(async (item: any) => {
        let current_inventory: Record<string, unknown> | null = null;

        if (item.pharmacy_id) {
          // Specific pharmacy watch
          current_inventory = await InventoryModel.findOne({
            medicine_id: item.medicine_id,
            pharmacy_id: item.pharmacy_id,
          })
            .select('price currency stock_quantity in_stock last_updated')
            .lean();
        } else {
          // Any pharmacy — cheapest in-stock
          current_inventory = await InventoryModel.findOne({
            medicine_id: (item.medicine_id as any)?._id || item.medicine_id,
            in_stock: true,
          })
            .sort({ price: 1 })
            .select('price currency stock_quantity in_stock last_updated')
            .lean();
        }

        return { ...item, current_inventory };
      })
    );

    return { data: enriched, meta: buildPaginationMeta(total, page, limit) };
  }

  async addToWatchlist(
    userId: string,
    input: {
      medicine_id: string;
      pharmacy_id?: string | null;
      notify_price_change?: boolean;
      notify_back_in_stock?: boolean;
      target_price?: number | null;
    }
  ) {
    // Verify medicine exists and is active
    const medicine = await MedicineModel.findOne({ _id: input.medicine_id, is_active: true });
    if (!medicine) {
      throw Object.assign(new Error('Medicine not found'), { statusCode: 404 });
    }

    // If pharmacy_id provided, verify it's approved
    if (input.pharmacy_id) {
      const pharmacy = await PharmacyModel.findOne({
        _id: input.pharmacy_id,
        status: 'approved',
      });
      if (!pharmacy) {
        throw Object.assign(
          new Error('Pharmacy not found or is not approved'),
          { statusCode: 404 }
        );
      }
    }

    // Check for duplicate
    const existing = await WatchlistModel.findOne({
      user_id: userId,
      medicine_id: input.medicine_id,
      pharmacy_id: input.pharmacy_id ?? null,
    });
    if (existing) {
      throw Object.assign(
        new Error('You are already watching this medicine at this pharmacy'),
        { statusCode: 409 }
      );
    }

    const item = await WatchlistModel.create({
      user_id: userId,
      medicine_id: input.medicine_id,
      pharmacy_id: input.pharmacy_id ?? null,
      notify_price_change: input.notify_price_change ?? true,
      notify_back_in_stock: input.notify_back_in_stock ?? true,
      target_price: input.target_price ?? null,
    });

    return (await item.populate([
      { path: 'medicine_id', select: 'name generic_name dosage_form strength' },
      { path: 'pharmacy_id', select: 'name address phone' },
    ])).toObject();
  }

  async removeFromWatchlist(userId: string, watchlistId: string) {
    const item = await WatchlistModel.findOne({ _id: watchlistId, user_id: userId });
    if (!item) {
      throw Object.assign(
        new Error('Watchlist item not found or does not belong to you'),
        { statusCode: 404 }
      );
    }
    await WatchlistModel.findByIdAndDelete(watchlistId);
  }

  // ─── Notifications ─────────────────────────────────────────────────────────

  async getNotifications(
    userId: string,
    params: {
      is_read?: boolean;
      type?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { page, limit } = parsePagination(params.page, params.limit);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { user_id: new mongoose.Types.ObjectId(userId) };
    if (params.is_read !== undefined) filter.is_read = params.is_read;
    if (params.type) filter.type = params.type;

    const total = await NotificationModel.countDocuments(filter);
    const data = await NotificationModel.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const unread_count = await NotificationModel.countDocuments({
      user_id: new mongoose.Types.ObjectId(userId),
      is_read: false,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
      unread_count,
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await NotificationModel.findOne({
      _id: notificationId,
      user_id: userId,
    });

    if (!notification) {
      throw Object.assign(
        new Error('Notification not found or does not belong to you'),
        { statusCode: 404 }
      );
    }

    // Idempotent
    if (notification.is_read) return notification.toObject();

    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();

    return notification.toObject();
  }

  async markAllAsRead(userId: string) {
    const unreadCount = await NotificationModel.countDocuments({
      user_id: new mongoose.Types.ObjectId(userId),
      is_read: false,
    });

    if (unreadCount === 0) return { updated: 0 };

    await NotificationModel.updateMany(
      { user_id: new mongoose.Types.ObjectId(userId), is_read: false },
      { $set: { is_read: true, read_at: new Date() } }
    );

    return { updated: unreadCount };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await NotificationModel.findOne({
      _id: notificationId,
      user_id: userId,
    });

    if (!notification) {
      throw Object.assign(
        new Error('Notification not found or does not belong to you'),
        { statusCode: 404 }
      );
    }

    await NotificationModel.findByIdAndDelete(notificationId);
  }
}
