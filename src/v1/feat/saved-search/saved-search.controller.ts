import { Request, Response, NextFunction } from 'express';
import { Unauthorized } from '@middlewares/error.middleware';
import SavedSearchService from './saved-search.service';
import { PaginationOptions } from '@property/property.type';

function requireBuyerMatch(req: Request, buyerId: string): void {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId || userId !== buyerId) {
    throw new Unauthorized('You must be authenticated as this buyer');
  }
}

export default class SavedSearchController {
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const buyerId = req.params.buyerId as string;
      requireBuyerMatch(req, buyerId);
      const saved = await SavedSearchService.create(buyerId, req.body);
      res.status(201).json({
        success: true,
        message: 'Saved search created successfully',
        data: saved,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const buyerId = req.params.buyerId as string;
      requireBuyerMatch(req, buyerId);
      const { page, limit, sort } = req.query;
      const pagination: PaginationOptions = {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        sort: sort as string,
      };
      const result = await SavedSearchService.listByBuyer(buyerId, pagination);
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

  static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const buyerId = req.params.buyerId as string;
      const savedSearchId = req.params.savedSearchId as string;
      requireBuyerMatch(req, buyerId);
      const saved = await SavedSearchService.getById(buyerId, savedSearchId);
      res.status(200).json({ success: true, data: saved });
    } catch (error) {
      next(error);
    }
  }

  static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const buyerId = req.params.buyerId as string;
      const savedSearchId = req.params.savedSearchId as string;
      requireBuyerMatch(req, buyerId);
      const saved = await SavedSearchService.update(
        buyerId,
        savedSearchId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Saved search updated successfully',
        data: saved,
      });
    } catch (error) {
      next(error);
    }
  }

  static async remove(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const buyerId = req.params.buyerId as string;
      const savedSearchId = req.params.savedSearchId as string;
      requireBuyerMatch(req, buyerId);
      const result = await SavedSearchService.delete(buyerId, savedSearchId);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async run(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const buyerId = req.params.buyerId as string;
      const savedSearchId = req.params.savedSearchId as string;
      requireBuyerMatch(req, buyerId);
      const { page, limit, sort } = req.query;
      const pagination: PaginationOptions = {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sort: sort as string,
      };
      const result = await SavedSearchService.run(
        buyerId,
        savedSearchId,
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
}
