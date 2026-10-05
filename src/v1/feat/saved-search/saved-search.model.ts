import paginate from 'mongoose-paginate-v2';
import { PaginateModel, Schema, model } from 'mongoose';
import { ISavedSearch } from './saved-search.type';

const savedSearchSchema = new Schema<ISavedSearch>(
  {
    buyerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    filters: { type: Schema.Types.Mixed, required: true },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true }
);

savedSearchSchema.index({ buyerId: 1, createdAt: -1 });

savedSearchSchema.plugin(paginate);

const SavedSearchModel = model<ISavedSearch, PaginateModel<ISavedSearch>>(
  'SavedSearch',
  savedSearchSchema
);

export default SavedSearchModel;
