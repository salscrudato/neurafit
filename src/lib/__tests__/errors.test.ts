/**
 * Tests for Error Handling System
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AppError,
  AuthError,
  NetworkError,
  ValidationError,
  WorkoutGenerationError,
  TimeoutError,
  OfflineError,
  ErrorHandler,
  retryWithBackoff
} from '../errors'

describe('AppError', () => {
  it('should create an AppError with all properties', () => {
    const error = new AppError(
      'Test error',
      'UNKNOWN_ERROR',
      'medium',
      'User friendly message',
      { component: 'Test' }
    )

    expect(error.message).toBe('Test error')
    expect(error.code).toBe('UNKNOWN_ERROR')
    expect(error.severity).toBe('medium')
    expect(error.userMessage).toBe('User friendly message')
    expect(error.context.component).toBe('Test')
    expect(error.retryable).toBe(false)
  })

  it('should convert to JSON correctly', () => {
    const error = new AppError(
      'Test error',
      'NETWORK_ERROR',
      'high',
      'Network failed',
      { userId: '123' }
    )

    const json = error.toJSON()

    expect(json.name).toBe('AppError')
    expect(json.message).toBe('Test error')
    expect(json.code).toBe('NETWORK_ERROR')
    expect(json.severity).toBe('high')
    expect(json.userMessage).toBe('Network failed')
    expect(json.context.userId).toBe('123')
  })
})

describe('Specific Error Classes', () => {
  it('should create AuthError with correct defaults', () => {
    const error = new AuthError('Auth failed')

    expect(error.code).toBe('AUTH_ERROR')
    expect(error.severity).toBe('high')
    expect(error.retryable).toBe(false)
  })

  it('should create NetworkError with correct defaults', () => {
    const error = new NetworkError('Network failed')

    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.severity).toBe('medium')
    expect(error.retryable).toBe(true)
  })

  it('should create ValidationError with correct defaults', () => {
    const error = new ValidationError('Invalid input', 'Please check your input')

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.severity).toBe('low')
    expect(error.retryable).toBe(false)
  })

  it('should create WorkoutGenerationError with correct defaults', () => {
    const error = new WorkoutGenerationError('Generation failed')

    expect(error.code).toBe('WORKOUT_GENERATION_ERROR')
    expect(error.severity).toBe('high')
    expect(error.retryable).toBe(true)
  })

  it('should create TimeoutError with correct defaults', () => {
    const error = new TimeoutError('Request timed out')

    expect(error.code).toBe('TIMEOUT_ERROR')
    expect(error.severity).toBe('medium')
    expect(error.retryable).toBe(true)
  })

  it('should create OfflineError with correct defaults', () => {
    const error = new OfflineError('You are offline')

    expect(error.code).toBe('OFFLINE_ERROR')
    expect(error.severity).toBe('medium')
    expect(error.retryable).toBe(true)
  })
})

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle AppError correctly', () => {
    const error = new NetworkError('Network failed')
    const handled = ErrorHandler.handle(error)

    expect(handled).toBe(error)
    expect(handled.code).toBe('NETWORK_ERROR')
  })

  it('should convert regular Error to AppError', () => {
    const error = new Error('Regular error')
    const handled = ErrorHandler.handle(error)

    expect(handled).toBeInstanceOf(AppError)
    expect(handled.code).toBe('UNKNOWN_ERROR')
    expect(handled.originalError).toBe(error)
  })

  it('should normalize unknown errors', () => {
    const error = 'String error'
    const normalized = ErrorHandler.normalize(error)

    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.message).toBe('String error')
  })

  it('should detect retryable errors', () => {
    const networkError = new NetworkError('Network failed')
    const authError = new AuthError('Auth failed')

    expect(ErrorHandler.isRetryable(networkError)).toBe(true)
    expect(ErrorHandler.isRetryable(authError)).toBe(false)
  })

  it('should detect retryable errors by message', () => {
    const error = new Error('Network timeout occurred')

    expect(ErrorHandler.isRetryable(error)).toBe(true)
  })
})

describe('retryWithBackoff', () => {
  it('should succeed on first try', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await retryWithBackoff(fn, { maxRetries: 3 })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('Failed'))
      .mockResolvedValue('success')

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelay: 10
    })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new AuthError('Auth failed'))

    await expect(
      retryWithBackoff(fn, { maxRetries: 3, baseDelay: 10 })
    ).rejects.toThrow('Auth failed')

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should call onRetry callback', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('Failed'))
      .mockResolvedValue('success')

    const onRetry = vi.fn()

    await retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelay: 10,
      onRetry
    })

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(NetworkError))
  })

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError('Failed'))

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelay: 10 })
    ).rejects.toThrow('Failed')

    expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })
})

