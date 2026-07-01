import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  pharmacy_id: mongoose.Types.ObjectId;
  medicine_id: mongoose.Types.ObjectId;
  price: number;
  previous_price?: number;
  currency: string;
  stock_quantity: number;
  in_stock: boolean;
  low_stock_threshold: number;
  updated_by?: mongoose.Types.ObjectId;
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    pharmacy_id:        { type: Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    medicine_id:        { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    price:              { type: Number, required: true },
    previous_price:     { type: Number, default: null },
    currency:           { type: String, default: 'NGN' },
    stock_quantity:     { type: Number, required: true, default: 0 },
    in_stock:           { type: Boolean, default: true },
    low_stock_threshold:{ type: Number, default: 10 },
    updated_by:         { type: Schema.Types.ObjectId, ref: 'User', default: null },
    last_updated:       { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// Unique constraint: one medicine per pharmacy
inventorySchema.index({ pharmacy_id: 1, medicine_id: 1 }, { unique: true });
inventorySchema.index({ pharmacy_id: 1, in_stock: 1 });
inventorySchema.index({ medicine_id: 1, in_stock: 1, price: 1 });

// Auto-compute in_stock before save
inventorySchema.pre('save', function (next) {
  this.in_stock = this.stock_quantity > 0;
  this.last_updated = new Date();
  next();
});

export const InventoryModel =
  mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', inventorySchema);
