import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'patient' | 'pharmacy_staff' | 'admin';

export interface IUser extends Document {
  email: string;
  password_hash?: string | null;
  google_id?: string | null;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  preferences: {
    notifications: boolean;
    default_radius_km: number;
  };
  favorites?: {
    pharmacies: string[];
    medicines: string[];
  };
  is_active: boolean;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, select: false, default: null },
    google_id: { type: String, sparse: true, unique: true },
    full_name: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
    role: {
      type: String,
      enum: ['patient', 'pharmacy_staff', 'admin'],
      default: 'patient',
    },
    avatar_url: { type: String, default: null },
    preferences: {
      notifications: { type: Boolean, default: true },
      default_radius_km: { type: Number, default: 10 },
    },
    favorites: {
      pharmacies: { type: [String], default: [] },
      medicines: { type: [String], default: [] },
    },
    is_active: { type: Boolean, default: true },
    password_reset_token:   { type: String, select: false, default: null },
    password_reset_expires: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

userSchema.index({ phone: 1 }, { unique: true, sparse: true, partialFilterExpression: { phone: { $type: 'string' } } });

export function toPublicUser(user: IUser) {
  return {
    id: user._id.toString(),
    email: user.email,
    phone: user.phone ?? null,
    full_name: user.full_name,
    role: user.role,
    avatar_url: user.avatar_url ?? null,
    preferences: user.preferences,
    favorites: user.favorites || { pharmacies: [], medicines: [] },
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
