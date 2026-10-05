import { ResourceNotFound, BadRequest } from '@middlewares/error.middleware';
import { getUserClient } from '@grpc/clients/user.client';
import PropertyService from '@property/property.service';
import { IProperty, PaginationOptions } from '@property/property.type';
import SavedSearchModel from './saved-search.model';
import { mapSavedFiltersToPropertyFilters } from './saved-search.filters';
import {
  CreateSavedSearchInput,
  ISavedSearch,
  SavedSearchFilters,
  UpdateSavedSearchInput,
} from './saved-search.type';
import { PaginateResult } from 'mongoose';

const userClient = getUserClient();

export default class SavedSearchService {
  private static async verifyBuyerExists(buyerId: string): Promise<void> {
    try {
      await userClient.getUser({ userId: buyerId });
    } catch {
      throw new ResourceNotFound('Buyer not found');
    }
  }

  private static assertFiltersObject(filters: unknown): SavedSearchFilters {
    if (
      filters === null ||
      typeof filters !== 'object' ||
      Array.isArray(filters)
    ) {
      throw new BadRequest('filters must be a non-null object');
    }
    return filters as SavedSearchFilters;
  }

  static async create(
    buyerId: string,
    input: CreateSavedSearchInput
  ): Promise<ISavedSearch> {
    await this.verifyBuyerExists(buyerId);
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequest('name is required');
    }
    const filters = this.assertFiltersObject(input.filters);
    const doc = await SavedSearchModel.create({
      buyerId,
      name,
      filters,
    });
    return doc.toObject() as ISavedSearch;
  }

  static async listByBuyer(
    buyerId: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginateResult<ISavedSearch>> {
    await this.verifyBuyerExists(buyerId);
    return SavedSearchModel.paginate(
      { buyerId },
      {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        sort: pagination.sort || '-createdAt',
        lean: true,
      }
    );
  }

  static async getById(
    buyerId: string,
    savedSearchId: string
  ): Promise<ISavedSearch> {
    await this.verifyBuyerExists(buyerId);
    const doc = await SavedSearchModel.findOne({
      _id: savedSearchId,
      buyerId,
    }).lean();
    if (!doc) {
      throw new ResourceNotFound('Saved search not found');
    }
    return doc as ISavedSearch;
  }

  static async update(
    buyerId: string,
    savedSearchId: string,
    input: UpdateSavedSearchInput
  ): Promise<ISavedSearch> {
    await this.verifyBuyerExists(buyerId);
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequest('name cannot be empty');
      }
      updates.name = name;
    }
    if (input.filters !== undefined) {
      updates.filters = this.assertFiltersObject(input.filters);
    }
    if (Object.keys(updates).length === 0) {
      throw new BadRequest('No valid fields to update');
    }
    const doc = await SavedSearchModel.findOneAndUpdate(
      { _id: savedSearchId, buyerId },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) {
      throw new ResourceNotFound('Saved search not found');
    }
    return doc as ISavedSearch;
  }

  static async delete(
    buyerId: string,
    savedSearchId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.verifyBuyerExists(buyerId);
    const res = await SavedSearchModel.deleteOne({
      _id: savedSearchId,
      buyerId,
    });
    if (res.deletedCount === 0) {
      throw new ResourceNotFound('Saved search not found');
    }
    return { success: true, message: 'Saved search deleted' };
  }

  static async run(
    buyerId: string,
    savedSearchId: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginateResult<IProperty>> {
    await this.verifyBuyerExists(buyerId);
    const saved = await SavedSearchModel.findOne({
      _id: savedSearchId,
      buyerId,
    }).lean();
    if (!saved) {
      throw new ResourceNotFound('Saved search not found');
    }
    const propertyFilters = mapSavedFiltersToPropertyFilters(
      saved.filters as Record<string, unknown>
    );
    const result = await PropertyService.listProperties(propertyFilters, {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      sort: pagination.sort,
    });
    await SavedSearchModel.updateOne(
      { _id: savedSearchId, buyerId },
      { $set: { lastRunAt: new Date() } }
    );
    return result;
  }
}
