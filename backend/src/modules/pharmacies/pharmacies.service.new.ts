import mongoose from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

// MongoDB Schemas
const PharmacySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  city: String,
  state: String,
  country: String,
  phone: String,
  email: String,
  website: String,
  latitude: Number,
  longitude: Number,
  opening_hours: Object,
  logo_url: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejection_reason: String,
  approved_at: Date,
  is_active: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  owner_id: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Geospatial index for near queries
PharmacySchema.index({ location: '2dsphere' });

const Pharmacy = mongoose.models.Pharmacy || mongoose.model('Pharmacy', PharmacySchema);

const InventorySchema = new mongoose.Schema({
  pharmacy_id: mongoose.Schema.Types.ObjectId,
  medicine_id: mongoose.Schema.Types.ObjectId,
  price: Number,
  stock_quantity: Number,
  unit: { type: String, default: 'piece' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);

export class PharmaciesService {
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getNearby(params: {
    lat: number;
    lng: number;
    radius?: number;
    city?: string;
    page?: number;
    limit?: number;
  }) {
    const { lat, lng, radius = 5, city, page = 1, limit = 20 } = params;
    const { page: p, limit: l } = parsePagination(page, limit, 50);
    const skip = (p - 1) * l;

    let filter: any = { status: 'approved', is_active: true };
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    let pharmacies = await Pharmacy.find(filter).lean();

    // Filter by distance
    const pharmaciesWithDistance = pharmacies
      .map((pharmacy: any) => ({
        ...pharmacy,
        distance_km: this.haversineDistance(lat, lng, pharmacy.latitude, pharmacy.longitude),
      }))
      .filter((ph: any) => ph.distance_km <= radius)
      .sort((a: any, b: any) => a.distance_km - b.distance_km);

    const total = pharmaciesWithDistance.length;
    const paginated = pharmaciesWithDistance.slice(skip, skip + l);

    return {
      data: paginated,
      meta: buildPaginationMeta(total, p, l),
    };
  }

  async getById(id: string) {
    const pharmacy = await Pharmacy.findById(id)
      .populate('owner_id', 'full_name email')
      .lean();

    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    // Get medicine count
    const medicineCount = await Inventory.countDocuments({ pharmacy_id: id });

    return { ...pharmacy, medicine_count: medicineCount };
  }

  async create(userId: string, input: any) {
    const pharmacy = await Pharmacy.create({
      ...input,
      owner_id: userId,
      status: 'pending',
    });

    return pharmacy.toObject();
  }

  async update(id: string, updates: any) {
    const pharmacy = await Pharmacy.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }
    return pharmacy;
  }

  async delete(id: string) {
    await Pharmacy.findByIdAndDelete(id);
  }

  async list(params: any) {
    const { page = 1, limit = 20, status } = params;
    const { page: p, limit: l } = parsePagination(page, limit);
    const skip = (p - 1) * l;

    let filter: any = { is_active: true };
    if (status) filter.status = status;

    const data = await Pharmacy.find(filter)
      .skip(skip)
      .limit(l)
      .lean();

    const count = await Pharmacy.countDocuments(filter);

    return { data, meta: buildPaginationMeta(count, p, l) };
  }

  async getInventory(pharmacyId: string, params: any = {}) {
    const { page = 1, limit = 20 } = params;
    const { page: p, limit: l } = parsePagination(page, limit);
    const skip = (p - 1) * l;

    const data = await Inventory.find({ pharmacy_id: pharmacyId })
      .populate('medicine_id')
      .skip(skip)
      .limit(l)
      .lean();

    const count = await Inventory.countDocuments({ pharmacy_id: pharmacyId });

    return { data, meta: buildPaginationMeta(count, p, l) };
  }

  async addInventory(pharmacyId: string, medicineId: string, input: any) {
    const existing = await Inventory.findOne({
      pharmacy_id: pharmacyId,
      medicine_id: medicineId,
    });

    if (existing) {
      return await Inventory.findByIdAndUpdate(existing._id, input, { new: true }).lean();
    }

    const inventory = await Inventory.create({
      pharmacy_id: pharmacyId,
      medicine_id: medicineId,
      ...input,
    });

    return inventory.toObject();
  }

  async updateInventory(inventoryId: string, updates: any) {
    const inventory = await Inventory.findByIdAndUpdate(inventoryId, updates, { new: true }).lean();
    if (!inventory) {
      throw Object.assign(new Error('Inventory not found'), { statusCode: 404 });
    }
    return inventory;
  }

  async deleteInventory(inventoryId: string) {
    await Inventory.findByIdAndDelete(inventoryId);
  }
}
