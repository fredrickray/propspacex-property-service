import * as grpc from '@grpc/grpc-js';
import { Protos } from '../index';

const server = new grpc.Server();

server.addService(Protos.property.PropertyService.service, {
  CreateProperty: (call: any, callback: any) => {
    const data = call.request;
    // TODO: your business logic
    callback(null, { success: true, id: '12345' });
  },
});

server.bindAsync(
  '0.0.0.0:50052',
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('Property gRPC server running on 50052');
    server.start();
  }
);
