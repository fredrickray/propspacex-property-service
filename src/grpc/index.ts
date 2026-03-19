import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Proto loader options
const protoLoaderOptions: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// Load proto files from the submodule at the project root
const PROTO_DIR = path.resolve(__dirname, '..', '..', 'proto');
const USER_PROTO_DIR = path.join(PROTO_DIR, 'user', 'v1');
const PROPERTY_PROTO_DIR = path.join(PROTO_DIR, 'property', 'v1');
const MEDIA_PROTO_DIR = path.join(PROTO_DIR, 'media', 'v1');

const propertyPackageDefinition = protoLoader.loadSync(
  path.join(PROPERTY_PROTO_DIR, 'property.proto'),
  protoLoaderOptions
);

const mediaPackageDefinition = protoLoader.loadSync(
  path.join(MEDIA_PROTO_DIR, 'media.proto'),
  protoLoaderOptions
);

const userPackageDefinition = protoLoader.loadSync(
  path.join(USER_PROTO_DIR, 'user.proto'),
  protoLoaderOptions
);

export const grpcPackageDefinition: protoLoader.PackageDefinition =
  propertyPackageDefinition;

// Load gRPC definitions
const propertyProto = grpc.loadPackageDefinition(
  propertyPackageDefinition
) as any;
const mediaProto = grpc.loadPackageDefinition(mediaPackageDefinition) as any;
const userProto = grpc.loadPackageDefinition(userPackageDefinition) as any;

// Export proto definitions
export const Protos = {
  property: propertyProto.property,
  media: mediaProto.media,
  user: userProto.user,
};

/**
 * Create a gRPC client for a specific service
 */
export function createClient<T>(
  ServiceDefinition: grpc.ServiceClientConstructor,
  address: string
): T {
  return new ServiceDefinition(
    address,
    grpc.credentials.createInsecure()
  ) as unknown as T;
}

/**
 * Create a gRPC server
 */
export function createServer(): grpc.Server {
  return new grpc.Server();
}

export { grpc, protoLoader };
