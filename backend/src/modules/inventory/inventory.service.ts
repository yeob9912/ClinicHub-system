import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { UserModel } from '../../models/User';
import { PharmacyModel } from '../../models/Pharmacy';
import { InventoryModel } from '../../models/Inventory';
import { MedicineModel } from '../../models/Medicine';
import { NotificationModel } from '../../models/Notification';

export class InventoryService {
  /**
   * Verifies the caller owns the pharmacy (or is admin) and returns their userId.
   */
  private async resolveOwner(userId: string, pharmacyId: string): Promise<string> {
    const user = await UserModel.findById(userId);
    if (!user || !user.is_active) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    // Admins can operate on any pharmacy
    if (user.role === 'admin') return userId;

    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    if (pharmacy.owner_id.toString() !== userId) {
      throw Object.assign(new Error('You are not the owner of this pharmacy'), { statusCode: 403 });
    }

    return userId;
  }

  async list(
    userId: string | undefined,
    pharmacyId: string,
    params: {
      in_stock?: string;
      low_stock?: string;
      search?: string;
      sort?: string;
      order?: string;
      page?: string | number;
      limit?: string | number;
    }
  ) {
    const isDashboardOrLowStock = params.low_stock === 'true';
    let isOwner = false;

    if (userId) {
      try {
        await this.resolveOwner(userId, pharmacyId);
        isOwner = true;
      } catch (err) {
        if (isDashboardOrLowStock) {
          throw err;
        }
      }
    } else if (isDashboardOrLowStock) {
      throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
    }

    const { page, limit } = parsePagination(params.page, params.limit, 100);
    const skip = (page - 1) * limit;

    const inStock =
      params.in_stock === 'true' ? true : params.in_stock === 'false' ? false : undefined;
    const lowStock = params.low_stock === 'true';
    const sortOrder = params.order === 'asc' ? 1 : -1;
    const sortField = params.sort === 'price' ? 'price'
      : params.sort === 'stock_quantity' ? 'stock_quantity'
      : 'last_updated';

    const filter: Record<string, unknown> = {
      pharmacy_id: new mongoose.Types.ObjectId(pharmacyId),
    };
    if (inStock !== undefined) filter.in_stock = inStock;

    let items = await InventoryModel.find(filter)
      .populate('medicine_id', 'name generic_name dosage_form strength image_url requires_rx category')
      .sort({ [sortField]: sortOrder })
      .lean();

    // Post-fetch filters
    if (lowStock && isOwner) {
      items = items.filter(
        (i: any) => i.stock_quantity > 0 && i.stock_quantity < i.low_stock_threshold
      );
    }
    if (params.search) {
      const needle = params.search.toLowerCase();
      items = items.filter(
        (i: any) => (i.medicine_id as any)?.name?.toLowerCase().includes(needle)
      );
    }

    const total = items.length;
    const paginated = items.slice(skip, skip + limit);

    // Summary for the whole pharmacy
    let summary = {};
    if (isOwner) {
      const allRows = await InventoryModel.find(
        { pharmacy_id: new mongoose.Types.ObjectId(pharmacyId) },
        'in_stock stock_quantity low_stock_threshold'
      ).lean();

      summary = {
        total_items: allRows.length,
        in_stock_count: allRows.filter((r: any) => r.in_stock).length,
        out_of_stock_count: allRows.filter((r: any) => !r.in_stock).length,
        low_stock_count: allRows.filter(
          (r: any) => r.stock_quantity > 0 && r.stock_quantity < r.low_stock_threshold
        ).length,
      };
    }

    // Map each item to also include is_available to match what the frontend expects
    const mappedData = paginated.map((item: any) => ({
      ...item,
      is_available: item.in_stock ?? (item.stock_quantity > 0),
    }));

    return {
      data: mappedData,
      meta: buildPaginationMeta(total, page, limit),
      summary,
    };
  }

  async add(
    userId: string,
    pharmacyId: string,
    input: {
      medicine_id: string;
      price: number;
      currency?: string;
      stock_quantity: number;
      low_stock_threshold?: number;
    }
  ) {
    await this.resolveOwner(userId, pharmacyId);

    // Verify pharmacy is approved
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (pharmacy?.status !== 'approved') {
      throw Object.assign(
        new Error('Inventory can only be added to approved pharmacies'),
        { statusCode: 422 }
      );
    }

    // Verify medicine exists and is active
    const medicine = await MedicineModel.findOne({
      _id: input.medicine_id,
      is_active: true,
    });
    if (!medicine) {
      throw Object.assign(
        new Error('Medicine not found or is not active'),
        { statusCode: 400 }
      );
    }

    // Check for duplicate
    const existing = await InventoryModel.findOne({
      pharmacy_id: pharmacyId,
      medicine_id: input.medicine_id,
    });
    if (existing) {
      throw Object.assign(
        new Error(`${medicine.name} is already in this pharmacy's inventory`),
        { statusCode: 409 }
      );
    }

    const item = await InventoryModel.create({
      pharmacy_id: pharmacyId,
      medicine_id: input.medicine_id,
      price: (medicine as any).price ?? input.price,
      currency: input.currency || 'NGN',
      stock_quantity: input.stock_quantity,
      low_stock_threshold: input.low_stock_threshold ?? 10,
      updated_by: userId,
    });

    return item.toObject();
  }

  async update(
    userId: string,
    pharmacyId: string,
    inventoryId: string,
    updates: {
      price?: number;
      stock_quantity?: number;
      low_stock_threshold?: number;
    }
  ) {
    await this.resolveOwner(userId, pharmacyId);

    const item = await InventoryModel.findOne({
      _id: inventoryId,
      pharmacy_id: pharmacyId,
    });

    if (!item) {
      throw Object.assign(new Error('Inventory item not found'), { statusCode: 404 });
    }

    const medicine = await MedicineModel.findById(item.medicine_id);
    const catalogPrice = medicine?.price ?? updates.price ?? item.price;
    const oldQty = item.stock_quantity;
    const isIncrease = updates.stock_quantity !== undefined && updates.stock_quantity > oldQty;

    if (updates.price !== undefined || medicine?.price !== undefined) {
      item.previous_price = item.price;
      item.price = catalogPrice;
    }
    if (updates.stock_quantity !== undefined) item.stock_quantity = updates.stock_quantity;
    if (updates.low_stock_threshold !== undefined)
      item.low_stock_threshold = updates.low_stock_threshold;

    item.updated_by = new mongoose.Types.ObjectId(userId);
    await item.save(); // triggers pre-save hook for in_stock

    if (isIncrease) {
      try {
        const staff = await UserModel.findById(userId).lean();
        const pharmacy = await PharmacyModel.findById(pharmacyId).lean();
        const admins = await UserModel.find({ role: 'admin' }).select('_id').lean();
        if (admins.length > 0 && staff && pharmacy && medicine) {
          await NotificationModel.insertMany(
            admins.map((admin: any) => ({
              user_id: admin._id,
              type: 'inventory_increase',
              title: 'Inventory Quantity Increased',
              body: `${(staff as any).full_name} increased the stock of "${medicine.name}" at "${pharmacy.name}" from ${oldQty} to ${updates.stock_quantity} units.`,
              data: {
                pharmacy_id: pharmacyId,
                medicine_id: item.medicine_id.toString(),
                old_quantity: oldQty,
                new_quantity: updates.stock_quantity,
                link: '/admin/medicine-management'
              }
            }))
          );
        }
      } catch (err) {
        logger.warn('Failed to notify admins of inventory increase', err);
      }
    }

    return item.toObject();
  }

  async bulkUpsert(
    userId: string,
    pharmacyId: string,
    items: {
      medicine_id: string;
      price: number;
      stock_quantity: number;
      low_stock_threshold?: number;
    }[],
    partial = false
  ) {
    await this.resolveOwner(userId, pharmacyId);

    let created = 0;
    let updated = 0;
    const errors: { medicine_id: string; error: string }[] = [];

    for (const item of items) {
      try {
        const medicine = await MedicineModel.findById(item.medicine_id);
        const catalogPrice = medicine?.price ?? item.price;

        const existing = await InventoryModel.findOne({
          pharmacy_id: pharmacyId,
          medicine_id: item.medicine_id,
        });

        if (existing) {
          const oldQty = existing.stock_quantity;
          const isIncrease = item.stock_quantity > oldQty;

          existing.previous_price = existing.price;
          existing.price = catalogPrice;
          existing.stock_quantity = item.stock_quantity;
          if (item.low_stock_threshold !== undefined) {
            existing.low_stock_threshold = item.low_stock_threshold;
          }
          existing.updated_by = new mongoose.Types.ObjectId(userId);
          await existing.save();
          updated++;

          if (isIncrease) {
            try {
              const staff = await UserModel.findById(userId).lean();
              const pharmacy = await PharmacyModel.findById(pharmacyId).lean();
              const admins = await UserModel.find({ role: 'admin' }).select('_id').lean();
              if (admins.length > 0 && staff && pharmacy && medicine) {
                await NotificationModel.insertMany(
                  admins.map((admin: any) => ({
                    user_id: admin._id,
                    type: 'inventory_increase',
                    title: 'Inventory Quantity Increased',
                    body: `${(staff as any).full_name} increased the stock of "${medicine.name}" at "${pharmacy.name}" from ${oldQty} to ${item.stock_quantity} units.`,
                    data: {
                      pharmacy_id: pharmacyId,
                      medicine_id: item.medicine_id,
                      old_quantity: oldQty,
                      new_quantity: item.stock_quantity,
                      link: '/admin/medicine-management'
                    }
                  }))
                );
              }
            } catch (err) {
              logger.warn('Failed to notify admins of bulk inventory increase', err);
            }
          }
        } else {
          await InventoryModel.create({
            pharmacy_id: pharmacyId,
            medicine_id: item.medicine_id,
            price: catalogPrice,
            stock_quantity: item.stock_quantity,
            low_stock_threshold: item.low_stock_threshold ?? 10,
            updated_by: userId,
          });
          created++;
        }
      } catch (err: unknown) {
        const e = err as Error;
        if (partial) {
          errors.push({ medicine_id: item.medicine_id, error: e.message });
        } else {
          throw Object.assign(
            new Error(`Bulk operation failed on medicine ${item.medicine_id}: ${e.message}`),
            { statusCode: 400 }
          );
        }
      }
    }

    return { updated, created, errors };
  }

  async remove(userId: string, pharmacyId: string, inventoryId: string) {
    await this.resolveOwner(userId, pharmacyId);

    const item = await InventoryModel.findOne({
      _id: inventoryId,
      pharmacy_id: pharmacyId,
    });

    if (!item) {
      throw Object.assign(new Error('Inventory item not found'), { statusCode: 404 });
    }

    await InventoryModel.findByIdAndDelete(inventoryId);
  }
}
