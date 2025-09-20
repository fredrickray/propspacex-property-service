import paginate from 'mongoose-paginate-v2';
import { PaginateModel, Schema, model } from 'mongoose';
import {
  IProperty,
  Currency,
  PropertyStatus,
  PropertyType,
} from './property.type';

const propertySchema = new Schema<IProperty>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(PropertyType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PropertyStatus),
      default: PropertyStatus.AVAILABLE,
    },
    price: { type: Number, required: true },
    currency: {
      type: String,
      enum: Object.values(Currency),
      default: Currency.USD,
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true },
      },
    },
    features: { type: [String], default: [] },
    size: {
      area: { type: Number, required: true },
      bedrooms: { type: Number },
      bathrooms: { type: Number },
    },
    amenities: { type: [String], default: [] },
    media: {
      images: { type: [String], default: [] },
      videos: { type: [String], default: [] },
    },
    ownerId: { type: String, required: true },
    blockchain: {
      nftId: { type: String },
      contractAddress: { type: String },
      transactionHash: { type: String },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

propertySchema.index({ type: 1, status: 1 });
propertySchema.index({ price: 1, currency: 1 });
propertySchema.index({ 'location.city': 1, 'location.country': 1 });
propertySchema.index({ 'size.bedrooms': 1 });
propertySchema.index({ 'size.bathrooms': 1 });
propertySchema.index({ isActive: 1 });

// Create a 2dsphere index on location.coordinates for geospatial queries
propertySchema.index({ 'location.coordinates': '2dsphere' });

// Add pagination plugin
propertySchema.plugin(paginate);

const PropertyModel = model<IProperty, PaginateModel<IProperty>>(
  'Property',
  propertySchema
);

export default PropertyModel;
