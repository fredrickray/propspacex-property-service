export interface IProperty {
  title: string;
  description: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number;
  currency: Currency;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates: { type: 'Point'; coordinates: [number, number] }; // GeoJSON
  };
  features: string[];
  size: {
    area: number; // square meters
    bedrooms?: number;
    bathrooms?: number;
  };
  amenities: string[];
  media: {
    images: string[];
    videos: string[];
  };
  ownerId: string;
  blockchain?: {
    nftId?: string; // NFT certificate ID
    contractAddress?: string;
    transactionHash?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
}

export enum Currency {
  USD = 'USD',
  NGN = 'NGN',
  ETH = 'ETH',
  USDT = 'USDT',
}
