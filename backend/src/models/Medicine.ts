import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicine extends Document {
  name: string;
  generic_name?: string;
  brand_names: string[];
  category?: string;
  description?: string;
  usage_info?: string;
  side_effects?: string;
  dosage_form?: string;
  strength?: string;
  requires_rx: boolean;
  nafdac_number?: string;
  manufacturer?: string;
  image_url?: string;
  price: number;
  is_active: boolean;
  created_by_pharmacy?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const medicineSchema = new Schema<IMedicine>(
  {
    name:           { type: String, required: true, trim: true },
    generic_name:   { type: String, default: null },
    brand_names:    { type: [String], default: [] },
    category:       { type: String, default: null },
    description:    { type: String, default: null },
    usage_info:     { type: String, default: null },
    side_effects:   { type: String, default: null },
    dosage_form:    { type: String, default: null },
    strength:       { type: String, default: null },
    requires_rx:    { type: Boolean, default: false },
    nafdac_number:  { type: String, default: null },
    manufacturer:   { type: String, default: null },
    image_url:      { type: String, default: null },
    price:          { type: Number, default: 0 },
    is_active:      { type: Boolean, default: true },
    created_by_pharmacy: { type: Schema.Types.ObjectId, ref: 'Pharmacy', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

medicineSchema.index(
  { name: 'text', generic_name: 'text', brand_names: 'text', description: 'text' }
);
medicineSchema.index({ category: 1 });
medicineSchema.index({ requires_rx: 1 });
medicineSchema.index({ is_active: 1 });

export const MedicineModel =
  mongoose.models.Medicine || mongoose.model<IMedicine>('Medicine', medicineSchema);
