import * as grpc from '@grpc/grpc-js';
import { HttpError } from '@middlewares/error.middleware';

/**
 * Maps HTTP status codes to gRPC status codes.
 * This allows your existing HttpError classes (BadRequest, ResourceNotFound, etc.)
 * to be automatically translated to the correct gRPC status.
 */
const httpToGrpcStatus: Record<number, grpc.status> = {
    400: grpc.status.INVALID_ARGUMENT,
    401: grpc.status.UNAUTHENTICATED,
    403: grpc.status.PERMISSION_DENIED,
    404: grpc.status.NOT_FOUND,
    408: grpc.status.DEADLINE_EXCEEDED,
    409: grpc.status.ALREADY_EXISTS,
    422: grpc.status.INVALID_ARGUMENT,
    429: grpc.status.RESOURCE_EXHAUSTED,
    500: grpc.status.INTERNAL,
};

/**
 * Converts any error into a standardized gRPC error object.
 */
export function grpcErrorHandler(error: any): {
    code: grpc.status;
    message: string;
} {
    if (error instanceof HttpError) {
        return {
            code: httpToGrpcStatus[error.status] || grpc.status.INTERNAL,
            message: error.status === 500 ? 'Internal server error' : error.message,
        };
    }

    // Handle validation errors (e.g. from Mongoose/TypeORM)
    if (error.name === 'ValidationError') {
        return {
            code: grpc.status.INVALID_ARGUMENT,
            message: error.message,
        };
    }

    // Handle duplicate key errors (MongoDB code 11000)
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue || {});
        return {
            code: grpc.status.ALREADY_EXISTS,
            message: `An account with that ${field.join(', ')} already exists.`,
        };
    }

    return {
        code: grpc.status.INTERNAL,
        message: 'Internal server error',
    };
}

/**
 * Wraps a unary gRPC handler to provide automatic error handling.
 *
 * Errors are caught and translated to proper gRPC status codes via `grpcErrorHandler`.
 * The method itself can simply throw or let errors propagate naturally — no try/catch needed.
 *
 * @example
 * ```ts
 * getUser = withGrpcErrorHandler(async (call, callback) => {
 *   const user = await UserService.getUserById(call.request.userId);
 *   callback(null, { id: user.id, ... });
 * });
 * ```
 */
export function withGrpcErrorHandler(
    method: (call: any, callback: any) => Promise<void>
) {
    return async (call: any, callback: any) => {
        try {
            await method(call, callback);
        } catch (error: any) {
            console.error(`gRPC Error [${method.name || 'anonymous'}]:`, error);
            callback(grpcErrorHandler(error));
        }
    };
}
