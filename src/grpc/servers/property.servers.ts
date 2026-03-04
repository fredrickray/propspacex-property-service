import * as grpc from '@grpc/grpc-js';
import { ReflectionService } from '@grpc/reflection';
import { Protos, grpcPackageDefinition } from '../index';
import PropertyService from '@property/property.service';
import { IProperty, PropertyStatus } from '@property/property.type';

// Helper to convert MongoDB document to gRPC Property message
const toGrpcProperty = (property: any) => {
  return {
    id: property._id?.toString() || property.id,
    title: property.title,
    description: property.description,
    type: property.type,
    status: property.status,
    price: property.price,
    currency: property.currency,
    location: property.location
      ? {
          address: property.location.address,
          suite: property.location.suite || '',
          city: property.location.city,
          state: property.location.state,
          country: property.location.country,
          coordinates: property.location.coordinates
            ? {
                type: property.location.coordinates.type,
                coordinates: property.location.coordinates.coordinates,
              }
            : null,
          neighborhoodHighlights:
            property.location.neighborhoodHighlights || null,
        }
      : null,
    features: property.features || [],
    size: property.size
      ? {
          bedrooms: property.size.bedrooms || 0,
          bathrooms: property.size.bathrooms || 0,
          parkingSpaces: property.size.parkingSpaces || 0,
          dimensionDetails: property.size.dimensionDetails || null,
        }
      : null,
    amenities: property.amenities || [],
    media: property.media || { images: [], videos: [] },
    ownerId: property.ownerId,
    blockchain: property.blockchain || null,
    isActive: property.isActive,
    createdAt: property.createdAt?.toISOString() || '',
    updatedAt: property.updatedAt?.toISOString() || '',
  };
};

// Helper to convert MongoDB PropertyDocument to gRPC PropertyDocument message
const toGrpcPropertyDocument = (doc: any) => {
  const toDocumentInfo = (info: any) => {
    if (!info) return null;
    return {
      url: info.url || '',
      mediaId: info.mediaId || '',
      isVerified: info.isVerified || false,
    };
  };

  return {
    id: doc._id?.toString() || doc.id,
    propertyId: doc.propertyId?.toString() || doc.propertyId,
    deedDocument: toDocumentInfo(doc.deedDocument),
    inspectionReport: toDocumentInfo(doc.inspectionReport),
    appraisalReport: toDocumentInfo(doc.appraisalReport),
    createdAt: doc.createdAt?.toISOString() || '',
    updatedAt: doc.updatedAt?.toISOString() || '',
  };
};

// Helper to convert gRPC request to IProperty
const toPropertyPayload = (request: any): Partial<IProperty> => {
  const payload: any = {};

  if (request.title) payload.title = request.title;
  if (request.description) payload.description = request.description;
  if (request.type) payload.type = request.type;
  if (request.status) payload.status = request.status;
  if (request.price) payload.price = request.price;
  if (request.currency) payload.currency = request.currency;
  if (request.ownerId) payload.ownerId = request.ownerId;
  if (request.features) payload.features = request.features;
  if (request.amenities) payload.amenities = request.amenities;

  if (request.location) {
    payload.location = {
      address: request.location.address,
      suite: request.location.suite,
      city: request.location.city,
      state: request.location.state,
      country: request.location.country,
      coordinates: request.location.coordinates
        ? {
            type: request.location.coordinates.type || 'Point',
            coordinates: request.location.coordinates.coordinates,
          }
        : undefined,
      neighborhoodHighlights: request.location.neighborhoodHighlights,
    };
  }

  if (request.size) {
    payload.size = {
      bedrooms: request.size.bedrooms,
      bathrooms: request.size.bathrooms,
      parkingSpaces: request.size.parkingSpaces,
      dimensionDetails: request.size.dimensionDetails,
    };
  }

  if (request.media) {
    payload.media = {
      images: request.media.images || [],
      videos: request.media.videos || [],
    };
  }

  return payload;
};

// gRPC Service Implementation
const propertyServiceImpl = {
  // Create Property
  CreateProperty: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const payload = toPropertyPayload(call.request) as IProperty;
      const property = await PropertyService.createProperty(payload);
      callback(null, {
        success: true,
        message: 'Property created successfully',
        property: toGrpcProperty(property),
      });
    } catch (error: any) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message || 'Failed to create property',
      });
    }
  },

  // Get Property
  GetProperty: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId } = call.request;
      const property = await PropertyService.getPropertyById(propertyId);
      callback(null, {
        success: true,
        message: 'Property retrieved successfully',
        property: toGrpcProperty(property),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
        message: error.message || 'Failed to get property',
      });
    }
  },

  // Get Property With Owner
  GetPropertyWithOwner: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId } = call.request;
      const result = await PropertyService.getPropertyWithOwner(propertyId);
      callback(null, {
        success: true,
        message: 'Property with owner retrieved successfully',
        property: toGrpcProperty(result.property),
        owner: {
          userId: result.owner.userId,
          firstName: result.owner.firstName,
          lastName: result.owner.lastName,
          email: result.owner.email,
          phone: result.owner.phone,
          isVerified: result.owner.isVerified,
        },
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
        message: error.message || 'Failed to get property with owner',
      });
    }
  },

  // Update Property
  UpdateProperty: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, userId, ...updates } = call.request;
      const payload = toPropertyPayload(updates);
      const property = await PropertyService.updateProperty(
        propertyId,
        userId,
        payload
      );
      callback(null, {
        success: true,
        message: 'Property updated successfully',
        property: toGrpcProperty(property),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to update property',
      });
    }
  },

  // Delete Property (Soft Delete)
  DeleteProperty: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, userId } = call.request;
      const result = await PropertyService.deleteProperty(propertyId, userId);
      callback(null, result);
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to delete property',
      });
    }
  },

  // Hard Delete Property
  HardDeleteProperty: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, userId } = call.request;
      const result = await PropertyService.hardDeleteProperty(
        propertyId,
        userId
      );
      callback(null, result);
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to hard delete property',
      });
    }
  },

  // List Properties
  ListProperties: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const {
        page,
        limit,
        sort,
        type,
        status,
        minPrice,
        maxPrice,
        city,
        country,
        bedrooms,
        bathrooms,
        ownerId,
        isActive,
        filterByActive, // Use a separate boolean to indicate if isActive filter should be applied
        search,
      } = call.request;

      const filters: any = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (minPrice) filters.minPrice = minPrice;
      if (maxPrice) filters.maxPrice = maxPrice;
      if (city) filters.city = city;
      if (country) filters.country = country;
      if (bedrooms) filters.bedrooms = bedrooms;
      if (bathrooms) filters.bathrooms = bathrooms;
      if (ownerId) filters.ownerId = ownerId;
      // Only apply isActive filter if filterByActive is explicitly true
      // This avoids the protobuf default false issue
      if (filterByActive === true) {
        filters.isActive = isActive;
      }
      if (search) filters.search = search;

      const pagination = { page: page || 1, limit: limit || 10, sort };

      console.log('ListProperties filters:', filters);
      console.log('ListProperties pagination:', pagination);

      const result = await PropertyService.listProperties(filters, pagination);

      callback(null, {
        success: true,
        message: 'Properties retrieved successfully',
        properties: result.docs.map(toGrpcProperty),
        pagination: {
          total: result.totalDocs,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });

      console.log('Listed properties:', result);
    } catch (error: any) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message || 'Failed to list properties',
      });
    }
  },

  // Get Properties By Owner
  GetPropertiesByOwner: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { ownerId, page, limit, sort } = call.request;
      const pagination = { page: page || 1, limit: limit || 10, sort };

      const result = await PropertyService.getPropertiesByOwner(
        ownerId,
        pagination
      );

      callback(null, {
        success: true,
        message: 'Owner properties retrieved successfully',
        properties: result.docs.map(toGrpcProperty),
        pagination: {
          total: result.totalDocs,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
        message: error.message || 'Failed to get owner properties',
      });
    }
  },

  // Search By Location
  SearchByLocation: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { longitude, latitude, maxDistanceKm, page, limit } = call.request;
      const pagination = { page: page || 1, limit: limit || 10 };

      const properties = await PropertyService.searchByLocation(
        longitude,
        latitude,
        maxDistanceKm || 10,
        pagination
      );

      callback(null, {
        success: true,
        message: 'Location search completed successfully',
        properties: properties.map(toGrpcProperty),
        pagination: {
          total: properties.length,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    } catch (error: any) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message || 'Failed to search by location',
      });
    }
  },

  // Update Property Status
  UpdatePropertyStatus: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, userId, status } = call.request;
      const property = await PropertyService.updatePropertyStatus(
        propertyId,
        userId,
        status as PropertyStatus
      );
      callback(null, {
        success: true,
        message: 'Property status updated successfully',
        property: toGrpcProperty(property),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to update property status',
      });
    }
  },

  // Update Property Media
  UpdatePropertyMedia: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, userId, images, videos } = call.request;
      const property = await PropertyService.updatePropertyMedia(
        propertyId,
        userId,
        {
          images,
          videos,
        }
      );
      callback(null, {
        success: true,
        message: 'Property media updated successfully',
        property: toGrpcProperty(property),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to update property media',
      });
    }
  },

  // Add Property Media
  AddPropertyMedia: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, userId, images, videos } = call.request;
      const property = await PropertyService.addPropertyMedia(
        propertyId,
        userId,
        {
          images,
          videos,
        }
      );
      callback(null, {
        success: true,
        message: 'Media added to property successfully',
        property: toGrpcProperty(property),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to add property media',
      });
    }
  },

  // Update Blockchain Info
  UpdateBlockchainInfo: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, userId, nftId, contractAddress, transactionHash } =
        call.request;
      const property = await PropertyService.updateBlockchainInfo(
        propertyId,
        userId,
        {
          nftId,
          contractAddress,
          transactionHash,
        }
      );
      callback(null, {
        success: true,
        message: 'Blockchain info updated successfully',
        property: toGrpcProperty(property),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to update blockchain info',
      });
    }
  },

  // Get Owner Property Stats
  GetOwnerPropertyStats: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { ownerId } = call.request;
      const stats = await PropertyService.getOwnerPropertyStats(ownerId);
      callback(null, {
        success: true,
        ...stats,
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
        message: error.message || 'Failed to get owner property stats',
      });
    }
  },

  // ==================== Document Operations ====================

  // Create Property Documents
  CreatePropertyDocuments: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, deedDocument, inspectionReport, appraisalReport } =
        call.request;

      if (!deedDocument || !deedDocument.url || !deedDocument.mediaId) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Deed document with url and mediaId is required',
        });
        return;
      }

      const document = await PropertyService.createPropertyDocuments(
        propertyId,
        {
          deedDocument: {
            url: deedDocument.url,
            mediaId: deedDocument.mediaId,
          },
          inspectionReport:
            inspectionReport?.url && inspectionReport?.mediaId
              ? {
                  url: inspectionReport.url,
                  mediaId: inspectionReport.mediaId,
                }
              : null,
          appraisalReport:
            appraisalReport?.url && appraisalReport?.mediaId
              ? {
                  url: appraisalReport.url,
                  mediaId: appraisalReport.mediaId,
                }
              : null,
        }
      );
      callback(null, {
        success: true,
        message: 'Property documents created successfully',
        document: toGrpcPropertyDocument(document),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : error.status === 400
                ? grpc.status.INVALID_ARGUMENT
                : grpc.status.INTERNAL,
        message: error.message || 'Failed to create property documents',
      });
    }
  },

  // Get Property Documents
  GetPropertyDocuments: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId } = call.request;
      const document = await PropertyService.getPropertyDocuments(propertyId);
      callback(null, {
        success: true,
        message: 'Property documents retrieved successfully',
        document: document ? toGrpcPropertyDocument(document) : null,
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
        message: error.message || 'Failed to get property documents',
      });
    }
  },

  // Update Property Document
  UpdatePropertyDocument: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const {
        propertyId,
        userId,
        documentType,
        document: docInfo,
      } = call.request;
      const updatedDocument = await PropertyService.updatePropertyDocument(
        propertyId,
        userId,
        documentType,
        {
          url: docInfo.url,
          mediaId: docInfo.mediaId,
        }
      );
      callback(null, {
        success: true,
        message: 'Property document updated successfully',
        document: toGrpcPropertyDocument(updatedDocument),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : error.status === 400
                ? grpc.status.INVALID_ARGUMENT
                : grpc.status.INTERNAL,
        message: error.message || 'Failed to update property document',
      });
    }
  },

  // Delete Property Document
  DeletePropertyDocument: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, userId, documentType } = call.request;
      const result = await PropertyService.deletePropertyDocument(
        propertyId,
        userId,
        documentType || 'deedDocument'
      );
      callback(null, result);
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 403
              ? grpc.status.PERMISSION_DENIED
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to delete property document',
      });
    }
  },

  // Verify Property Document
  VerifyPropertyDocument: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId, documentType, isVerified } = call.request;
      const document = await PropertyService.verifyPropertyDocument(
        propertyId,
        documentType,
        isVerified
      );
      callback(null, {
        success: true,
        message: 'Property document verification status updated',
        document: toGrpcPropertyDocument(document),
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404
            ? grpc.status.NOT_FOUND
            : error.status === 400
              ? grpc.status.INVALID_ARGUMENT
              : grpc.status.INTERNAL,
        message: error.message || 'Failed to verify property document',
      });
    }
  },

  // Get Document Verification Status
  GetDocumentVerificationStatus: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { propertyId } = call.request;
      const status =
        await PropertyService.getDocumentVerificationStatus(propertyId);
      callback(null, {
        success: true,
        message: 'Document verification status retrieved',
        status: {
          deedDocumentVerified: status.deedDocument.isVerified,
          inspectionReportVerified: status.inspectionReport.isVerified,
          appraisalReportVerified: status.appraisalReport.isVerified,
          allVerified: status.allVerified,
        },
      });
    } catch (error: any) {
      callback({
        code:
          error.status === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
        message: error.message || 'Failed to get document verification status',
      });
    }
  },
};

// Create and start the gRPC server
export const startPropertyGrpcServer = (
  port: number = 50053
): Promise<grpc.Server> => {
  return new Promise((resolve, reject) => {
    const server = new grpc.Server();

    server.addService(
      Protos.property.PropertyService.service,
      propertyServiceImpl
    );
    new ReflectionService(grpcPackageDefinition).addToServer(server);

    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          console.error('Failed to start Property gRPC server:', error);
          reject(error);
          return;
        }
        console.log(`Property gRPC server running on port ${boundPort}`);
        resolve(server);
      }
    );
  });
};

// Export for use in main server file
export default startPropertyGrpcServer;
