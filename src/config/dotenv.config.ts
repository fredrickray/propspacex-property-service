import dotenv from 'dotenv';
dotenv.config();

const DotenvConfig = {
  serverPort: process.env.PORT as unknown as number,
  grpcPort: process.env.GRPC_PORT as unknown as number,
  Database: {
    url: process.env.MONGO_URL as string,
    testUrl: process.env.TEST_MONGO_URL as string,
  },
  Cors: {
    origin: process.env.CORS_ORIGIN as string,
    methods: process.env.CORS_METHODS as string,
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS as string,
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  serverBaseURL: process.env.SERVER_BASE_URL as string,
  frontendBaseURL: process.env.FRONTEND_BASE_URL as string,
  // gRPC service URLs for inter-service communication
  services: {
    userServiceGrpcUrl: process.env.USER_SERVICE_GRPC_URL as string,
    mediaServiceGrpcUrl: process.env.MEDIA_SERVICE_GRPC_URL as string,
  },
};

export default DotenvConfig;
