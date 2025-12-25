import { ResourceNotFound, Unauthorized } from '@middlewares/error.middleware';
import PropertyModel from './property.model';
import { IProperty } from './property.type';
import userClient from '@grpc/clients/user.client';
import mediaClient from '@grpc/clients/media.client';

export default class PropertyService {
  static async createProperty(payload: IProperty): Promise<IProperty> {
    const owner = await new Promise((resolve, reject) => {
      userClient.GetUser(
        { id: payload.ownerId },
        (error: any, response: any) => {
          if (error)
            return reject(new Unauthorized('Invalid ownerId provided.'));
          if (!response || !response.user)
            return reject(new ResourceNotFound('Owner not found'));
          resolve(response.user);
        }
      );
    });

    if (payload.media) {
      const isValidMedia = await new Promise((resolve, reject) => {
        mediaClient.VerifyMedia(
          { ids: payload.media },
          (error: any, response: any) => {
            if (error)
              return reject(new Unauthorized('Error validating media files'));
            resolve(response.valid);
          }
        );
      });

      if (!isValidMedia)
        throw new ResourceNotFound('One or more media files are invalid');
    }

    const property = await new PropertyModel(payload).save();
    return property;
  }
}
