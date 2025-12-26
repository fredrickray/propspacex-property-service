import express, { Application } from 'express';
import bodyParser from 'body-parser';
import { createServer, Server as HTTPServer } from 'http';
import * as grpc from '@grpc/grpc-js';
import { connectDB } from '@config/db';
import indexRouter from './v1/route';
import DotenvConfig from '@config/dotenv.config';
import { routeNotFound, errorHandler } from '@middlewares/error.middleware';
import startPropertyGrpcServer from '@grpc/servers/property.servers';

export default class Server {
  public app: Application;
  private server: HTTPServer;
  private grpcServer: grpc.Server | null = null;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    console.log('Registering middlewares...');
    this.initializeMiddlewares();
    console.log('Registering routes...');
    this.routes();
    console.log('Registering error handlers...');
    this.handleErrors();
    console.log('Connecting to database...');
    this.connectDatabase();
    console.log('Setting up graceful shutdown...');
    this.setupGracefulShutdown();
  }

  initializeMiddlewares() {
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(express.json());
    // this.app.use(cors(corsOptions));
    // this.app.options(cors(corsOptions));
  }

  handleErrors() {
    this.app.use(errorHandler);
    this.app.use(routeNotFound);
  }

  routes() {
    this.app.get('/v1/api', (req, res) => {
      res.send({
        success: true,
        message: 'Server initialized and ready for action!',
      });
    });
    this.app.use('/v1/api', indexRouter);
  }

  async connectDatabase() {
    try {
      await connectDB();
    } catch (error) {
      console.error('Error connecting to the database:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal: string) => {
      console.log(`\nReceived ${signal}, cleaning up WebSocket connections...`);

      this.server.close(() => {
        console.log('Server closed gracefully');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error(
          'Could not close connections in time, forcefully shutting down'
        );
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }

  async start(port: number, grpcPort: number = DotenvConfig.grpcPort) {
    // Start HTTP server
    this.server.listen(port, () => {
      console.log(`Server initialized and ready for action! 🤖`);
      console.log('   ▀▄ ▄▀');
      console.log(' ▄█▀███▀█▄');
      console.log('█▀███████▀█');
      console.log('█ █▀▀▀▀▀█ █');
      console.log('   ▀▀ ▀▀');
      console.log(
        `Hello Adventurer, PropSpaceX HTTP API is live on port ${port}!`
      );
    });

    // Start gRPC server for inter-service communication
    try {
      this.grpcServer = await startPropertyGrpcServer(grpcPort);
      console.log(`PropSpaceX gRPC server is live on port ${grpcPort}!`);
    } catch (error) {
      console.error('Failed to start gRPC server:', error);
    }
  }

  // Method to get gRPC server instance (useful for testing)
  getGrpcServer(): grpc.Server | null {
    return this.grpcServer;
  }
}
