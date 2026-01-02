import { Request, Response, NextFunction } from 'express';
import PropertyService from './property.service';
import {
  PropertyStatus,
  PropertyFilters,
  PaginationOptions,
} from './property.type';

export default class PropertyController {
  static async createProperty(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const property = await PropertyService.createProperty(req.body);
      res.status(201).json({
        success: true,
        message: 'Property created successfully',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProperty(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const property = await PropertyService.getPropertyById(id);
      res.status(200).json({
        success: true,
        data: property,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPropertyWithOwner(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const result = await PropertyService.getPropertyWithOwner(id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listProperties(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
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
        search,
        page,
        limit,
        sort,
      } = req.query;

      const filters: PropertyFilters = {};
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (city) filters.city = city as string;
      if (country) filters.country = country as string;
      if (bedrooms) filters.bedrooms = Number(bedrooms);
      if (bathrooms) filters.bathrooms = Number(bathrooms);
      if (ownerId) filters.ownerId = ownerId as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search as string;

      const pagination: PaginationOptions = {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sort: sort as string,
      };

      const result = await PropertyService.listProperties(filters, pagination);
      console.log('Result:', result);
      res.status(200).json({
        success: true,
        data: result.docs,
        pagination: {
          total: result.totalDocs,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPropertiesByOwner(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ownerId } = req.params;
      const { page, limit, sort } = req.query;

      const pagination: PaginationOptions = {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sort: sort as string,
      };

      const result = await PropertyService.getPropertiesByOwner(
        ownerId,
        pagination
      );
      res.status(200).json({
        success: true,
        data: result.docs,
        pagination: {
          total: result.totalDocs,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProperty(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.body.userId || (req.headers['x-user-id'] as string);
      const updates = req.body;

      const property = await PropertyService.updateProperty(
        id,
        userId,
        updates
      );
      res.status(200).json({
        success: true,
        message: 'Property updated successfully',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePropertyStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.body.userId || (req.headers['x-user-id'] as string);
      const { status } = req.body;

      const property = await PropertyService.updatePropertyStatus(
        id,
        userId,
        status as PropertyStatus
      );
      res.status(200).json({
        success: true,
        message: 'Property status updated successfully',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProperty(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.body.userId || (req.headers['x-user-id'] as string);

      const result = await PropertyService.deleteProperty(id, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async hardDeleteProperty(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.body.userId || (req.headers['x-user-id'] as string);

      const result = await PropertyService.hardDeleteProperty(id, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async searchByLocation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { longitude, latitude, maxDistance, page, limit } = req.query;

      const properties = await PropertyService.searchByLocation(
        Number(longitude),
        Number(latitude),
        maxDistance ? Number(maxDistance) : 10,
        {
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 10,
        }
      );

      res.status(200).json({
        success: true,
        data: properties,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOwnerPropertyStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ownerId } = req.params;
      const stats = await PropertyService.getOwnerPropertyStats(ownerId);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePropertyMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.body.userId || (req.headers['x-user-id'] as string);
      const { images, videos } = req.body;

      const property = await PropertyService.updatePropertyMedia(id, userId, {
        images,
        videos,
      });
      res.status(200).json({
        success: true,
        message: 'Property media updated successfully',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addPropertyMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.body.userId || (req.headers['x-user-id'] as string);
      const { images, videos } = req.body;

      const property = await PropertyService.addPropertyMedia(id, userId, {
        images,
        videos,
      });
      res.status(200).json({
        success: true,
        message: 'Media added to property successfully',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBlockchainInfo(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.body.userId || (req.headers['x-user-id'] as string);
      const { nftId, contractAddress, transactionHash } = req.body;

      const property = await PropertyService.updateBlockchainInfo(id, userId, {
        nftId,
        contractAddress,
        transactionHash,
      });
      res.status(200).json({
        success: true,
        message: 'Blockchain info updated successfully',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  }
}
