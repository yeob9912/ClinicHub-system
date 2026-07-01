import mongoose from 'mongoose';
import { UserModel, toPublicUser } from '../../models/User';
import { PharmacyModel } from '../../models/Pharmacy';
import { MedicineModel } from '../../models/Medicine';
import { InventoryModel } from '../../models/Inventory';
import { NotificationModel } from '../../models/Notification';

export class UsersService {
  async getProfile(userId: string) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw Object.assign(new Error('User profile not found'), { statusCode: 404 });
    }

    return toPublicUser(user);
  }

  async updateProfile(userId: string, updates: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    preferences?: { notifications?: boolean; default_radius_km?: number };
  }) {
    if (updates.phone) {
      const existingPhone = await UserModel.findOne({
        phone: updates.phone,
        _id: { $ne: userId },
      });

      if (existingPhone) {
        throw Object.assign(new Error('Phone number already taken'), { statusCode: 409 });
      }
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw Object.assign(new Error('User profile not found'), { statusCode: 404 });
    }

    if (updates.full_name !== undefined) user.full_name = updates.full_name;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.avatar_url !== undefined) user.avatar_url = updates.avatar_url;
    if (updates.preferences) {
      user.preferences = { ...user.preferences, ...updates.preferences };
    }

    await user.save();

    // Propagate changes to the Pharmacy document's staff_settings and root phone
    if (updates.full_name !== undefined || updates.phone !== undefined || updates.avatar_url !== undefined) {
      const setFields: any = {
        'staff_settings.name': user.full_name,
        'staff_settings.phone': user.phone,
        'staff_settings.avatarUrl': user.avatar_url,
      };
      if (user.phone) {
        setFields.phone = user.phone; // Update the pharmacy public phone as well
      }
      await PharmacyModel.updateOne(
        { owner_id: userId },
        { $set: setFields }
      );
    }

    return toPublicUser(user);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<{ avatar_url: string }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw Object.assign(new Error('User profile not found'), { statusCode: 404 });
    }

    // Convert buffer to base64 data URI and persist directly in MongoDB
    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;

    user.avatar_url = dataUri;
    await user.save();

    // Propagate avatar change to the Pharmacy document's staff_settings
    await PharmacyModel.updateOne(
      { owner_id: userId },
      {
        $set: {
          'staff_settings.avatarUrl': dataUri
        }
      }
    );

    return { avatar_url: dataUri };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw Object.assign(new Error('User profile not found'), { statusCode: 404 });
    }

    user.is_active = false;
    await user.save();

    return { message: 'Account scheduled for deletion in 30 days' };
  }

  async toggleFavorite(userId: string, input: { type: 'pharmacy' | 'medicine'; id: string }) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw Object.assign(new Error('User profile not found'), { statusCode: 404 });
    }

    const favorites = user.favorites || { pharmacies: [], medicines: [] };
    const { type, id } = input;
    let isAdded = false;

    if (type === 'pharmacy') {
      const index = favorites.pharmacies.indexOf(id);
      if (index > -1) {
        favorites.pharmacies.splice(index, 1);
      } else {
        favorites.pharmacies.push(id);
        isAdded = true;
      }
    } else if (type === 'medicine') {
      const index = favorites.medicines.indexOf(id);
      if (index > -1) {
        favorites.medicines.splice(index, 1);
      } else {
        favorites.medicines.push(id);
        isAdded = true;
      }
    } else {
      throw Object.assign(new Error('Invalid favorite type'), { statusCode: 400 });
    }

    user.favorites = favorites;
    user.markModified('favorites');
    await user.save();

    if (isAdded) {
      const userName = user.full_name;
      if (type === 'pharmacy') {
        let pharmacy = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          pharmacy = await PharmacyModel.findById(id);
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
          const nameToFind = mockNameMap[id] || id;
          pharmacy = await PharmacyModel.findOne({ name: { $regex: new RegExp(`^${nameToFind}$`, 'i') } });
        }

        if (pharmacy && pharmacy.owner_id) {
          await NotificationModel.create({
            user_id: pharmacy.owner_id,
            type: 'system',
            title: 'Pharmacy Saved as Favorite',
            body: `${userName} is save your pharmacy as his favority`,
            data: { pharmacy_id: pharmacy._id.toString() }
          });
        }
      } else if (type === 'medicine') {
        let medicine = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          medicine = await MedicineModel.findById(id);
        }
        if (!medicine) {
          medicine = await MedicineModel.findOne({ name: { $regex: new RegExp(`^${id}$`, 'i') } });
        }

        if (medicine) {
          const inventoryItems = await InventoryModel.find({ medicine_id: medicine._id });
          const pharmacyIds = inventoryItems.map(inv => inv.pharmacy_id);
          const pharmacies = await PharmacyModel.find({ _id: { $in: pharmacyIds } });

          for (const pharmacy of pharmacies) {
            if (pharmacy.owner_id) {
              await NotificationModel.create({
                user_id: pharmacy.owner_id,
                type: 'system',
                title: 'Medicine Saved as Favorite',
                body: `${userName} is save your pharmacy as his favority`,
                data: { medicine_id: medicine._id.toString(), pharmacy_id: pharmacy._id.toString() }
              });
            }
          }
        }
      }
    }

    return toPublicUser(user);
  }
}
