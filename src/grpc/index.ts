import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

function loadProto(protoFile: string) {
  const PROTO_PATH = path.resolve(__dirname, 'proto', protoFile);
  const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(packageDef) as any;
}

export const Protos = {
  user: loadProto('user.proto'),
  media: loadProto('media.proto'),
  property: loadProto('property.proto'),
};

export const createClient = (service: any, address: string) => {
  return new service(address, grpc.credentials.createInsecure());
};
