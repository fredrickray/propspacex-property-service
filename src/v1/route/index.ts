import { Router } from 'express';
import propertyRouter from '@property/property.route';
import savedSearchRouter from '@saved-search/saved-search.route';

const indexRouter = Router();

// Property routes
indexRouter.use('/properties', propertyRouter);

// Buyer saved searches (filters stored as flexible document / JSON-like object)
indexRouter.use('/buyers/:buyerId/saved-searches', savedSearchRouter);

export default indexRouter;
