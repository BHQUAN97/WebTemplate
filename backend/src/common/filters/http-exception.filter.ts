import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

interface ErrorResponseBody {
  success: false;
  message: string;
  errors?: any;
  statusCode: number;
  timestamp: string;
  path: string;
}

/**
 * Global exception filter that catches ALL errors and formats them consistently.
 * Handles: HttpException, TypeORM errors, validation errors, and unknown errors.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errors } = this.extractError(exception);

    const errorBody: ErrorResponseBody = {
      success: false,
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errors) {
      errorBody.errors = errors;
    }

    // Log loi server (5xx)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} ${status}: ${message}`,
      );
    }

    response.status(status).json(errorBody);
  }

  private extractError(exception: unknown): {
    status: number;
    message: string;
    errors?: any;
  } {
    // NestJS HttpException (bao gom BadRequest, NotFound, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // Validation errors tu class-validator
      if (typeof response === 'object' && response !== null) {
        const resp = response as any;
        return {
          status,
          message: resp.message
            ? Array.isArray(resp.message)
              ? resp.message[0]
              : resp.message
            : exception.message,
          errors: Array.isArray(resp.message) ? resp.message : undefined,
        };
      }

      return { status, message: String(response) };
    }

    // TypeORM: Query failed (duplicate key, constraint violation, etc.)
    if (exception instanceof QueryFailedError) {
      const err = exception as any;

      // MySQL duplicate entry
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        return {
          status: HttpStatus.CONFLICT,
          message: 'Duplicate entry. This record already exists.',
        };
      }

      // Foreign key constraint
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referenced record not found.',
        };
      }

      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Database query error.',
      };
    }

    // TypeORM: Entity not found
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found.',
      };
    }

    // Loi khong xac dinh
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
