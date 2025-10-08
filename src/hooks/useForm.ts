/**
 * Form Management Hook
 *
 * Provides comprehensive form state management with validation,
 * error handling, and submission logic.
 */

import type React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react'
import type { FieldError, ValidationResult } from '../types/common'

export interface UseFormOptions<T> {
  /** Initial form values */
  initialValues: T
  /** Validation function */
  validate?: (values: T) => ValidationResult
  /** Submit handler */
  onSubmit: (values: T) => Promise<void> | void
  /** Validate on change (default: false) */
  validateOnChange?: boolean
  /** Validate on blur (default: true) */
  validateOnBlur?: boolean
  /** Reset form after successful submission (default: false) */
  resetOnSubmit?: boolean
}

export interface UseFormReturn<T> {
  /** Current form values */
  values: T
  /** Form errors */
  errors: Record<keyof T, string>
  /** Touched fields */
  touched: Record<keyof T, boolean>
  /** Is form submitting */
  isSubmitting: boolean
  /** Is form valid */
  isValid: boolean
  /** Has form been submitted */
  isSubmitted: boolean
  /** Set field value */
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void
  /** Set field touched */
  setFieldTouched: <K extends keyof T>(field: K, touched?: boolean) => void
  /** Set field error */
  setFieldError: <K extends keyof T>(field: K, error: string) => void
  /** Handle field change */
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  /** Handle field blur */
  handleBlur: (field: keyof T) => () => void
  /** Handle form submit */
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  /** Reset form */
  reset: () => void
  /** Validate form */
  validateForm: () => boolean
  /** Validate field */
  validateField: <K extends keyof T>(field: K) => boolean
  /** Get field props */
  getFieldProps: <K extends keyof T>(field: K) => {
    name: K
    value: T[K]
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onBlur: () => void
  }
  /** Get field meta */
  getFieldMeta: <K extends keyof T>(field: K) => {
    error?: string
    touched: boolean
    invalid: boolean
  }
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
  validateOnChange = false,
  validateOnBlur = true,
  resetOnSubmit = false,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>)
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const initialValuesRef = useRef(initialValues)

  // Update initial values ref when it changes
  useEffect(() => {
    initialValuesRef.current = initialValues
  }, [initialValues])

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    if (!validate) return true

    const result = validate(values)
    
    if (!result.isValid) {
      const newErrors: Record<string, string> = {}
      result.errors.forEach((error: FieldError) => {
        newErrors[error.field] = error.message
      })
      setErrors(newErrors as Record<keyof T, string>)
      return false
    }

    setErrors({} as Record<keyof T, string>)
    return true
  }, [values, validate])

  // Validate single field
  const validateField = useCallback(<K extends keyof T>(field: K): boolean => {
    if (!validate) return true

    const result = validate(values)
    const fieldError = result.errors.find((e: FieldError) => e.field === field)

    if (fieldError) {
      setErrors((prev) => ({ ...prev, [field]: fieldError.message }))
      return false
    }

    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
    return true
  }, [values, validate])

  // Set field value
  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }))

    if (validateOnChange) {
      // Validate after state update
      setTimeout(() => validateField(field), 0)
    }
  }, [validateOnChange, validateField])

  // Set field touched
  const setFieldTouched = useCallback(<K extends keyof T>(field: K, isTouched: boolean = true) => {
    setTouched((prev) => ({ ...prev, [field]: isTouched }))
  }, [])

  // Set field error
  const setFieldError = useCallback(<K extends keyof T>(field: K, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }))
  }, [])

  // Handle field change
  const handleChange = useCallback((field: keyof T) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : e.target.value
      setFieldValue(field, value as T[keyof T])
    }
  }, [setFieldValue])

  // Handle field blur
  const handleBlur = useCallback((field: keyof T) => {
    return () => {
      setFieldTouched(field, true)

      if (validateOnBlur) {
        validateField(field)
      }
    }
  }, [setFieldTouched, validateOnBlur, validateField])

  // Handle form submit
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()

    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true
      return acc
    }, {} as Record<keyof T, boolean>)
    setTouched(allTouched)

    // Validate form
    const isValid = validateForm()
    if (!isValid) {
      return
    }

    // Submit form
    setIsSubmitting(true)
    setIsSubmitted(true)

    try {
      await onSubmit(values)

      if (resetOnSubmit) {
        reset()
      }
    } catch (error) {
      // Error handling is done by the onSubmit function
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, validateForm, onSubmit, resetOnSubmit])

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValuesRef.current)
    setErrors({} as Record<keyof T, string>)
    setTouched({} as Record<keyof T, boolean>)
    setIsSubmitting(false)
    setIsSubmitted(false)
  }, [initialValuesRef])

  // Get field props
  const getFieldProps = useCallback(<K extends keyof T>(field: K) => {
    return {
      name: field,
      value: values[field],
      onChange: handleChange(field),
      onBlur: handleBlur(field),
    }
  }, [values, handleChange, handleBlur])

  // Get field meta
  const getFieldMeta = useCallback(<K extends keyof T>(field: K) => {
    return {
      error: errors[field],
      touched: touched[field] || false,
      invalid: !!(errors[field] && touched[field]),
    }
  }, [errors, touched])

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isSubmitted,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validateForm,
    validateField,
    getFieldProps,
    getFieldMeta,
  }
}

/**
 * Hook for managing a single field
 */
export function useField<T>(
  name: string,
  initialValue: T,
  validate?: (value: T) => string | undefined
) {
  const [value, setValue] = useState<T>(initialValue)
  const [error, setError] = useState<string>()
  const [touched, setTouched] = useState(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value
    setValue(newValue as T)

    if (validate && touched) {
      const validationError = validate(newValue as T)
      setError(validationError)
    }
  }, [validate, touched])

  const handleBlur = useCallback(() => {
    setTouched(true)

    if (validate) {
      const validationError = validate(value)
      setError(validationError)
    }
  }, [validate, value])

  const reset = useCallback(() => {
    setValue(initialValue)
    setError(undefined)
    setTouched(false)
  }, [initialValue])

  return {
    name,
    value,
    error,
    touched,
    invalid: !!(error && touched),
    onChange: handleChange,
    onBlur: handleBlur,
    setValue,
    setError,
    setTouched,
    reset,
  }
}

