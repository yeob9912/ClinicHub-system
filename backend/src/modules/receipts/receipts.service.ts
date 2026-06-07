import mongoose from 'mongoose';
import { ReceiptModel } from '../../models/Receipt';
import { PharmacyModel } from '../../models/Pharmacy';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

export class ReceiptsService {
  // ─── Get all receipts for a pharmacy ────────────────────────────────────────
  async list(
    staffId: string,
    params: { page?: number | string; limit?: number | string }
  ) {
    const { page, limit } = parsePagination(params.page, params.limit, 500);
    const skip = (page - 1) * limit;

    const pharmacy = await PharmacyModel.findOne({ owner_id: staffId });
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found for this account'), { statusCode: 404 });
    }

    const filter = { pharmacy_id: pharmacy._id };

    const data = await ReceiptModel.find(filter)
      .populate('pharmacy_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await ReceiptModel.countDocuments(filter);
    return { data, meta: buildPaginationMeta(count, page, limit) };
  }

  // ─── Get a single receipt by order_id ────────────────────────────────────────
  async getByOrderId(orderId: string) {
    const receipt = await ReceiptModel.findOne({
      order_id: new mongoose.Types.ObjectId(orderId),
    })
      .populate('pharmacy_id', 'name')
      .lean();

    if (!receipt) {
      throw Object.assign(new Error('Receipt not found for this order'), { statusCode: 404 });
    }

    return receipt;
  }
}
