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

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

export interface CreateUserResponse {
  success: boolean;
  userId: string;
}

export interface GetUserRequest {
  userId: string;
}

export interface GetUserEmailRequest {
  email: string;
}

export interface GetUserResponse {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isVerified: boolean;
  isAccountActive: boolean;
  lastLoginDate: { seconds: string; nanos: number } | null;
  loginAttempts: number;
  allowedLoginAttempts: number;
  loginCooldown: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersRequest {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListUsersResponse {
  users: GetUserResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateUserRequest {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface UpdateUserResponse {
  success: boolean;
}

export interface DeleteUserRequest {
  userId: string;
}

export interface DeleteUserResponse {
  success: boolean;
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  success: boolean;
  user: GetUserResponse | null;
  error: string;
  accessToken: string;
  refreshToken: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  appRole: string;
}

export interface SignupResponse {
  success: boolean;
  userId: string;
  message: string;
  error: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  error: string;
}

export interface ResendOTPRequest {
  email: string;
}

export interface ResendOTPResponse {
  success: boolean;
  message: string;
  error: string;
}

// ==================== User Service Client ====================

export class UserServiceClient {
  private client: any;
  private connected: boolean = false;

  /**
   * Create a new User Service client
   * @param address - gRPC server address (e.g., 'localhost:50052' or 'user-service:50052')
   * @param protoPath - Optional custom path to user.proto file
   */
  constructor(
    private address: string,
    protoPath?: string
  ) {
    const PROTO_PATH = protoPath || path.join(__dirname, '../proto/user.proto');
    const packageDefinition = protoLoader.loadSync(
      PROTO_PATH,
      protoLoaderOptions
    );
    const userProto = grpc.loadPackageDefinition(packageDefinition) as any;

    this.client = new userProto.user.UserService(
      address,
      grpc.credentials.createInsecure()
    );
  }

  /**
   * Promisify gRPC call
   */
  private promisify<T>(
    method: string,
    params: Record<string, any>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.client[method](params, (error: any, response: T) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Create a new user
   */
  async createUser(params: CreateUserRequest): Promise<CreateUserResponse> {
    return this.promisify<CreateUserResponse>('CreateUser', params);
  }

  /**
   * Get user by ID
   */
  async getUser(params: GetUserRequest): Promise<GetUserResponse> {
    return this.promisify<GetUserResponse>('GetUser', params);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(params: GetUserEmailRequest): Promise<GetUserResponse> {
    return this.promisify<GetUserResponse>('GetUserEmail', params);
  }

  /**
   * List users with pagination
   */
  async listUsers(params: ListUsersRequest = {}): Promise<ListUsersResponse> {
    return this.promisify<ListUsersResponse>('ListUsers', {
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search || '',
    });
  }

  /**
   * Update user
   */
  async updateUser(params: UpdateUserRequest): Promise<UpdateUserResponse> {
    return this.promisify<UpdateUserResponse>('UpdateUser', params);
  }

  /**
   * Delete user
   */
  async deleteUser(params: DeleteUserRequest): Promise<DeleteUserResponse> {
    return this.promisify<DeleteUserResponse>('DeleteUser', params);
  }

  /**
   * Sign in user
   */
  async signin(params: SigninRequest): Promise<SignInResponse> {
    return this.promisify<SignInResponse>('Signin', params);
  }

  /**
   * Sign up new user
   */
  async signup(params: SignupRequest): Promise<SignupResponse> {
    return this.promisify<SignupResponse>('Signup', params);
  }

  /**
   * Verify OTP
   */
  async verifyOTP(params: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    return this.promisify<VerifyOTPResponse>('VerifyOTP', params);
  }

  /**
   * Resend OTP
   */
  async resendOTP(params: ResendOTPRequest): Promise<ResendOTPResponse> {
    return this.promisify<ResendOTPResponse>('ResendOTP', params);
  }

  /**
   * Close the client connection
   */
  close(): void {
    if (this.client) {
      grpc.closeClient(this.client);
    }
  }

  /**
   * Wait for the client to be ready
   */
  async waitForReady(timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      this.client.waitForReady(deadline, (error: any) => {
        if (error) {
          reject(
            new Error(
              `Failed to connect to user service at ${this.address}: ${error.message}`
            )
          );
        } else {
          this.connected = true;
          resolve();
        }
      });
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// ==================== Singleton Factory ====================

let defaultClient: UserServiceClient | null = null;

/**
 * Get or create a singleton User Service client
 * @param address - gRPC server address (only used on first call)
 */
export const getUserClient = (address?: string): UserServiceClient => {
  if (!defaultClient) {
    const serverAddress =
      address || process.env.USER_SERVICE_GRPC_URL || 'localhost:50051';
    defaultClient = new UserServiceClient(serverAddress);
  }
  return defaultClient;
};

/**
 * Close the singleton client
 */
export const closeUserClient = (): void => {
  if (defaultClient) {
    defaultClient.close();
    defaultClient = null;
  }
};

export default UserServiceClient;
