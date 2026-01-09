import {
  ResourceNotFound,
  Unauthorized,
  Forbidden,
  BadRequest,
} from '@middlewares/error.middleware';
import PropertyModel, { PropertyDocumentModel } from './property.model';
import {
  IProperty,
  IPropertyDocument,
  PropertyStatus,
  PropertyFilters,
  PaginationOptions,
} from './property.type';
import { getUserClient, GetUserResponse } from '@grpc/clients/user.client';
import { PaginateResult, FilterQuery } from 'mongoose';
import {
  getMediaClient,
  MediaItem,
  entityType,
} from '@grpc/clients/media.client';

const userClient = getUserClient();
const mediaClient = getMediaClient();

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

  // ==========================================================================
  // PROPERTY DOCUMENT METHODS
  // ==========================================================================

  /**
   * Document field structure received from API Gateway
   */
  private static validateDocumentField(
    doc: { url: string; mediaId: string } | null | undefined
  ): { url: string; mediaId: string; isVerified: boolean } | undefined {
    if (!doc || !doc.url || !doc.mediaId) {
      return undefined;
    }
    return {
      url: doc.url,
      mediaId: doc.mediaId,
      isVerified: false,
    };
  }

  /**
   * Create property documents record
   * Called by API Gateway after uploading files to Media Service
   */
  static async createPropertyDocuments(
    propertyId: string,
    documents: {
      deedDocument: { url: string; mediaId: string };
      inspectionReport?: { url: string; mediaId: string } | null;
      appraisalReport?: { url: string; mediaId: string } | null;
    }
  ): Promise<IPropertyDocument> {
    // Verify property exists
    await this.getPropertyById(propertyId);

    // Check if documents already exist for this property
    const existingDoc = await PropertyDocumentModel.findOne({ propertyId });
    if (existingDoc) {
      throw new BadRequest(
        'Property documents already exist. Use update methods instead.'
      );
    }

    // Validate deed document (required)
    const deedDocument = this.validateDocumentField(documents.deedDocument);
    if (!deedDocument) {
      throw new BadRequest('Deed document is required with url and mediaId');
    }

    // Create document record
    const propertyDocument = await PropertyDocumentModel.create({
      propertyId,
      deedDocument,
      inspectionReport: this.validateDocumentField(documents.inspectionReport),
      appraisalReport: this.validateDocumentField(documents.appraisalReport),
    });

    return propertyDocument as IPropertyDocument;
  }

  /**
   * Update a specific property document
   * Called by API Gateway after uploading a new file to Media Service
   */
  static async updatePropertyDocument(
    propertyId: string,
    userId: string,
    documentType: 'deedDocument' | 'inspectionReport' | 'appraisalReport',
    documentData: { url: string; mediaId: string }
  ): Promise<IPropertyDocument> {
    // Verify user exists
    await this.verifyUserExists(userId);

    // Verify ownership
    await this.verifyPropertyOwnership(propertyId, userId);

    // Check if property document record exists
    const existingDoc = await PropertyDocumentModel.findOne({ propertyId });

    if (!existingDoc) {
      // If no documents exist and trying to add non-deed document
      if (documentType !== 'deedDocument') {
        throw new BadRequest(
          'Property documents not found. Create documents with deed document first.'
        );
      }

      // Create new document record with deed
      const propertyDocument = await PropertyDocumentModel.create({
        propertyId,
        deedDocument: {
          url: documentData.url,
          mediaId: documentData.mediaId,
          isVerified: false,
        },
      });

      return propertyDocument as IPropertyDocument;
    }

    // Get old mediaId for cleanup (if replacing)
    const oldMediaId = existingDoc[documentType]?.mediaId;

    // Update existing document
    const updatedDocument = await PropertyDocumentModel.findOneAndUpdate(
      { propertyId },
      {
        $set: {
          [documentType]: {
            url: documentData.url,
            mediaId: documentData.mediaId,
            isVerified: false, // Reset verification on update
          },
        },
      },
      { new: true }
    );

    // Delete old media from media service (if exists and different)
    if (oldMediaId && oldMediaId !== documentData.mediaId) {
      try {
        await mediaClient.deleteMedia(oldMediaId);
      } catch (error) {
        console.error('Failed to delete old media:', error);
        // Don't throw - document update succeeded
      }
    }

    return updatedDocument as IPropertyDocument;
  }

  /**
   * Get property documents
   */
  static async getPropertyDocuments(
    propertyId: string
  ): Promise<IPropertyDocument | null> {
    const propertyDocument = await PropertyDocumentModel.findOne({
      propertyId,
    });
    return propertyDocument as IPropertyDocument | null;
  }

  /**
   * Get property with documents
   */
  static async getPropertyWithDocuments(propertyId: string): Promise<{
    property: IProperty;
    documents: IPropertyDocument | null;
  }> {
    const property = await this.getPropertyById(propertyId);
    const documents = await this.getPropertyDocuments(propertyId);
    return { property, documents };
  }

  /**
   * Verify a property document (admin action)
   */
  static async verifyPropertyDocument(
    propertyId: string,
    documentType: 'deedDocument' | 'inspectionReport' | 'appraisalReport',
    isVerified: boolean
  ): Promise<IPropertyDocument> {
    const propertyDocument = await PropertyDocumentModel.findOne({
      propertyId,
    });

    if (!propertyDocument) {
      throw new ResourceNotFound('Property documents not found');
    }

    if (!propertyDocument[documentType]) {
      throw new ResourceNotFound(`${documentType} not found for this property`);
    }

    const updatedDocument = await PropertyDocumentModel.findOneAndUpdate(
      { propertyId },
      { $set: { [`${documentType}.isVerified`]: isVerified } },
      { new: true }
    );

    return updatedDocument as IPropertyDocument;
  }

  /**
   * Delete a property document
   */
  static async deletePropertyDocument(
    propertyId: string,
    userId: string,
    documentType: 'deedDocument' | 'inspectionReport' | 'appraisalReport'
  ): Promise<{ success: boolean; message: string }> {
    // Verify user exists
    await this.verifyUserExists(userId);

    // Verify ownership
    await this.verifyPropertyOwnership(propertyId, userId);

    const propertyDocument = await PropertyDocumentModel.findOne({
      propertyId,
    });

    if (!propertyDocument) {
      throw new ResourceNotFound('Property documents not found');
    }

    if (!propertyDocument[documentType]) {
      throw new ResourceNotFound(`${documentType} not found for this property`);
    }

    // Cannot delete deed document if it's the only document
    if (documentType === 'deedDocument') {
      throw new BadRequest(
        'Cannot delete deed document. Delete the entire property document record instead.'
      );
    }

    // Delete from media service
    const mediaId = propertyDocument[documentType]?.mediaId;
    if (mediaId) {
      await mediaClient.deleteMedia(mediaId);
    }

    // Remove document from record
    await PropertyDocumentModel.findOneAndUpdate(
      { propertyId },
      { $unset: { [documentType]: 1 } }
    );

    return {
      success: true,
      message: `${documentType} deleted successfully`,
    };
  }

  /**
   * Delete all property documents
   */
  static async deleteAllPropertyDocuments(
    propertyId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    // Verify user exists
    await this.verifyUserExists(userId);

    // Verify ownership
    await this.verifyPropertyOwnership(propertyId, userId);

    const propertyDocument = await PropertyDocumentModel.findOne({
      propertyId,
    });

    if (!propertyDocument) {
      throw new ResourceNotFound('Property documents not found');
    }

    // Collect all media IDs to delete
    const mediaIds: string[] = [];
    if (propertyDocument.deedDocument?.mediaId) {
      mediaIds.push(propertyDocument.deedDocument.mediaId);
    }
    if (propertyDocument.inspectionReport?.mediaId) {
      mediaIds.push(propertyDocument.inspectionReport.mediaId);
    }
    if (propertyDocument.appraisalReport?.mediaId) {
      mediaIds.push(propertyDocument.appraisalReport.mediaId);
    }

    // Bulk delete from media service
    if (mediaIds.length > 0) {
      await mediaClient.bulkDeleteMedia(mediaIds, true);
    }

    // Delete document record
    await PropertyDocumentModel.findOneAndDelete({ propertyId });

    return {
      success: true,
      message: 'All property documents deleted successfully',
    };
  }

  /**
   * Get document verification status for a property
   */
  static async getDocumentVerificationStatus(propertyId: string): Promise<{
    hasDocuments: boolean;
    deedDocument: { exists: boolean; isVerified: boolean };
    inspectionReport: { exists: boolean; isVerified: boolean };
    appraisalReport: { exists: boolean; isVerified: boolean };
    allVerified: boolean;
  }> {
    const propertyDocument = await PropertyDocumentModel.findOne({
      propertyId,
    });

    if (!propertyDocument) {
      return {
        hasDocuments: false,
        deedDocument: { exists: false, isVerified: false },
        inspectionReport: { exists: false, isVerified: false },
        appraisalReport: { exists: false, isVerified: false },
        allVerified: false,
      };
    }

    const deedExists = !!propertyDocument.deedDocument;
    const deedVerified = propertyDocument.deedDocument?.isVerified || false;

    const inspectionExists = !!propertyDocument.inspectionReport;
    const inspectionVerified =
      propertyDocument.inspectionReport?.isVerified || false;

    const appraisalExists = !!propertyDocument.appraisalReport;
    const appraisalVerified =
      propertyDocument.appraisalReport?.isVerified || false;

    // All verified if deed is verified and any existing optional docs are verified
    const allVerified =
      deedVerified &&
      (!inspectionExists || inspectionVerified) &&
      (!appraisalExists || appraisalVerified);

    return {
      hasDocuments: true,
      deedDocument: { exists: deedExists, isVerified: deedVerified },
      inspectionReport: {
        exists: inspectionExists,
        isVerified: inspectionVerified,
      },
      appraisalReport: {
        exists: appraisalExists,
        isVerified: appraisalVerified,
      },
      allVerified,
    };
  }
}
