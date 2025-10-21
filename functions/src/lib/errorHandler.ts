/**
 * Centralized error handling for Firebase Cloud Functions
 * Provides consistent error responses and logging
 */

import type { Response } from 'express';

export interface ErrorResponse {
  error: string;
  details?: string | string[];
  retryable?: boolean;
}

/**
 * Handle API errors with consistent response format
 * Provides user-friendly messages while logging technical details
 * Implements comprehensive error categorization and graceful degradation
 */
export function handleApiError(error: unknown, res: Response, context: string = 'API', requestId?: string): void {
  // Prevent double-sending response
  if (res.headersSent) {
    console.error(`❌ ${context} error (headers already sent):`, {
      error,
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStatus = (error as Record<string, unknown>)?.status as number | undefined;
  const errorCode = (error as Record<string, unknown>)?.code as string | undefined;
  const msg = errorMessage.toLowerCase();

  // Structured logging for better debugging
  console.error(`❌ ${context} error:`, {
    message: errorMessage,
    status: errorStatus,
    code: errorCode,
    type: error instanceof Error ? error.constructor.name : typeof error,
    requestId,
    timestamp: new Date().toISOString(),
  });

  // Categorize and respond to specific error types
  // Timeout errors - retryable
  if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('timed out')) {
    res.status(504).json({
      error: 'Generation timeout',
      details: ['Workout generation took too long. Try a shorter duration or simpler workout type.'],
      retryable: true,
    });
    return;
  }

  // Connection errors - retryable
  if (msg.includes('econnrefused') || msg.includes('econnreset') || msg.includes('connection')) {
    res.status(502).json({
      error: 'Connection error',
      details: ['Network connection issue. Please try again.'],
      retryable: true,
    });
    return;
  }

  // Authentication/configuration errors - not retryable
  if (errorStatus === 401 || errorStatus === 403 || msg.includes('unauthorized') || msg.includes('api key')) {
    res.status(502).json({
      error: 'Service unavailable',
      details: ['Our AI service is temporarily unavailable. Please try again later.'],
      retryable: false,
    });
    return;
  }

  // Rate limiting - retryable with backoff
  if (errorStatus === 429 || msg.includes('rate_limit')) {
    res.status(429).json({
      error: 'Rate limited',
      details: ['Too many requests. Please wait a moment before trying again.'],
      retryable: true,
    });
    return;
  }

  // Server errors from OpenAI - retryable
  if (errorStatus === 500 || errorStatus === 502 || errorStatus === 503 || errorStatus === 504) {
    res.status(502).json({
      error: 'Service error',
      details: ['AI service temporarily unavailable. Please try again.'],
      retryable: true,
    });
    return;
  }

  // Validation/JSON errors - retryable (AI can generate better next time)
  if (msg.includes('validation') || msg.includes('json') || msg.includes('parse') || msg.includes('schema')) {
    res.status(500).json({
      error: 'Generation quality issue',
      details: ['Generated workout did not meet quality standards. Please try again.'],
      retryable: true,
    });
    return;
  }

  // Duplicate/similarity errors - retryable
  if (msg.includes('duplicate') || msg.includes('similar')) {
    res.status(400).json({
      error: 'Exercise conflict',
      details: ['Generated exercise is too similar to existing ones. Please try again.'],
      retryable: true,
    });
    return;
  }

  // Empty response errors - retryable
  if (msg.includes('empty') || msg.includes('no exercises')) {
    res.status(500).json({
      error: 'Generation failed',
      details: ['AI did not generate a valid workout. Please try again.'],
      retryable: true,
    });
    return;
  }

  // Generic error - retryable by default
  res.status(500).json({
    error: 'Unexpected error',
    details: ['An unexpected error occurred. Please try again.'],
    retryable: true,
  });
}

/**
 * Validate request body exists and has required fields
 */
export function validateRequestBody(body: unknown, requiredFields: string[]): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const bodyObj = body as Record<string, unknown>;
  for (const field of requiredFields) {
    if (!(field in bodyObj)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  return { valid: true };
}

/**
 * Sanitize string input - trim and validate length
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(input: unknown, maxItems: number = 20, maxLength: number = 100): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .slice(0, maxItems)
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0 && item.trim().length <= maxLength)
    .map((item) => item.trim());
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

