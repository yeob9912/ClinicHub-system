import mongoose, { Document, Schema } from 'mongoose';

export type PharmacyStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface IAnnouncement {
  _id: mongoose.Types.ObjectId;
  title?: string;
  content?: string;
  image_url?: string;
  type: 'holiday' | 'service_interruption' | 'emergency' | 'maintenance' | 'event' | 'achievement' | 'general';
  is_pinned?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface IPharmacy extends Document {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: Record<string, unknown>;
  logo_url?: string;
  status: PharmacyStatus;
  rejection_reason?: string;
  approved_at?: Date;
  is_active: boolean;
  rating: number;
  ratings_count: number;
  owner_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;

  // ✅ ADDED: staff settings (for your Settings page)
  staff_settings?: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
    preferences?: {
      notifications?: boolean;
      language?: string;
      theme?: string;
    };
  };

  // ✅ ADDED: announcements list
  announcements?: IAnnouncement[];
}

const pharmacySchema = new Schema<IPharmacy>(
  {
    name:             { type: String, required: true, trim: true },
    address:          { type: String, default: null },
    city:             { type: String, default: null },
    state:            { type: String, default: null },
    country:          { type: String, default: 'ET' },
    phone:            { type: String, default: null },
    description:      { type: String, default: null },
    email:            { type: String, default: null },
    website:          { type: String, default: null },
    latitude:         { type: Number, default: null },
    longitude:        { type: Number, default: null },
    opening_hours:    { type: Schema.Types.Mixed, default: null },
    logo_url:         { type: String, default: null },
    status:           { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
    rejection_reason: { type: String, default: null },
    approved_at:      { type: Date, default: null },
    is_active:        { type: Boolean, default: true },
    rating:           { type: Number, default: 0 },
    ratings_count:    { type: Number, default: 10 },
    owner_id:         { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // ✅ ADDED FIELD (this enables saving settings)
    staff_settings: {
      type: {
        name: { type: String, default: null },
        phone: { type: String, default: null },
        avatarUrl: { type: String, default: null },
        preferences: {
          notifications: { type: Boolean, default: true },
          language: { type: String, default: 'English' },
          theme: { type: String, default: 'Light' },
        },
      },
      default: {},
    },

    // ✅ ADDED FIELD (this enables publishing announcements)
    announcements: {
      type: [
        {
          title: { type: String, default: '' },
          content: { type: String, default: '' },
          image_url: { type: String, default: null },
          type: { type: String, enum: ['holiday', 'service_interruption', 'emergency', 'maintenance', 'event', 'achievement', 'general'], default: 'general' },
          is_pinned: { type: Boolean, default: false },
          created_at: { type: Date, default: Date.now },
          updated_at: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

pharmacySchema.index({ status: 1, is_active: 1 });
pharmacySchema.index({ owner_id: 1 });
pharmacySchema.index({ city: 1 });

export const PharmacyModel =
  mongoose.models.Pharmacy || mongoose.model<IPharmacy>('Pharmacy', pharmacySchema);