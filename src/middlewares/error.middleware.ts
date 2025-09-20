import { NextFunction, Request, Response } from 'express';
export class HttpError extends Error {
  public status: number;
  public details: Record<string, any>;
  public code: number;
  public keyValue: Record<string, any>;

  constructor(
    statusCode: number,
    message: string,
    details: Record<string, any> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = statusCode;
    this.details = details;
    this.code = (details as { code?: number })['code'] || 0;
    this.keyValue = (details as { keyValue?: object })['keyValue'] || {};
  }
}

export class BadRequest extends HttpError {
  constructor(message: string, details?: object) {
    super(400, message, details);
  }
}

export class ResourceNotFound extends HttpError {
  constructor(message: string, details?: object) {
    super(404, message, details);
  }
}

export class Unauthorized extends HttpError {
  constructor(message: string, details?: object) {
    super(401, message, details);
  }
}

export class Forbidden extends HttpError {
  constructor(message: string, details?: object) {
    super(403, message, details);
  }
}

export class Timeout extends HttpError {
  constructor(message: string, details?: object) {
    super(408, message, details);
  }
}

export class Conflict extends HttpError {
  constructor(message: string, details?: object) {
    super(409, message, details);
  }
}

export class InvalidInput extends HttpError {
  constructor(message: string, details?: object) {
    super(422, message, details);
  }
}

export class TooManyRequests extends HttpError {
  constructor(message: string, details?: object) {
    super(429, message, details);
  }
}

export class ServerError extends HttpError {
  constructor(message: string, details?: object) {
    super(500, message, details);
  }
}

export const routeNotFound = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const message = `Route not found`;
  res
    .status(404)
    .json({ success: false, message, method: req.method, resource: req.path });
};

export const errorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // httpLogger.error(err);
  let statusCode = err.status || 500;
  let cleanedMessage = (
    statusCode === 500
      ? 'An error occured, please try again later'
      : err.message
  ).replace(/"/g, '');

  console.log('err:', err);
  const responsePayload: any = {
    success: false,
    message: cleanedMessage,
  };

  if (err instanceof Error) {
    if (err.name === 'ValidationError') {
      cleanedMessage = 'Validation failed';
      responsePayload.message = err.message;
      statusCode = 422;
    } else if (err.code && err.code == 11000) {
      const field = Object.keys(err.keyValue);
      cleanedMessage = 'Duplicate key error';
      responsePayload.message = `An account with that ${field} already exists.`;
      statusCode = 409;
    }
  }

  if (err.details != null) {
    responsePayload.details = err.details;
  }

  res.status(statusCode).json(responsePayload);
};
