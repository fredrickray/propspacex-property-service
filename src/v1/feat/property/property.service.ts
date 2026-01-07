import {
  ResourceNotFound,
  Unauthorized,
  Forbidden,
  BadRequest,
} from '@middlewares/error.middleware';
import PropertyModel from './property.model';
import {
  IProperty,
  PropertyStatus,
  PropertyFilters,
  PaginationOptions,
} from './property.type';
import { getUserClient, GetUserResponse } from '@grpc/clients/user.client';
import { PaginateResult, FilterQuery } from 'mongoose';

const userClient = getUserClient();

export default class PropertyService {
  private static async verifyUserExists(
    userId: string
  ): Promise<GetUserResponse> {
    try {
      const user = await userClient.getUser({ userId });
      return user;
    } catch (error) {
      throw new ResourceNotFound('User not found');
    }
  }

  private static async verifyPropertyOwnership(
    propertyId: string,
    userId: string
  ): Promise<IProperty> {
    const property = await PropertyModel.findById(propertyId);
    if (!property) {
      throw new ResourceNotFound('Property not found');
    }
    if (property.ownerId !== userId) {
      throw new Forbidden('You do not have permission to modify this property');
    }
    return property as IProperty;
  }

  static async createProperty(payload: IProperty): Promise<IProperty> {
    await this.verifyUserExists(payload.ownerId);

    const property = new PropertyModel(payload);
    return property.save();
  }

  static async getPropertyById(propertyId: string): Promise<IProperty> {
    const property = await PropertyModel.findById(propertyId);
    if (!property) {
      throw new ResourceNotFound('Property not found');
    }
    return property as IProperty;
  }

  static async getPropertyWithOwner(
    propertyId: string
  ): Promise<{ property: IProperty; owner: GetUserResponse }> {
    const property = await this.getPropertyById(propertyId);
    const owner = await this.verifyUserExists(property.ownerId);
    return { property, owner };
  }

  static async listProperties(
    filters: PropertyFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginateResult<IProperty>> {
    const query: FilterQuery<IProperty> = {};

    // Debug: Check total count in collection
    const totalCount = await PropertyModel.countDocuments({});
    console.log('Total properties in database:', totalCount);

    // Apply isActive filter - by default show active properties
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    } else {
      // By default, show active properties (including those where isActive might not be set)
      query.$or = [{ isActive: true }, { isActive: { $exists: false } }];
    }

    // Apply filters
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) {
        query.price.$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        query.price.$lte = filters.maxPrice;
      }
    }
    if (filters.city) {
      query['location.city'] = { $regex: filters.city, $options: 'i' };
    }
    if (filters.country) {
      query['location.country'] = { $regex: filters.country, $options: 'i' };
    }
    if (filters.bedrooms !== undefined) {
      query['size.bedrooms'] = { $gte: filters.bedrooms };
    }
    if (filters.bathrooms !== undefined) {
      query['size.bathrooms'] = { $gte: filters.bathrooms };
    }
    if (filters.ownerId) {
      query.ownerId = filters.ownerId;
    }
    if (filters.search) {
      // If we already have $or for isActive, we need to use $and to combine with search
      const searchCondition = {
        $or: [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
        ],
      };

      if (query.$or) {
        // Combine isActive $or with search $or using $and
        const isActiveCondition = query.$or;
        delete query.$or;
        query.$and = [{ $or: isActiveCondition }, searchCondition];
      } else {
        query.$or = searchCondition.$or;
      }
    }

    const options = {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sort: pagination.sort || '-createdAt',
    };

    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('Options:', options);

    return PropertyModel.paginate(query, options);
  }

  static async getPropertiesByOwner(
    ownerId: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginateResult<IProperty>> {
    await this.verifyUserExists(ownerId);

    return this.listProperties({ ownerId }, pagination);
  }

  static async updateProperty(
    propertyId: string,
    userId: string,
    updates: Partial<IProperty>
  ): Promise<IProperty> {
    await this.verifyUserExists(userId);

    await this.verifyPropertyOwnership(propertyId, userId);

    // Prevent updating sensitive fields
    const { ownerId, blockchain, createdAt, updatedAt, ...safeUpdates } =
      updates as any;

    const updatedProperty = await PropertyModel.findByIdAndUpdate(
      propertyId,
      { $set: safeUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedProperty) {
      throw new ResourceNotFound('Property not found');
    }

    return updatedProperty as IProperty;
  }

  static async updatePropertyStatus(
    propertyId: string,
    userId: string,
    status: PropertyStatus
  ): Promise<IProperty> {
    await this.verifyUserExists(userId);

    await this.verifyPropertyOwnership(propertyId, userId);

    const updatedProperty = await PropertyModel.findByIdAndUpdate(
      propertyId,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!updatedProperty) {
      throw new ResourceNotFound('Property not found');
    }

    return updatedProperty as IProperty;
  }

  static async deleteProperty(
    propertyId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.verifyUserExists(userId);

    await this.verifyPropertyOwnership(propertyId, userId);

    await PropertyModel.findByIdAndUpdate(propertyId, {
      $set: { isActive: false },
    });

    return { success: true, message: 'Property deleted successfully' };
  }

  static async hardDeleteProperty(
    propertyId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.verifyUserExists(userId);

    await this.verifyPropertyOwnership(propertyId, userId);

    await PropertyModel.findByIdAndDelete(propertyId);

    return { success: true, message: 'Property permanently deleted' };
  }

  /**
   * Search properties by location (geospatial)
   */
  static async searchByLocation(
    longitude: number,
    latitude: number,
    maxDistanceKm: number = 10,
    pagination: PaginationOptions = {}
  ): Promise<IProperty[]> {
    const maxDistanceMeters = maxDistanceKm * 1000;

    const properties = await PropertyModel.find({
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    })
      .limit(pagination.limit || 10)
      .skip(((pagination.page || 1) - 1) * (pagination.limit || 10));

    return properties as IProperty[];
  }

  static async getOwnerPropertyStats(ownerId: string): Promise<{
    total: number;
    available: number;
    rented: number;
    sold: number;
    pending: number;
  }> {
    await this.verifyUserExists(ownerId);

    const stats = await PropertyModel.aggregate([
      { $match: { ownerId, isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      available: 0,
      rented: 0,
      sold: 0,
      pending: 0,
    };

    stats.forEach((stat) => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
    });

    return result;
  }

  static async updatePropertyMedia(
    propertyId: string,
    userId: string,
    media: { images?: string[]; videos?: string[] }
  ): Promise<IProperty> {
    await this.verifyUserExists(userId);

    await this.verifyPropertyOwnership(propertyId, userId);

    const updateFields: any = {};
    if (media.images) {
      updateFields['media.images'] = media.images;
    }
    if (media.videos) {
      updateFields['media.videos'] = media.videos;
    }

    const updatedProperty = await PropertyModel.findByIdAndUpdate(
      propertyId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedProperty) {
      throw new ResourceNotFound('Property not found');
    }

    return updatedProperty as IProperty;
  }

  static async addPropertyMedia(
    propertyId: string,
    userId: string,
    media: { images?: string[]; videos?: string[] }
  ): Promise<IProperty> {
    await this.verifyUserExists(userId);

    await this.verifyPropertyOwnership(propertyId, userId);

    const updateFields: any = {};
    if (media.images && media.images.length > 0) {
      updateFields['media.images'] = { $each: media.images };
    }
    if (media.videos && media.videos.length > 0) {
      updateFields['media.videos'] = { $each: media.videos };
    }

    const updatedProperty = await PropertyModel.findByIdAndUpdate(
      propertyId,
      { $push: updateFields },
      { new: true }
    );

    if (!updatedProperty) {
      throw new ResourceNotFound('Property not found');
    }

    return updatedProperty as IProperty;
  }

  static async updateBlockchainInfo(
    propertyId: string,
    userId: string,
    blockchain: {
      nftId?: string;
      contractAddress?: string;
      transactionHash?: string;
    }
  ): Promise<IProperty> {
    // Verify user exists
    await this.verifyUserExists(userId);

    // Verify ownership
    await this.verifyPropertyOwnership(propertyId, userId);

    const updatedProperty = await PropertyModel.findByIdAndUpdate(
      propertyId,
      { $set: { blockchain } },
      { new: true }
    );

    if (!updatedProperty) {
      throw new ResourceNotFound('Property not found');
    }

    return updatedProperty as IProperty;
  }
}
