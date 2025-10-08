/**
 * Form Validation Utilities
 * 
 * Provides comprehensive validation functions for forms with
 * proper error messages and type safety.
 */

import type { FieldError, ValidationResult } from '../types/common'

/**
 * Validation rule type
 */
export type ValidationRule<T = unknown> = {
  validate: (value: T) => boolean
  message: string
}

/**
 * Field validator
 */
export class FieldValidator<T = unknown> {
  private rules: ValidationRule<T>[] = []
  private fieldName: string

  constructor(fieldName: string) {
    this.fieldName = fieldName
  }

  /**
   * Add a custom validation rule
   */
  custom(validate: (value: T) => boolean, message: string): this {
    this.rules.push({ validate, message })
    return this
  }

  /**
   * Validate the field value
   */
  validate(value: T): FieldError | null {
    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        return {
          field: this.fieldName,
          message: rule.message,
        }
      }
    }
    return null
  }
}

/**
 * String validator
 */
export class StringValidator extends FieldValidator<string> {
  /**
   * Require non-empty string
   */
  required(message: string = 'This field is required'): this {
    return this.custom((value) => value.trim().length > 0, message)
  }

  /**
   * Minimum length
   */
  minLength(length: number, message?: string): this {
    return this.custom(
      (value) => value.length >= length,
      message || `Must be at least ${length} characters`
    )
  }

  /**
   * Maximum length
   */
  maxLength(length: number, message?: string): this {
    return this.custom(
      (value) => value.length <= length,
      message || `Must be at most ${length} characters`
    )
  }

  /**
   * Email validation
   */
  email(message: string = 'Invalid email address'): this {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return this.custom((value) => emailRegex.test(value), message)
  }

  /**
   * URL validation
   */
  url(message: string = 'Invalid URL'): this {
    return this.custom((value) => {
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    }, message)
  }

  /**
   * Pattern matching
   */
  pattern(regex: RegExp, message: string = 'Invalid format'): this {
    return this.custom((value) => regex.test(value), message)
  }

  /**
   * Phone number validation (basic)
   */
  phone(message: string = 'Invalid phone number'): this {
    const phoneRegex = /^[\d\s\-+()]+$/
    return this.custom(
      (value) => phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10,
      message
    )
  }

  /**
   * Alphanumeric only
   */
  alphanumeric(message: string = 'Only letters and numbers allowed'): this {
    return this.custom((value) => /^[a-zA-Z0-9]+$/.test(value), message)
  }

  /**
   * No whitespace
   */
  noWhitespace(message: string = 'Whitespace not allowed'): this {
    return this.custom((value) => !/\s/.test(value), message)
  }
}

/**
 * Number validator
 */
export class NumberValidator extends FieldValidator<number> {
  /**
   * Require non-null number
   */
  required(message: string = 'This field is required'): this {
    return this.custom((value) => value !== null && value !== undefined && !isNaN(value), message)
  }

  /**
   * Minimum value
   */
  min(min: number, message?: string): this {
    return this.custom((value) => value >= min, message || `Must be at least ${min}`)
  }

  /**
   * Maximum value
   */
  max(max: number, message?: string): this {
    return this.custom((value) => value <= max, message || `Must be at most ${max}`)
  }

  /**
   * Integer only
   */
  integer(message: string = 'Must be an integer'): this {
    return this.custom((value) => Number.isInteger(value), message)
  }

  /**
   * Positive number
   */
  positive(message: string = 'Must be positive'): this {
    return this.custom((value) => value > 0, message)
  }

  /**
   * Non-negative number
   */
  nonNegative(message: string = 'Must be non-negative'): this {
    return this.custom((value) => value >= 0, message)
  }
}

/**
 * Array validator
 */
export class ArrayValidator<T> extends FieldValidator<T[]> {
  /**
   * Require non-empty array
   */
  required(message: string = 'At least one item is required'): this {
    return this.custom((value) => Array.isArray(value) && value.length > 0, message)
  }

  /**
   * Minimum length
   */
  minLength(length: number, message?: string): this {
    return this.custom(
      (value) => value.length >= length,
      message || `Must have at least ${length} items`
    )
  }

  /**
   * Maximum length
   */
  maxLength(length: number, message?: string): this {
    return this.custom(
      (value) => value.length <= length,
      message || `Must have at most ${length} items`
    )
  }

  /**
   * Unique items
   */
  unique(message: string = 'Items must be unique'): this {
    return this.custom((value) => new Set(value).size === value.length, message)
  }
}

/**
 * Form validator
 */
export class FormValidator<T extends Record<string, unknown>> {
  private validators: Map<keyof T, FieldValidator> = new Map()

  /**
   * Add a field validator
   */
  field<K extends keyof T>(name: K, validator: FieldValidator<T[K]>): this {
    this.validators.set(name, validator as FieldValidator)
    return this
  }

  /**
   * Validate the entire form
   */
  validate(data: T): ValidationResult {
    const errors: FieldError[] = []

    for (const [field, validator] of this.validators.entries()) {
      const error = validator.validate(data[field])
      if (error) {
        errors.push(error)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate a single field
   */
  validateField<K extends keyof T>(name: K, value: T[K]): FieldError | null {
    const validator = this.validators.get(name)
    if (!validator) return null
    return validator.validate(value)
  }
}

/**
 * Helper functions for common validations
 */

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function isPhone(value: string): boolean {
  const phoneRegex = /^[\d\s\-+()]+$/
  return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10
}

export function isStrongPassword(value: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  )
}

export function isAlphanumeric(value: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(value)
}

export function isNumeric(value: string): boolean {
  return /^[0-9]+$/.test(value)
}

export function isAlpha(value: string): boolean {
  return /^[a-zA-Z]+$/.test(value)
}

/**
 * Sanitization functions
 */

export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

export function sanitizeUrl(value: string): string {
  let url = value.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  return url
}

