import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const { statusCode, error, message } = this.getErrorDetails(exception);
    const body: Record<string, unknown> = {
      statusCode,
      error,
      message,
      method: request.method,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    if (statusCode === HttpStatus.NOT_FOUND && request.path.startsWith('/payments')) {
      body.hint = 'Use POST /payments or POST /payments/create.';
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(body);
  }

  private getErrorDetails(exception: unknown) {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'A record with one of these unique values already exists.',
        };
      }

      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'The requested record does not exist.',
        };
      }

      if (exception.code === 'P2022') {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Database Schema Error',
          message:
            'The database schema does not match the application. Run Prisma migrations and restart the API.',
        };
      }
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const payload: Record<string, unknown> =
        typeof response === 'string'
          ? { message: response }
          : (response as Record<string, unknown>);

      return {
        statusCode: exception.getStatus(),
        error: payload.error ?? HttpStatus[exception.getStatus()],
        message: payload.message ?? 'Request failed.',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected server error occurred. Check the API terminal for details.',
    };
  }
}
