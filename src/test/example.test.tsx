/**
 * Example Test Suite
 * Demonstrates testing setup and best practices
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Example component test
describe('Example Test Suite', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true)
  })

  it('should perform math correctly', () => {
    expect(2 + 2).toBe(4)
  })

  // Example of testing a simple component
  it('should render a basic component', () => {
    const TestComponent = () => <div>Hello, NeuraFit!</div>
    
    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    )
    
    expect(screen.getByText('Hello, NeuraFit!')).toBeInTheDocument()
  })
})

// Example utility function tests
describe('Utility Functions', () => {
  it('should format dates correctly', () => {
    const date = new Date('2025-01-01T00:00:00Z')
    const formatted = date.toISOString().split('T')[0]
    expect(formatted).toBe('2025-01-01')
  })

  it('should handle arrays', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(arr).toHaveLength(5)
    expect(arr[0]).toBe(1)
    expect(arr).toContain(3)
  })
})

