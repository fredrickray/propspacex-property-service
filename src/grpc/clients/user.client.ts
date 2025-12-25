import { Protos, createClient } from '../index';

const userClient = createClient(Protos.media.MediaService, 'localhost:50052');

export default userClient;
