import { Protos, createClient } from '../index';

const mediaClient = createClient(Protos.media.MediaService, 'localhost:50051');

export default mediaClient;
