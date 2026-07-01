import mongoose, { Document, Schema } from 'mongoose';

export interface ISale extends Document {
  pharmacy_id: mongoose.Types.ObjectId;
  order_id: mongoose.Types.ObjectId;
  patient_name: string;
  items: string;           // human-readable summary e.g. "Amoxicillin 500mg (x2), Paracetamol (x1)"
  total: number;           // in ETB
  payment: string;         // "Bank Transfer" for receipt-based orders
  staff_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const saleSchema = new Schema<ISale>(
  {
    pharmacy_id: { type: Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    order_id:    { type: Schema.Types.ObjectId, ref: 'Order',    required: true, unique: true },
    patient_name:{ type: String, default: 'Patient' },
    items:       { type: String, required: true },
    total:       { type: Number, required: true, min: 0 },
    payment:     { type: String, default: 'Bank Transfer' },
    staff_id:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

saleSchema.index({ pharmacy_id: 1, created_at: -1 });

export const SaleModel =
  mongoose.models.Sale || mongoose.model<ISale>('Sale', saleSchema);
