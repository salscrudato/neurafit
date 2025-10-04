/**
 * Focus Management Hook
 *
 * Manages focus on route changes for accessibility.
 * Ensures screen readers announce page changes and focus is properly managed.
 */

import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to manage focus on route changes
 * 
 * This hook:
 * 1. Moves focus to the main content area on route change
 * 2. Announces the page change to screen readers
 * 3. Scrolls to top of page
 */
export function useFocusManagement() {
  const location = useLocation();
  const previousPathRef = useRef<string>('');

  useEffect(() => {
    // Skip on initial mount
    if (previousPathRef.current === '') {
      previousPathRef.current = location.pathname;
      return;
    }

    // Only run if path actually changed
    if (previousPathRef.current === location.pathname) {
      return;
    }

    previousPathRef.current = location.pathname;

    // Scroll to top
    window.scrollTo(0, 0);

    // Find and focus the main content area
    // Look for main element, or fallback to body
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    
    if (mainContent instanceof HTMLElement) {
      // Make it focusable if it isn't already
      if (!mainContent.hasAttribute('tabindex')) {
        mainContent.setAttribute('tabindex', '-1');
      }
      
      // Focus it
      mainContent.focus();
      
      // Remove focus styling after focus (optional)
      mainContent.style.outline = 'none';
    } else {
      // Fallback: focus the body
      document.body.focus();
    }

    // Announce page change to screen readers
    announcePageChange();
  }, [location.pathname]);
}

/**
 * Announce page change to screen readers
 */
function announcePageChange() {
  // Create or get the live region
  let liveRegion = document.getElementById('route-announcer');
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'route-announcer';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only'; // Screen reader only
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
  }

  // Announce the new page
  const pageTitle = document.title;
  liveRegion.textContent = `Navigated to ${pageTitle}`;

  // Clear after announcement
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = '';
    }
  }, 1000);
}

/**
 * Hook to create a skip link for keyboard navigation
 * 
 * Usage: Add this to your main App component
 */
export function useSkipLink() {
  useEffect(() => {
    // Check if skip link already exists
    if (document.getElementById('skip-link')) {
      return;
    }

    // Create skip link
    const skipLink = document.createElement('a');
    skipLink.id = 'skip-link';
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    
    // Style the skip link (visible on focus)
    skipLink.style.position = 'absolute';
    skipLink.style.top = '-40px';
    skipLink.style.left = '0';
    skipLink.style.background = '#3b82f6';
    skipLink.style.color = 'white';
    skipLink.style.padding = '8px 16px';
    skipLink.style.textDecoration = 'none';
    skipLink.style.zIndex = '10000';
    skipLink.style.transition = 'top 0.2s';
    
    // Show on focus
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    // Add to body
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Cleanup
    return () => {
      const link = document.getElementById('skip-link');
      if (link) {
        link.remove();
      }
    };
  }, []);
}

/**
 * Hook to trap focus within a modal or dialog
 */
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') {
        return;
      }

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive, containerRef]);
}

