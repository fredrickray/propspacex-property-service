import { Router } from 'express';
import SavedSearchController from './saved-search.controller';

const savedSearchRouter = Router({ mergeParams: true });

savedSearchRouter.post('/', SavedSearchController.create);
savedSearchRouter.get('/', SavedSearchController.list);
savedSearchRouter.get('/:savedSearchId', SavedSearchController.getById);
savedSearchRouter.patch('/:savedSearchId', SavedSearchController.update);
savedSearchRouter.delete('/:savedSearchId', SavedSearchController.remove);
savedSearchRouter.post('/:savedSearchId/run', SavedSearchController.run);

export default savedSearchRouter;
