import { Router } from 'express';
import PropertyController from './property.controller';

const propertyRouter = Router();

// Search routes (must be before :id routes)
propertyRouter.get('/search/location', PropertyController.searchByLocation);

// Owner routes
propertyRouter.get('/owner/:ownerId', PropertyController.getPropertiesByOwner);
propertyRouter.get(
  '/owner/:ownerId/stats',
  PropertyController.getOwnerPropertyStats
);

// CRUD routes
propertyRouter.post('/', PropertyController.createProperty);
propertyRouter.get('/', PropertyController.listProperties);
propertyRouter.get('/:id', PropertyController.getProperty);
propertyRouter.get('/:id/with-owner', PropertyController.getPropertyWithOwner);
propertyRouter.put('/:id', PropertyController.updateProperty);
propertyRouter.delete('/:id', PropertyController.deleteProperty);
propertyRouter.delete('/:id/permanent', PropertyController.hardDeleteProperty);

// Status update
propertyRouter.patch('/:id/status', PropertyController.updatePropertyStatus);

// Media routes
propertyRouter.put('/:id/media', PropertyController.updatePropertyMedia);
propertyRouter.post('/:id/media', PropertyController.addPropertyMedia);

// Blockchain routes
propertyRouter.put('/:id/blockchain', PropertyController.updateBlockchainInfo);

export default propertyRouter;
