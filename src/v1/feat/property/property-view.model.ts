import { Schema, model } from 'mongoose';

export interface IPropertyView {
  propertyId: string;
  ownerId: string;
  viewedAt: Date;
}

const propertyViewSchema = new Schema<IPropertyView>(
  {
    propertyId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    viewedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

propertyViewSchema.index({ ownerId: 1, viewedAt: 1 });

const PropertyViewModel = model<IPropertyView>('PropertyView', propertyViewSchema);

export default PropertyViewModel;
