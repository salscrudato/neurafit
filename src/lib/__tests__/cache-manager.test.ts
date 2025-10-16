/**
 * Cache Manager Tests
 *
 * Tests for version detection, cache invalidation, and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCurrentAppVersion,
  checkVersionMismatch,
  clearAllCaches,
  getVersionInfo,
} from '../cache-manager';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const global: any;

describe('Cache Manager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();

    // Mock the root element
    const root = document.createElement('div');
    root.id = 'root';
    root.setAttribute('data-version', '1.0.17');
    root.setAttribute('data-build-time', '2025-10-16T12:00:00.000Z');
    document.body.appendChild(root);

    // Mock fetch for manifest
    global.fetch = vi.fn();
  });

  afterEach(() => {
    const root = document.getElementById('root');
    if (root) {
      root.remove();
    }
    vi.clearAllMocks();
  });

  describe('getCurrentAppVersion', () => {
    it('should return version from root element', () => {
      const version = getCurrentAppVersion();
      expect(version).toBe('1.0.17');
    });

    it('should return "unknown" if root element missing', () => {
      const root = document.getElementById('root');
      if (root) root.remove();
      const version = getCurrentAppVersion();
      expect(version).toBe('unknown');
    });
  });

  describe('checkVersionMismatch', () => {
    it('should return false on first visit', async () => {
      const result = await checkVersionMismatch();
      expect(result).toBe(false);
      expect(localStorage.getItem('app-version')).toBe('1.0.17');
    });

    it('should return false when versions match', async () => {
      localStorage.setItem('app-version', '1.0.17');
      const result = await checkVersionMismatch();
      expect(result).toBe(false);
    });

    it('should return true when version changes', async () => {
      localStorage.setItem('app-version', '1.0.16');

      const result = await checkVersionMismatch();
      expect(result).toBe(true);
      expect(localStorage.getItem('app-version')).toBe('1.0.17');
    });

    it('should update stored version after mismatch', async () => {
      localStorage.setItem('app-version', '1.0.16');
      await checkVersionMismatch();
      expect(localStorage.getItem('app-version')).toBe('1.0.17');
    });
  });

  describe('getVersionInfo', () => {
    it('should return version info object', () => {
      const info = getVersionInfo();
      expect(info).toHaveProperty('appVersion');
      expect(info).toHaveProperty('buildTime');
      expect(info.appVersion).toBe('1.0.17');
    });

    it('should include manifest ETag if stored', async () => {
      localStorage.setItem('manifest-etag', 'abc123');
      const info = getVersionInfo();
      expect(info.manifestETag).toBe('abc123');
    });
  });

  describe('clearAllCaches', () => {
    it('should clear localStorage', async () => {
      localStorage.setItem('test-key', 'test-value');
      await clearAllCaches();
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should clear sessionStorage', async () => {
      sessionStorage.setItem('test-key', 'test-value');
      await clearAllCaches();
      expect(sessionStorage.getItem('test-key')).toBeNull();
    });

    it('should set cache-cleared timestamp', async () => {
      await clearAllCaches();
      const timestamp = localStorage.getItem('cache-cleared-at');
      expect(timestamp).toBeTruthy();
      expect(new Date(timestamp!).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should handle version update flow', async () => {
      // First visit
      let result = await checkVersionMismatch();
      expect(result).toBe(false);
      expect(localStorage.getItem('app-version')).toBe('1.0.17');

      // Simulate version change
      const root = document.getElementById('root');
      if (root) {
        root.setAttribute('data-version', '1.0.18');
      }

      // Second check detects mismatch
      result = await checkVersionMismatch();
      expect(result).toBe(true);
      expect(localStorage.getItem('app-version')).toBe('1.0.18');
    });
  });
});

