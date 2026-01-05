import { Router } from 'express';
import propertyRouter from '@property/property.route';

const indexRouter = Router();

// Property routes
indexRouter.use('/properties', propertyRouter);

export default indexRouter;
