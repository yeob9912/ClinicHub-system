import mongoose from 'mongoose';
import { logger } from '../../config/logger';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { PharmacyModel } from '../../models/Pharmacy';
import { InventoryModel } from '../../models/Inventory';
import { MedicineModel } from '../../models/Medicine';
import { UserModel } from '../../models/User';
import { NotificationModel } from '../../models/Notification';

export class PharmaciesService {
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
  }

  private async attachHighestPrices(pharmacies: any[]) {
    return Promise.all(
      pharmacies.map(async (ph) => {
        const items = await InventoryModel.find({ pharmacy_id: ph._id }).select('price').lean();
        const highestPrice = items.length > 0 ? Math.max(...items.map((i) => i.price)) : 0;
        return {
          ...ph,
          highest_price: highestPrice,
        };
      })
    );
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

    const filter: any = { status: 'approved', is_active: true };
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    const pharmacies = await PharmacyModel.find(filter).lean();

    const pharmaciesWithDistance = pharmacies
      .map((pharmacy: any) => ({
        ...pharmacy,
        distance_km: this.haversineDistance(lat, lng, pharmacy.latitude, pharmacy.longitude),
      }))
      .filter((ph: any) => ph.distance_km <= radius)
      .sort((a: any, b: any) => a.distance_km - b.distance_km);

    const total = pharmaciesWithDistance.length;
    const paginated = pharmaciesWithDistance.slice(skip, skip + l);
    const paginatedWithPrices = await this.attachHighestPrices(paginated);

    return {
      data: paginatedWithPrices,
      meta: buildPaginationMeta(total, p, l),
    };
  }

  async getById(id: string, userId?: string) {
    let pharmacy = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      pharmacy = await PharmacyModel.findById(id)
        .populate('owner_id', 'full_name email phone')
        .lean();
    }

    if (!pharmacy) {
      const mockNameMap: Record<string, string> = {
        p1: 'Red Cross Pharmacy',
        p2: 'Kenema Pharmacy',
        p3: 'Lion Pharmacy',
        p4: 'Ethio-Medical Pharmacy',
        p5: 'Sheger Pharmacy',
        p6: 'Abyssinia Pharmacy',
        p7: 'Zewditu Pharmacy',
        p8: 'Unity Pharmacy',
        p9: 'Modern Health Pharmacy',
        p10: 'LifeCare Pharmacy'
      };
      const nameToFind = mockNameMap[id];
      if (nameToFind) {
        pharmacy = await PharmacyModel.findOne({ name: { $regex: new RegExp(`^${nameToFind}$`, 'i') } })
          .populate('owner_id', 'full_name email phone')
          .lean();
      }
    }

    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    const medicineCount = await InventoryModel.countDocuments({ pharmacy_id: pharmacy._id });
    return { ...pharmacy, medicine_count: medicineCount };
  }

  async create(userId: string, input: any) {
    // One pharmacy per staff account
    const existing = await PharmacyModel.findOne({ owner_id: userId });
    if (existing) {
      throw Object.assign(new Error('You already have a pharmacy registered'), { statusCode: 409 });
    }

    const user = await UserModel.findById(userId).lean();
    const staffPhone = (user as any)?.phone || input.phone;
    const staffEmail = (user as any)?.email || input.email || '';
    const staffName = (user as any)?.full_name || '';
    const staffAvatar = (user as any)?.avatar_url || '';

    const pharmacy = await PharmacyModel.create({
      ...input,
      phone: staffPhone,
      email: staffEmail,
      owner_id: userId,
      status: 'pending',
      country: input.country || 'ET',
      staff_settings: {
        name: staffName,
        phone: staffPhone,
        avatarUrl: staffAvatar,
        preferences: {
          notifications: true,
          language: 'English',
          theme: 'Light',
        }
      }
    });

    // Notify all admins about the new registration request
    try {
      const admins = await UserModel.find({ role: 'admin' }).select('_id').lean();
      if (admins.length > 0) {
        const applicant = await UserModel.findById(userId).select('full_name').lean();
        const applicantName = (applicant as any)?.full_name ?? 'A user';
        await NotificationModel.insertMany(
          admins.map((admin: any) => ({
            user_id: admin._id,
            type: 'new_pharmacy_request',
            title: 'New Pharmacy Registration Request',
            body: `${applicantName} submitted a registration request for "${pharmacy.name}". Review it in the pharmacy management panel.`,
            data: { pharmacy_id: pharmacy._id.toString(), link: '/admin/pharmacy-management?tab=requests' },
          }))
        );
      }
    } catch (notifErr) {
      logger.warn('Failed to notify admins of new pharmacy registration', notifErr);
    }

    logger.info(`New pharmacy ${pharmacy._id} created by user ${userId}`);
    return pharmacy.toObject();
  }

  async update(userId: string, pharmacyId: string, updates: any) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    if (pharmacy.owner_id.toString() !== userId) {
      throw Object.assign(new Error('Not the pharmacy owner'), { statusCode: 403 });
    }

    // Force pharmacy phone and email to match staff phone and email
    const user = await UserModel.findById(userId).lean();
    if (user) {
      if ((user as any).phone) {
        updates.phone = (user as any).phone;
        updates['staff_settings.phone'] = (user as any).phone;
      }
      if ((user as any).email) {
        updates.email = (user as any).email;
      }
    }

    const updated = await PharmacyModel.findByIdAndUpdate(pharmacyId, updates, { new: true }).lean();
    return updated;
  }

  async delete(userId: string, pharmacyId: string) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    if (pharmacy.owner_id.toString() !== userId) {
      throw Object.assign(new Error('Not the pharmacy owner'), { statusCode: 403 });
    }

    await PharmacyModel.findByIdAndDelete(pharmacyId);
  }

  async list(params: any) {
    const { page = 1, limit = 20, status, medicine, owner_id } = params;
    const { page: p, limit: l } = parsePagination(page, limit);
    const skip = (p - 1) * l;

    // When querying by owner, show ALL statuses (pending, rejected, etc.)
    const filter: any = owner_id ? { owner_id } : { is_active: true };
    if (status) filter.status = status;
    if (!owner_id && !status) filter.status = 'approved'; // public listing only shows approved

    if (medicine) {
      // 1. Search for medicines matching the name or category case-insensitively
      const medicines = await MedicineModel.find({
        $or: [
          { name: { $regex: medicine, $options: 'i' } },
          { category: { $regex: medicine, $options: 'i' } }
        ],
        is_active: true
      }).select('_id name category strength dosage_form').lean();

      if (medicines.length === 0) {
        return { data: [], meta: buildPaginationMeta(0, p, l) };
      }

      const medicineIds = medicines.map(m => m._id);

      // 2. Find all inventory items for these medicines that are in stock
      const inventoryItems = await InventoryModel.find({
        medicine_id: { $in: medicineIds },
        $or: [
          { in_stock: true },
          { stock_quantity: { $gt: 0 } }
        ]
      }).lean();

      if (inventoryItems.length === 0) {
        return { data: [], meta: buildPaginationMeta(0, p, l) };
      }

      const pharmacyIds = inventoryItems.map(inv => inv.pharmacy_id);
      filter._id = { $in: pharmacyIds };

      // 3. Find the pharmacies carrying this medicine
      const pharmacies = await PharmacyModel.find(filter).skip(skip).limit(l).lean();
      const count = await PharmacyModel.countDocuments(filter);

      // 4. Attach matched medicine info and set the active price/status to match
      const data = pharmacies.map((pharmacy: any) => {
        const matchedInvs = inventoryItems.filter(inv => inv.pharmacy_id.toString() === pharmacy._id.toString());
        matchedInvs.sort((a, b) => a.price - b.price);
        const bestInv = matchedInvs[0];
        
        const matchedMed = medicines.find(m => m._id.toString() === bestInv.medicine_id.toString());

        return {
          ...pharmacy,
          price: bestInv.price,
          status: bestInv.stock_quantity >= 15 ? 'In Stock' : bestInv.stock_quantity > 0 ? 'Low Stock' : 'Out of Stock',
          matched_medicine: {
            medicine_id: bestInv.medicine_id,
            name: matchedMed?.name || 'Unknown Medicine',
            price: bestInv.price,
            stock_quantity: bestInv.stock_quantity,
            in_stock: bestInv.in_stock,
          }
        };
      });

      const dataWithHighestPrices = await this.attachHighestPrices(data);
      return { data: dataWithHighestPrices, meta: buildPaginationMeta(count, p, l) };
    }

    const data = await PharmacyModel.find(filter).skip(skip).limit(l).lean();
    const count = await PharmacyModel.countDocuments(filter);

    const dataWithHighestPrices = await this.attachHighestPrices(data);
    return { data: dataWithHighestPrices, meta: buildPaginationMeta(count, p, l) };
  }

  async uploadLogo(userId: string, pharmacyId: string, file: Express.Multer.File) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }
    if (pharmacy.owner_id.toString() !== userId) {
      throw Object.assign(new Error('Not the pharmacy owner'), { statusCode: 403 });
    }

    const mimeType = file.mimetype || 'image/jpeg';
    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    pharmacy.logo_url = dataUri;
    await pharmacy.save();

    logger.info(`Logo updated for pharmacy ${pharmacyId}`);
    return { logo_url: dataUri };
  }

  async updateSettings(userId: string, pharmacyId: string, updates: any) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    if (pharmacy.owner_id.toString() !== userId) {
      throw Object.assign(new Error('Not the pharmacy owner'), { statusCode: 403 });
    }

    // Apply pharmacy properties
    if (updates.name !== undefined) pharmacy.name = updates.name;
    if (updates.description !== undefined) pharmacy.description = updates.description;
    if (updates.logo_url !== undefined) pharmacy.logo_url = updates.logo_url;
    if (updates.opening_hours !== undefined) pharmacy.opening_hours = updates.opening_hours;

    // Apply staff settings and preferences
    if (updates.staff_settings !== undefined) {
      pharmacy.staff_settings = {
        ...pharmacy.staff_settings,
        ...updates.staff_settings,
        preferences: {
          ...(pharmacy.staff_settings?.preferences || {}),
          ...(updates.staff_settings.preferences || {}),
        }
      };
    }

    // Propagate any staff name, phone, or avatarUrl modifications to the corresponding User document
    const user = await UserModel.findById(userId);
    if (user) {
      let userChanged = false;
      if (updates.staff_settings?.name !== undefined && user.full_name !== updates.staff_settings.name) {
        user.full_name = updates.staff_settings.name;
        userChanged = true;
      }
      if (updates.staff_settings?.phone !== undefined && user.phone !== updates.staff_settings.phone) {
        user.phone = updates.staff_settings.phone;
        userChanged = true;
      }
      if (updates.staff_settings?.avatarUrl !== undefined && user.avatar_url !== updates.staff_settings.avatarUrl) {
        user.avatar_url = updates.staff_settings.avatarUrl;
        userChanged = true;
      }
      if (updates.staff_settings?.preferences?.notifications !== undefined && user.preferences?.notifications !== updates.staff_settings.preferences.notifications) {
        user.preferences = {
          ...(user.preferences || {}),
          notifications: updates.staff_settings.preferences.notifications,
        };
        userChanged = true;
      }
      if (userChanged) {
        await user.save();
      }

      // Ensure pharmacy phone and staff_settings phone are in sync with user phone
      if (user.phone) {
        pharmacy.phone = user.phone;
        if (!pharmacy.staff_settings) {
          pharmacy.staff_settings = {};
        }
        pharmacy.staff_settings.phone = user.phone;
      }
    }

    await pharmacy.save();
    return pharmacy.toObject();
  }

  async createAnnouncement(userId: string, pharmacyId: string, input: any) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }
    if (pharmacy.owner_id.toString() !== userId) {
      throw Object.assign(new Error('Not the pharmacy owner'), { statusCode: 403 });
    }

    const newAnnouncement = {
      _id: new mongoose.Types.ObjectId(),
      title: input.title || '',
      content: input.content || '',
      image_url: input.image_url || null,
      type: input.type || 'general',
      is_pinned: input.is_pinned || false,
      created_at: new Date(),
      updated_at: new Date()
    };

    if (!pharmacy.announcements) {
      pharmacy.announcements = [];
    }

    pharmacy.announcements.push(newAnnouncement as any);
    await pharmacy.save();

    // Broadcast notifications to all users (patients) and admins
    try {
      const admins = await UserModel.find({ role: 'admin' }).select('_id').lean();
      const patients = await UserModel.find({ role: 'patient' }).select('_id').lean();
      const allRecipients = [...admins, ...patients];

      if (allRecipients.length > 0) {
        await NotificationModel.insertMany(
          allRecipients.map((r: any) => ({
            user_id: r._id,
            type: 'system',
            title: `${pharmacy.name}: ${newAnnouncement.title || 'New Announcement'}`,
            body: newAnnouncement.content || 'A new announcement has been published.',
            data: {
              pharmacy_id: pharmacy._id.toString(),
              announcement_id: newAnnouncement._id.toString(),
              link: `/pharmacies/${pharmacy._id.toString()}`
            },
          }))
        );
      }
    } catch (err) {
      logger.warn('Failed to broadcast announcement notification', err);
    }

    return newAnnouncement;
  }

  async updateAnnouncement(userId: string, pharmacyId: string, announcementId: string, input: any) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }
    if (pharmacy.owner_id.toString() !== userId) {
      throw Object.assign(new Error('Not the pharmacy owner'), { statusCode: 403 });
    }

    const ann = pharmacy.announcements?.find((a: any) => a._id.toString() === announcementId);
    if (!ann) {
      throw Object.assign(new Error('Announcement not found'), { statusCode: 404 });
    }

    if (input.title !== undefined) ann.title = input.title;
    if (input.content !== undefined) ann.content = input.content;
    if (input.image_url !== undefined) ann.image_url = input.image_url;
    if (input.type !== undefined) ann.type = input.type;
    if (input.is_pinned !== undefined) ann.is_pinned = input.is_pinned;
    ann.updated_at = new Date();

    await pharmacy.save();
    return ann;
  }

  async deleteAnnouncement(userId: string, pharmacyId: string, announcementId: string) {
    const pharmacy = await PharmacyModel.findById(pharmacyId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }
    if (pharmacy.owner_id.toString() !== userId) {
      throw Object.assign(new Error('Not the pharmacy owner'), { statusCode: 403 });
    }

    if (!pharmacy.announcements) return;
    pharmacy.announcements = pharmacy.announcements.filter((a: any) => a._id.toString() !== announcementId);
    await pharmacy.save();
  }

  async getInventory(pharmacyId: string, params: any = {}) {
    const { page = 1, limit = 20 } = params;
    const { page: p, limit: l } = parsePagination(page, limit);
    const skip = (p - 1) * l;

    const data = await InventoryModel.find({ pharmacy_id: pharmacyId })
      .populate('medicine_id')
      .skip(skip)
      .limit(l)
      .lean();

    const count = await InventoryModel.countDocuments({ pharmacy_id: pharmacyId });

    return { data, meta: buildPaginationMeta(count, p, l) };
  }

  async ratePharmacy(pharmacyId: string, userId: string, newRating: number) {
    // Resolve mock IDs to a real ObjectId using the same map as getById
    let resolvedId: string = pharmacyId;
    if (!mongoose.Types.ObjectId.isValid(pharmacyId)) {
      const mockNameMap: Record<string, string> = {
        p1: 'Red Cross Pharmacy',
        p2: 'Kenema Pharmacy',
        p3: 'Lion Pharmacy',
        p4: 'Ethio-Medical Pharmacy',
        p5: 'Sheger Pharmacy',
        p6: 'Abyssinia Pharmacy',
        p7: 'Zewditu Pharmacy',
        p8: 'Unity Pharmacy',
        p9: 'Modern Health Pharmacy',
        p10: 'LifeCare Pharmacy'
      };
      const name = mockNameMap[pharmacyId];
      if (name) {
        const found = await PharmacyModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }).lean();
        if (found) resolvedId = (found._id as mongoose.Types.ObjectId).toString();
      }
    }

    const pharmacy = await PharmacyModel.findById(resolvedId);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }

    // Recalculate running average
    const oldRating = pharmacy.rating ?? 0;
    const oldCount  = pharmacy.ratings_count ?? 0;
    const newCount  = oldCount + 1;
    const newAverage = Math.round(((oldRating * oldCount) + newRating) / newCount * 10) / 10;

    pharmacy.rating        = newAverage;
    pharmacy.ratings_count = newCount;
    await pharmacy.save();

    // Notify pharmacy staff (owner)
    try {
      const rater = await UserModel.findById(userId).lean();
      const raterName = (rater as any)?.full_name ?? 'A user';

      await NotificationModel.create({
        user_id: pharmacy.owner_id,
        type: 'pharmacy_rated',
        title: 'New Rating Received ⭐',
        body: `${raterName} rated your pharmacy ${newRating} star${newRating !== 1 ? 's' : ''}. Your new average is ${newAverage.toFixed(1)}.`,
        data: { pharmacy_id: resolvedId, rating: newRating, new_average: newAverage },
      });
    } catch (notifErr) {
      logger.warn('Failed to create rating notification', notifErr);
    }

    logger.info(`Pharmacy ${resolvedId} rated ${newRating} stars by user ${userId}. New avg: ${newAverage}`);
    return { rating: newAverage, ratings_count: newCount };
  }
}
