import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { InventoryModel } from '../../models/Inventory';
import { MedicineModel as Medicine } from '../../models/Medicine';

export class MedicinesService {
  async search(params: {
    q: string;
    category?: string;
    category_id?: string;
    requires_rx?: boolean;
    page?: number;
    limit?: number;
    userId?: string;
  }) {
    const { q, category, category_id, requires_rx } = params;
    const { page, limit } = parsePagination(params.page, params.limit, 50);
    const skip = (page - 1) * limit;

    let filter: any = { is_active: true };
    const categoryQuery = category || category_id;
    if (categoryQuery) filter.category = categoryQuery;
    if (requires_rx !== undefined) filter.requires_rx = requires_rx;

    // Full-text search
    const searchFilter = {
      ...filter,
      $text: { $search: q },
    };

    const data = await Medicine.find(searchFilter)
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await Medicine.countDocuments(searchFilter);

    // Fetch and append pricing and stock details from Inventory
    const dataWithPrice = await Promise.all(data.map(async (med: any) => {
      const inventories = await InventoryModel.find({ medicine_id: med._id }).lean();
      const lowestPrice = inventories.length > 0 ? Math.min(...inventories.map((i: any) => i.price)) : 15;
      const totalStock = inventories.reduce((sum: number, i: any) => sum + (i.stock_quantity || 0), 0);
      
      let stockStatus = 'Out of Stock';
      if (totalStock >= 15) {
        stockStatus = 'In Stock';
      } else if (totalStock > 0) {
        stockStatus = 'Low Stock';
      }

      return {
        ...med,
        price: lowestPrice,
        stockStatus,
        stock_quantity: totalStock,
      };
    }));

    // Log search for analytics (fire-and-forget)
    if (params.userId) {
      logger.info(`User ${params.userId} searched for: ${q}`);
    }

    return { data: dataWithPrice, meta: buildPaginationMeta(count, page, limit) };
  }

  async list(params: {
    category?: string;
    category_id?: string;
    requires_rx?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const { category, category_id, requires_rx, sort = 'name', order = 'asc' } = params;
    const { page, limit } = parsePagination(params.page, params.limit);
    const skip = (page - 1) * limit;

    let filter: any = { is_active: true };
    const categoryQuery = category || category_id;
    if (categoryQuery) filter.category = categoryQuery;
    if (requires_rx !== undefined) filter.requires_rx = requires_rx;

    const sortOrder = order === 'asc' ? 1 : -1;
    const data = await Medicine.find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await Medicine.countDocuments(filter);

    // Fetch and append pricing and stock details from Inventory
    const dataWithPrice = await Promise.all(data.map(async (med: any) => {
      const inventories = await InventoryModel.find({ medicine_id: med._id }).lean();
      const lowestPrice = inventories.length > 0 ? Math.min(...inventories.map((i: any) => i.price)) : 15;
      const totalStock = inventories.reduce((sum: number, i: any) => sum + (i.stock_quantity || 0), 0);
      
      let stockStatus = 'Out of Stock';
      if (totalStock >= 15) {
        stockStatus = 'In Stock';
      } else if (totalStock > 0) {
        stockStatus = 'Low Stock';
      }

      return {
        ...med,
        price: lowestPrice,
        stockStatus,
        stock_quantity: totalStock,
      };
    }));

    return { data: dataWithPrice, meta: buildPaginationMeta(count, page, limit) };
  }

  async getById(id: string) {
    const medicine = await Medicine.findById(id).lean();
    if (!medicine) {
      throw Object.assign(new Error('Medicine not found'), { statusCode: 404 });
    }
    return medicine;
  }

  async getByIds(ids: string[]) {
    return await Medicine.find({ _id: { $in: ids } }).lean();
  }

  async create(data: any, userId?: string) {
    let pharmacyId = null;
    let pharmacyName = "Unknown Pharmacy";
    if (userId) {
      const { PharmacyModel } = require('../../models/Pharmacy');
      const pharmacy = await PharmacyModel.findOne({ owner_id: new mongoose.Types.ObjectId(userId) });
      if (pharmacy) {
        pharmacyId = pharmacy._id;
        pharmacyName = pharmacy.name;
      }
    }

    const medicine = await Medicine.create({
      ...data,
      created_by_pharmacy: pharmacyId,
    });

    // Notify all admin users
    try {
      const { UserModel } = require('../../models/User');
      const { NotificationModel } = require('../../models/Notification');
      
      const admins = await UserModel.find({ role: 'admin' });
      const notifications = admins.map((admin: any) => ({
        user_id: admin._id,
        type: 'new_medicine',
        title: 'New Medicine Registered',
        body: `Pharmacy "${pharmacyName}" registered a new medicine: "${medicine.name}". Please review and verify the details.`,
        data: {
          medicine_id: medicine._id.toString(),
          pharmacy_id: pharmacyId ? pharmacyId.toString() : null,
          pharmacy_name: pharmacyName
        }
      }));

      if (notifications.length > 0) {
        await NotificationModel.insertMany(notifications);
      }
    } catch (err) {
      logger.error({ err }, 'Failed to create admin notification for new medicine');
    }

    return medicine.toObject();
  }

  async update(id: string, data: any) {
    const medicine = await Medicine.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!medicine) {
      throw Object.assign(new Error('Medicine not found'), { statusCode: 404 });
    }
    return medicine;
  }

  async delete(id: string) {
    await Medicine.findByIdAndDelete(id);
  }

  async listCategories() {
    const categories = await Medicine.distinct('category');
    return categories;
  }

  async getAvailability(params: {
    id: string;
    lat?: number;
    lng?: number;
    radius?: number;
    sort_by?: string;
    in_stock_only?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { id, in_stock_only = false } = params;
    const { page, limit } = parsePagination(params.page, params.limit, 50);
    const skip = (page - 1) * limit;

    // Verify medicine exists
    const medicine = await Medicine.findById(id).lean();
    if (!medicine) {
      throw Object.assign(new Error('Medicine not found'), { statusCode: 404 });
    }

    // Query inventory for all pharmacies that carry this medicine
    const filter: Record<string, unknown> = { medicine_id: new (require('mongoose').Types.ObjectId)(id) };
    if (in_stock_only) filter.in_stock = true;

    const inventories = await InventoryModel.find(filter)
      .populate('pharmacy_id', 'name city address phone email logo_url status')
      .sort({ stock_quantity: -1 })
      .lean();

    // Filter to only approved pharmacies
    const approvedInventories = inventories.filter(
      (inv: any) => inv.pharmacy_id && (inv.pharmacy_id as any).status === 'approved'
    );

    const total = approvedInventories.length;
    const paginated = approvedInventories.slice(skip, skip + limit);

    const data = paginated.map((inv: any) => ({
      pharmacy_id: (inv.pharmacy_id as any)._id,
      pharmacy_name: (inv.pharmacy_id as any).name,
      pharmacy_city: (inv.pharmacy_id as any).city,
      pharmacy_address: (inv.pharmacy_id as any).address,
      pharmacy_phone: (inv.pharmacy_id as any).phone,
      pharmacy_logo_url: (inv.pharmacy_id as any).logo_url,
      price: inv.price,
      currency: inv.currency,
      stock_quantity: inv.stock_quantity,
      in_stock: inv.in_stock,
    }));

    return {
      medicine,
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getCategories() {
    const categories = await Medicine.distinct('category');
    return categories.map((cat: string) => ({ name: cat, is_active: true }));
  }
}

