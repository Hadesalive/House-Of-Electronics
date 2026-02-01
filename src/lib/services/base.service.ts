// Base service class with common functionality
import { ApiResponse } from '../types/core';

export abstract class BaseService {
  protected generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  protected createSuccessResponse<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

  protected createErrorResponse<T>(error: string): ApiResponse<T> {
    return { success: false, error } as ApiResponse<T>;
  }

  protected handleError<T>(error: unknown): ApiResponse<T> {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Service error:', errorMessage);
    return this.createErrorResponse(errorMessage) as ApiResponse<T>;
  }

  protected validateRequired<T>(data: Partial<T>, requiredFields: (keyof T)[]): string[] {
    const errors: string[] = [];
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field] === '')) {
        errors.push(`${String(field)} is required`);
      }
    });
    return errors;
  }
}