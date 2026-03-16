import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import DotenvConfig from '@config/dotenv.config';

const MEDIA_SERVICE_HTTP_URL = DotenvConfig.services.mediaServiceUrl;
const MEDIA_SERVICE_GRPC_URL = DotenvConfig.services.mediaServiceGrpcUrl;

// Proto loader options
const protoLoaderOptions: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

export interface MediaItem {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  type: 'image' | 'video' | 'document';
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  entityType: string;
  entityId: string;
  fieldName: string;
  uploadedBy: string;
  storageProvider: string;
  storagePath: string;
  isProcessed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum entityType {
  USER = 'user',
  PROPERTY = 'property',
}

export interface UploadOptions {
  entityType: entityType;
  entityId: string;
  fieldName: string;
  uploadedBy: string;
}

export interface GrpcResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface BulkDeleteResponse {
  success: boolean;
  message: string;
  deleted: number;
  failed: string[];
}

export class MediaServiceClient {
  private grpcClient: any;
  private httpBaseUrl: string;
  private connected: boolean = false;

  constructor(
    httpUrl: string = MEDIA_SERVICE_HTTP_URL,
    grpcUrl: string = MEDIA_SERVICE_GRPC_URL
  ) {
    this.httpBaseUrl = httpUrl;

    const PROTO_PATH = path.resolve(__dirname, '..', '..', '..', 'proto', 'media', 'v1', 'media.proto');
    const packageDefinition = protoLoader.loadSync(
      PROTO_PATH,
      protoLoaderOptions
    );
    const mediaProto = grpc.loadPackageDefinition(packageDefinition) as any;

    this.grpcClient = new mediaProto.media.MediaService(
      grpcUrl,
      grpc.credentials.createInsecure()
    );
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<MediaItem> {
    // Dynamic import for form-data (CommonJS compatibility)
    const FormData = (await import('form-data')).default;

    const formData = new FormData();
    formData.append('file', file, {
      filename,
      contentType: mimeType,
    });
    formData.append('entityType', options.entityType);
    formData.append('entityId', options.entityId);
    formData.append('fieldName', options.fieldName);

    const response = await fetch(`${this.httpBaseUrl}/api/v1/media/upload`, {
      method: 'POST',
      headers: {
        'x-user-id': options.uploadedBy,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || 'Upload failed');
    }

    const result = (await response.json()) as { data: MediaItem };
    return result.data;
  }

  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string; mimeType: string }>,
    options: UploadOptions
  ): Promise<MediaItem[]> {
    const FormData = (await import('form-data')).default;

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file.buffer, {
        filename: file.filename,
        contentType: file.mimeType,
      });
    });

    formData.append('entityType', options.entityType);
    formData.append('entityId', options.entityId);
    formData.append('fieldName', options.fieldName);

    const response = await fetch(
      `${this.httpBaseUrl}/api/v1/media/upload/multiple`,
      {
        method: 'POST',
        headers: {
          'x-user-id': options.uploadedBy,
          ...formData.getHeaders(),
        },
        body: formData as any,
      }
    );

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || 'Upload failed');
    }

    const result = (await response.json()) as { data: MediaItem[] };
    return result.data;
  }

  // ==========================================================================
  // GRPC METHODS (for queries, updates, deletes)
  // ==========================================================================

  private promisify<T>(
    method: string,
    params: Record<string, any>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.grpcClient[method](params, (error: any, response: T) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get media by ID via gRPC
   */
  async getMedia(id: string): Promise<MediaItem | null> {
    const response = await this.promisify<GrpcResponse<MediaItem>>('GetMedia', {
      id,
    });
    if (!response.success) {
      return null;
    }
    return response.data || null;
  }

  /**
   * Get all media for an entity (e.g., all images for a property)
   */
  async getMediaByEntity(
    entityType: entityType,
    entityId: string,
    fieldName?: string
  ): Promise<MediaItem[]> {
    const response = await this.promisify<{
      success: boolean;
      data: MediaItem[];
    }>('GetMediaByEntity', { entityType, entityId, fieldName });
    return response.data || [];
  }

  /**
   * Update media (soft delete/restore, mark as processed)
   */
  async updateMedia(
    id: string,
    data: { isActive?: boolean; isProcessed?: boolean }
  ): Promise<MediaItem | null> {
    const response = await this.promisify<GrpcResponse<MediaItem>>(
      'UpdateMedia',
      {
        id,
        ...data,
      }
    );
    if (!response.success) {
      return null;
    }
    return response.data || null;
  }

  /**
   * Delete media (soft delete)
   */
  async deleteMedia(id: string): Promise<boolean> {
    const response = await this.promisify<GrpcResponse<void>>('DeleteMedia', {
      id,
    });
    return response.success;
  }

  /**
   * Bulk delete media
   */
  async bulkDeleteMedia(
    ids: string[],
    permanent: boolean = false
  ): Promise<BulkDeleteResponse> {
    return this.promisify<BulkDeleteResponse>('BulkDeleteMedia', {
      ids,
      permanent,
    });
  }

  /**
   * Get a signed URL for private/temporary access
   */
  async getSignedUrl(id: string, expiresIn: number = 3600): Promise<string> {
    const response = await this.promisify<{ success: boolean; url: string }>(
      'GetSignedUrl',
      { id, expiresIn }
    );
    return response.url;
  }

  // ==========================================================================
  // HTTP QUERY METHODS (alternative to gRPC)
  // ==========================================================================

  /**
   * Query media via HTTP (alternative to gRPC)
   */
  async queryMedia(params: {
    entityType?: string;
    entityId?: string;
    fieldName?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: MediaItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const response = await fetch(
      `${this.httpBaseUrl}/api/v1/media?${queryString}`
    );

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || 'Query failed');
    }

    return response.json() as Promise<{
      data: MediaItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>;
  }

  /**
   * Wait for the client to be ready
   */
  async waitForReady(timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      this.grpcClient.waitForReady(deadline, (error: any) => {
        if (error) {
          reject(
            new Error(`Failed to connect to media service: ${error.message}`)
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

  /**
   * Close the gRPC connection
   */
  close(): void {
    if (this.grpcClient) {
      grpc.closeClient(this.grpcClient);
    }
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let defaultClient: MediaServiceClient | null = null;

/**
 * Get or create a singleton Media Service client
 */
export const getMediaClient = (
  httpUrl?: string,
  grpcUrl?: string
): MediaServiceClient => {
  if (!defaultClient) {
    defaultClient = new MediaServiceClient(httpUrl, grpcUrl);
  }
  return defaultClient;
};

/**
 * Close the singleton client
 */
export const closeMediaClient = (): void => {
  if (defaultClient) {
    defaultClient.close();
    defaultClient = null;
  }
};

export default MediaServiceClient;
