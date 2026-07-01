import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

// MongoDB Schemas
const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  generic_name: String,
  brand_names: [String],
  category: String,
  description: String,
  usage_info: String,
  side_effects: String,
  dosage_form: String,
  strength: String,
  requires_rx: { type: Boolean, default: false },
  nafdac_number: String,
  manufacturer: String,
  is_active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create text index for search
MedicineSchema.index({ name: 'text', generic_name: 'text', brand_names: 'text', description: 'text' });
MedicineSchema.index({ category: 1 });
MedicineSchema.index({ requires_rx: 1 });

const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', MedicineSchema);

export class MedicinesService {
  async search(params: {
    q: string;
    category?: string;
    requires_rx?: boolean;
    page?: number;
    limit?: number;
    userId?: string;
  }) {
    const { q, category, requires_rx } = params;
    const { page, limit } = parsePagination(params.page, params.limit, 50);
    const skip = (page - 1) * limit;

    let filter: any = { is_active: true };
    if (category) filter.category = category;
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

    // Log search for analytics (fire-and-forget)
    if (params.userId) {
      logger.info(`User ${params.userId} searched for: ${q}`);
    }

    return { data, meta: buildPaginationMeta(count, page, limit) };
  }

  async list(params: {
    category?: string;
    requires_rx?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const { category, requires_rx, sort = 'name', order = 'asc' } = params;
    const { page, limit } = parsePagination(params.page, params.limit);
    const skip = (page - 1) * limit;

    let filter: any = { is_active: true };
    if (category) filter.category = category;
    if (requires_rx !== undefined) filter.requires_rx = requires_rx;

    const sortOrder = order === 'asc' ? 1 : -1;
    const data = await Medicine.find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await Medicine.countDocuments(filter);

    return { data, meta: buildPaginationMeta(count, page, limit) };
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

  async create(data: any) {
    const medicine = await Medicine.create(data);
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
}
