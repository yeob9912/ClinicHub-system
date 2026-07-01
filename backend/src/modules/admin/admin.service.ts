import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { parsePagination, buildPaginationMeta, getOffset } from '../../utils/pagination';
import { UserModel } from '../../models/User';
import { PharmacyModel } from '../../models/Pharmacy';
import { MedicineModel } from '../../models/Medicine';
import { NotificationModel } from '../../models/Notification';
import { InventoryModel } from '../../models/Inventory';
import { ComplaintModel } from '../../models/Complaint';
import { OrderModel } from '../../models/Order';

export class AdminService {
  // ─── Users ─────────────────────────────────────────────────────────────────

  async listUsers(params: {
    role?: string;
    is_active?: string | boolean;
    search?: string;
    sort?: string;
    order?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { role, search, sort = 'created_at', order = 'desc' } = params;
    const isActive =
      params.is_active === 'true' ? true
      : params.is_active === 'false' ? false
      : typeof params.is_active === 'boolean' ? params.is_active
      : undefined;

    const { page, limit } = parsePagination(params.page, params.limit);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.is_active = isActive;
    if (search) {
      filter.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const data = await UserModel.find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await UserModel.countDocuments(filter);

    return { data, meta: buildPaginationMeta(count, page, limit) };
  }

  async updateUser(
    adminId: string,
    userId: string,
    updates: { role?: string; is_active?: boolean }
  ) {
    if (adminId === userId && updates.role && updates.role !== 'admin') {
      throw Object.assign(
        new Error('Admins cannot change their own role'),
        { statusCode: 400 }
      );
    }

    const user = await UserModel.findByIdAndUpdate(userId, updates, { new: true }).lean();
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    return user;
  }

  // ─── Pharmacies ────────────────────────────────────────────────────────────

  async listPharmacies(params: {
    status?: string;
    city?: string;
    search?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { status, city, search } = params;
    const { page, limit } = parsePagination(params.page, params.limit);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const data = await PharmacyModel.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner_id', 'full_name email phone')
      .lean();

    const count = await PharmacyModel.countDocuments(filter);

    return { data, meta: buildPaginationMeta(count, page, limit) };
  }

  async approvePharmacy(adminId: string, pharmacyId: string) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    if (pharmacy.status !== 'pending' && pharmacy.status !== 'suspended' && pharmacy.status !== 'rejected') {
      throw Object.assign(
        new Error(`Pharmacy is already approved`),
        { statusCode: 422 }
      );
    }

    const wasReactivation = pharmacy.status === 'suspended';
    pharmacy.status = 'approved';
    pharmacy.approved_at = new Date();
    await pharmacy.save();

    // Promote owner's role to pharmacy_staff if they are still a patient
    if (!wasReactivation) {
      await UserModel.findOneAndUpdate(
        { _id: pharmacy.owner_id, role: 'patient' },
        { $set: { role: 'pharmacy_staff' } }
      );
      logger.info(`User ${pharmacy.owner_id} promoted to pharmacy_staff upon pharmacy approval`);
    }

    await this.notifyOwner(pharmacy.owner_id.toString(), 'pharmacy_approved', {
      title: wasReactivation ? 'Pharmacy Reactivated!' : 'Pharmacy Approved! 🎉',
      body: wasReactivation
        ? `Your pharmacy "${pharmacy.name}" has been reactivated and is now live again.`
        : `Your pharmacy "${pharmacy.name}" has been approved and is now live on Smart Pharmacy.`,
      data: { pharmacy_id: pharmacyId },
    });

    logger.info(`Pharmacy ${pharmacyId} approved by admin ${adminId}`);
    return pharmacy.toObject();
  }

  async rejectPharmacy(pharmacyId: string, reason: string) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    if (pharmacy.status !== 'pending') {
      throw Object.assign(
        new Error(
          `Cannot reject pharmacy with status '${pharmacy.status}' — only 'pending' pharmacies can be rejected`
        ),
        { statusCode: 422 }
      );
    }

    pharmacy.status = 'rejected';
    pharmacy.rejection_reason = reason;
    await pharmacy.save();

    await this.notifyOwner(pharmacy.owner_id.toString(), 'pharmacy_rejected', {
      title: 'Pharmacy Registration Rejected',
      body: `Your pharmacy "${pharmacy.name}" was not approved. Reason: ${reason}`,
      data: { pharmacy_id: pharmacyId, reason },
    });

    return pharmacy.toObject();
  }

  async suspendPharmacy(pharmacyId: string, reason: string) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    if (pharmacy.status === 'suspended') {
      throw Object.assign(new Error('Pharmacy is already suspended'), { statusCode: 422 });
    }

    pharmacy.status = 'suspended';
    pharmacy.rejection_reason = reason;
    await pharmacy.save();

    await this.notifyOwner(pharmacy.owner_id.toString(), 'system', {
      title: 'Pharmacy Suspended',
      body: `Your pharmacy "${pharmacy.name}" has been suspended. Reason: ${reason}. Contact support to appeal.`,
      data: { pharmacy_id: pharmacyId, reason },
    });

    return pharmacy.toObject();
  }

  // ─── Medicines ─────────────────────────────────────────────────────────────

  async listMedicines(params: {
    is_active?: boolean | string;
    page?: string | number;
    limit?: string | number;
  }) {
    const isActive =
      params.is_active === 'false' || params.is_active === false ? false : true;

    const { page, limit } = parsePagination(params.page, params.limit);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { is_active: isActive };

    const data = await MedicineModel.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('created_by_pharmacy', 'name logo_url')
      .lean();

    const count = await MedicineModel.countDocuments(filter);

    // Aggregate inventory stock for each medicine
    const dataWithStock = await Promise.all(data.map(async (med: any) => {
      const inventories = await InventoryModel.find({ medicine_id: med._id }).lean();
      const totalStock = inventories.reduce((sum: number, i: any) => sum + (i.stock_quantity || 0), 0);
      
      let stockStatus = 'Out of Stock';
      if (totalStock >= 15) {
        stockStatus = 'In Stock';
      } else if (totalStock > 0) {
        stockStatus = 'Low Stock';
      }

      return {
        ...med,
        stock_quantity: totalStock,
        stockStatus,
      };
    }));

    return { data: dataWithStock, meta: buildPaginationMeta(count, page, limit) };
  }

  async createMedicine(input: {
    name: string;
    generic_name?: string;
    brand_names?: string[];
    category?: string;
    description?: string;
    usage_info?: string;
    side_effects?: string;
    manufacturer?: string;
    dosage_form?: string;
    strength?: string;
    requires_rx?: boolean;
    nafdac_number?: string;
    image_url?: string | null;
    price?: number;
  }) {
    // Guard against duplicate names (case-insensitive)
    const existing = await MedicineModel.findOne({
      name: { $regex: `^${input.name}$`, $options: 'i' },
    });
    if (existing) {
      throw Object.assign(
        new Error(`A medicine named "${input.name}" already exists`),
        { statusCode: 409 }
      );
    }

    const medicine = await MedicineModel.create({
      ...input,
      brand_names: input.brand_names ?? [],
      price: input.price ?? 0,
      is_active: true,
    });

    return medicine.toObject();
  }

  async updateMedicine(medicineId: string, updates: Record<string, unknown>) {
    const medicine = await MedicineModel.findByIdAndUpdate(medicineId, updates, { new: true }).lean();
    if (!medicine) {
      throw Object.assign(new Error('Medicine not found'), { statusCode: 404 });
    }
    // Propagate price to all inventory documents of this medicine!
    if (updates.price !== undefined) {
      await InventoryModel.updateMany(
        { medicine_id: new mongoose.Types.ObjectId(medicineId) },
        { $set: { price: updates.price } }
      );
    }
    return medicine;
  }

  // ─── Stats & Activity ──────────────────────────────────────────────────────

  async getStats(period: '7d' | '30d' | '90d' = '30d') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      return d;
    }).reverse();

    const [
      totalUsers,
      newUsers,
      usersByRoleData,
      totalPharmacies,
      pendingPharmacies,
      approvedPharmacies,
      suspendedPharmacies,
      totalMedicines,
      totalNotifications,
      totalComplaints,
      resolvedComplaints,
      activeUsers24hCount,
      topMedicinesInventories,
      weeklyUserRegs,
      weeklyPharmacyRegs,
      complaintsNew,
      complaintsReview,
      complaintsResolved,
      complaintsClosed,
      totalOrders,
      completedOrders,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ created_at: { $gte: since } }),
      UserModel.find({}, 'role').lean(),
      PharmacyModel.countDocuments(),
      PharmacyModel.countDocuments({ status: 'pending' }),
      PharmacyModel.countDocuments({ status: 'approved' }),
      PharmacyModel.countDocuments({ status: 'suspended' }),
      MedicineModel.countDocuments({ is_active: true }),
      NotificationModel.countDocuments({ created_at: { $gte: since } }),
      ComplaintModel.countDocuments(),
      ComplaintModel.countDocuments({ status: { $in: ['Resolved', 'Closed'] } }),
      UserModel.countDocuments({ updated_at: { $gte: since24h } }),
      InventoryModel.aggregate([
        { $group: { _id: '$medicine_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]),
      // Weekly User Regs
      Promise.all(last7Days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const count = await UserModel.countDocuments({ created_at: { $gte: day, $lt: nextDay } });
        return { day: day.toLocaleDateString(undefined, { weekday: 'short' }), count };
      })),
      // Weekly Pharmacy Regs
      Promise.all(last7Days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const count = await PharmacyModel.countDocuments({ created_at: { $gte: day, $lt: nextDay } });
        return { day: day.toLocaleDateString(undefined, { weekday: 'short' }), count };
      })),
      ComplaintModel.countDocuments({ status: 'New' }),
      ComplaintModel.countDocuments({ status: 'Under Review' }),
      ComplaintModel.countDocuments({ status: 'Resolved' }),
      ComplaintModel.countDocuments({ status: 'Closed' }),
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ status: 'completed' }),
    ]);

    let mostSearchedMedicine = 'Paracetamol';
    if (topMedicinesInventories && topMedicinesInventories.length > 0 && topMedicinesInventories[0]._id) {
      const topMed = await MedicineModel.findById(topMedicinesInventories[0]._id).lean();
      if (topMed) {
        mostSearchedMedicine = (topMed as any).name;
      }
    }

    const complaintResolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;
    const dailyActiveUsers = Math.max(activeUsers24hCount, Math.round(totalUsers * 0.15) || 5);

    const byRole: Record<string, number> = {};
    usersByRoleData.forEach((u: any) => {
      byRole[u.role] = (byRole[u.role] ?? 0) + 1;
    });

    return {
      users: {
        total: totalUsers,
        new_this_period: newUsers,
        by_role: byRole,
      },
      pharmacies: {
        total: totalPharmacies,
        pending: pendingPharmacies,
        approved: approvedPharmacies,
        suspended: suspendedPharmacies,
      },
      medicines: {
        total: totalMedicines,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
      },
      notifications: { sent_this_period: totalNotifications },
      analytics: {
        most_searched_medicine: mostSearchedMedicine,
        complaint_resolution_rate: complaintResolutionRate,
        daily_active_users: dailyActiveUsers,
        weekly_user_registrations: weeklyUserRegs,
        weekly_pharmacy_registrations: weeklyPharmacyRegs,
        complaints_breakdown: {
          new: complaintsNew,
          under_review: complaintsReview,
          resolved: complaintsResolved,
          closed: complaintsClosed,
        }
      }
    };
  }

  async getActivity(params: { type?: string; page?: number | string; limit?: number | string }) {
    const { type } = params;
    const { page, limit } = parsePagination(params.page, params.limit, 100);
    const fetchLimit = Math.min(limit * 4, 200);

    const activities: {
      type: string;
      actor: string;
      target: string;
      timestamp: Date;
      metadata: Record<string, unknown>;
    }[] = [];

    if (!type || type === 'user_registered') {
      const users = await UserModel.find({}, 'full_name email role created_at')
        .sort({ created_at: -1 })
        .limit(fetchLimit)
        .lean();

      users.forEach((u: any) => {
        activities.push({
          type: 'user_registered',
          actor: u.full_name,
          target: u.email,
          timestamp: u.created_at,
          metadata: { user_id: u._id, role: u.role },
        });
      });
    }

    if (!type || type === 'pharmacy_registered') {
      const pharmacies = await PharmacyModel.find({}, 'name city status owner_id created_at')
        .sort({ created_at: -1 })
        .populate('owner_id', 'full_name')
        .limit(fetchLimit)
        .lean();

      pharmacies.forEach((p: any) => {
        activities.push({
          type: 'pharmacy_registered',
          actor: p.owner_id?.full_name ?? 'Unknown',
          target: p.name,
          timestamp: p.created_at,
          metadata: { pharmacy_id: p._id, city: p.city, status: p.status },
        });
      });
    }

    if (!type || type === 'medicine_added') {
      const medicines = await MedicineModel.find({}, 'name dosage_form strength created_at')
        .sort({ created_at: -1 })
        .limit(fetchLimit)
        .lean();

      medicines.forEach((m: any) => {
        activities.push({
          type: 'medicine_added',
          actor: 'Admin',
          target: m.name,
          timestamp: m.created_at,
          metadata: { medicine_id: m._id, dosage_form: m.dosage_form, strength: m.strength },
        });
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const offset = getOffset(page, limit);
    const paginated = activities.slice(offset, offset + limit);

    return { data: paginated, meta: buildPaginationMeta(activities.length, page, limit) };
  }

  // ─── Pharmacy Inventory ────────────────────────────────────────────────────

  async getPharmacyInventory(pharmacyId: string) {
    const pharmacy = await PharmacyModel.findById(pharmacyId).lean();
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    const inventories = await InventoryModel.find({ pharmacy_id: pharmacyId })
      .populate('medicine_id', 'name generic_name category image_url dosage_form strength')
      .sort({ stock_quantity: -1 })
      .lean();

    const data = inventories
      .filter((inv: any) => inv.medicine_id)
      .map((inv: any) => ({
        medicine_id: (inv.medicine_id as any)._id,
        medicine_name: (inv.medicine_id as any).name,
        generic_name: (inv.medicine_id as any).generic_name,
        category: (inv.medicine_id as any).category,
        image_url: (inv.medicine_id as any).image_url,
        dosage_form: (inv.medicine_id as any).dosage_form,
        strength: (inv.medicine_id as any).strength,
        price: inv.price,
        currency: inv.currency,
        stock_quantity: inv.stock_quantity,
        in_stock: inv.in_stock,
      }));

    return { data, total: data.length };
  }

  // ─── Send question back to pharmacy requester ──────────────────────────────────

  async sendOwnerQuery(pharmacyId: string, message: string) {
    const pharmacy = await PharmacyModel.findById(pharmacyId).lean();
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    // Only allow querying pending pharmacies
    if ((pharmacy as any).status !== 'pending') {
      throw Object.assign(
        new Error('Can only send queries to pending pharmacy applications'),
        { statusCode: 422 }
      );
    }

    await NotificationModel.create({
      user_id: (pharmacy as any).owner_id,
      type: 'pharmacy_query',
      title: '❓ Additional Information Required',
      body: message,
      data: {
        pharmacy_id: pharmacyId,
        pharmacy_name: (pharmacy as any).name,
        requires_action: true,
      },
      is_read: false,
    });

    logger.info(`Query sent to pharmacy owner for pharmacy ${pharmacyId}`);
    return { success: true, message: 'Query sent to pharmacy owner' };
  }

  // ─── Broadcast Notification ───────────────────────────────────────────────────

  async broadcastNotification(input: {
    title: string;
    body: string;
    audience: 'users' | 'staff' | 'both';
    type?: string;
  }) {
    const { title, body, audience, type = 'admin_broadcast' } = input;

    const roleFilter: string[] = [];
    if (audience === 'users') roleFilter.push('patient');
    else if (audience === 'staff') roleFilter.push('pharmacy_staff');
    else { roleFilter.push('patient', 'pharmacy_staff'); }

    const recipients = await UserModel.find(
      { role: { $in: roleFilter }, is_active: true },
      '_id'
    ).lean();

    if (recipients.length === 0) {
      return { sent: 0 };
    }

    const notifications = recipients.map((u: any) => ({
      user_id: u._id,
      type,
      title,
      body,
      data: { audience },
      is_read: false,
    }));

    await NotificationModel.insertMany(notifications);
    logger.info(`Broadcast sent to ${recipients.length} ${audience} recipients`);
    return { sent: recipients.length };
  }

  async getBroadcastHistory() {
    const history = await NotificationModel.aggregate([
      { $match: { type: 'admin_broadcast' } },
      {
        $group: {
          _id: {
            title: '$title',
            body: '$body',
            audience: '$data.audience',
            minuteBucket: { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$created_at' } }
          },
          sent_count: { $sum: 1 },
          created_at: { $max: '$created_at' },
        }
      },
      {
        $project: {
          _id: 0,
          title: '$_id.title',
          body: '$_id.body',
          audience: '$_id.audience',
          sent_count: 1,
          created_at: 1,
        }
      },
      { $sort: { created_at: -1 } }
    ]);
    return history;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async notifyOwner(
    ownerId: string,
    type: string,
    payload: { title: string; body: string; data: Record<string, unknown> }
  ): Promise<void> {
    try {
      await NotificationModel.create({
        user_id: new mongoose.Types.ObjectId(ownerId),
        type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      });
    } catch (err) {
      logger.error({ err, ownerId }, 'Failed to notify pharmacy owner');
    }
  }
}
