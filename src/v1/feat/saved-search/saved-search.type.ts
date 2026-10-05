/**
 * Persisted filter payload (MongoDB document field, analogous to JSONB).
 * Intentionally open-ended so new criteria can ship without schema migrations.
 */
export type SavedSearchFilters = Record<string, unknown>;

export interface CreateSavedSearchInput {
  name: string;
  filters: SavedSearchFilters;
}

export interface UpdateSavedSearchInput {
  name?: string;
  filters?: SavedSearchFilters;
}

export interface ISavedSearch {
  buyerId: string;
  name: string;
  filters: SavedSearchFilters;
  lastRunAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
