export interface IPropertyLocation {
  address: string;
  suite?: string;
  city: string;
  state: string;
  country: string;
  coordinates: { type: 'Point'; coordinates: [number, number] }; // GeoJSON
  neighborhoodHighlights?: {
    description?: string;
    tags?: string[];
  };
}

export interface IPropertySize {
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  dimensionDetails?: {
    totalArea?: number; // in square meters
    lotSize?: number; // in square meters
    yearBuilt?: number; // in square meters
    propertyType?: string; // e.g., residential, commercial
  };
}

export interface IPropertyAmenties {
  comfort?: string[];
  safety?: string[];
  recreation?: string[];
}
export interface IProperty {
  title: string;
  description: string;
  type: PropertyType;
  status: PropertyStatus;
  purpose?: PropertyPurpose;
  price: number;
  currency: Currency;
  location: IPropertyLocation;
  features: string[];
  size: IPropertySize;
  amenities: IPropertyAmenties[];
  media: {
    images: { url: string; mediaId: string }[];
    videos: { url: string; mediaId: string }[];
  };
  ownerId: string;
  blockchain?: {
    nftId?: string; // NFT certificate ID
    contractAddress?: string;
    transactionHash?: string;
  };
  isActive: boolean;
  flagged?: boolean;
  flagNote?: string;
  rejectionReason?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPropertyDocument {
  _id: string;
  propertyId: string;
  deedDocument: {
    url: string;
    mediaId: string;
    isVerified: boolean;
  };
  inspectionReport?: {
    url: string;
    mediaId: string;
    isVerified: boolean;
  };
  appraisalReport?: {
    url: string;
    mediaId: string;
    isVerified: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyFilters {
  type?: string;
  /** When set, matches any of these property types (e.g. saved searches with multiple types). */
  types?: string[];
  status?: string;
  purpose?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  ownerId?: string;
  isActive?: boolean;
  search?: string;
  flagged?: boolean;
  /** Gateway forwards the validated app role. Only admin may read review queues. */
  callerRole?: string;
  /** Owner dashboard lists include inactive pending and rejected rows. */
  includeInactive?: boolean;
  /** Properties whose `features` array contains all of these strings. */
  features?: string[];
  /** Geo filter using the property GeoJSON point (km). */
  near?: {
    longitude: number;
    latitude: number;
    maxDistanceKm?: number;
  };
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
}

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  LAND = 'land',
  COMMERCIAL = 'commercial',
}

export enum PropertyStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  SOLD = 'sold',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum PropertyPurpose {
  SALE = 'sale',
  RENT = 'rent',
}

export enum Currency {
  USD = 'USD',
  NGN = 'NGN',
  ETH = 'ETH',
  USDT = 'USDT',
}
