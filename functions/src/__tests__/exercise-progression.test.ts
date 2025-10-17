/**
 * Tests for exercise progression and variety tracking
 */

import { describe, it, expect } from 'vitest';
import {
  calculateExerciseFreshness,
  analyzeExerciseVariety,
  getVarietyRecommendations,
  updateExerciseHistory,
  type ExerciseHistory,
} from '../lib/exerciseProgression';

describe('Exercise Progression', () => {
  describe('calculateExerciseFreshness', () => {
    it('should return 100 for brand new exercises', () => {
      const history: ExerciseHistory[] = [];
      const freshness = calculateExerciseFreshness('Push-up', history);
      expect(freshness).toBe(100);
    });

    it('should penalize frequently used exercises', () => {
      const history: ExerciseHistory[] = [
        {
          name: 'Push-up',
          lastUsed: Date.now(),
          frequency: 5,
          variations: [],
        },
      ];
      const freshness = calculateExerciseFreshness('Push-up', history);
      expect(freshness).toBeLessThan(100);
      expect(freshness).toBeGreaterThan(0);
    });

    it('should penalize recently used exercises', () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const history: ExerciseHistory[] = [
        {
          name: 'Squat',
          lastUsed: oneDayAgo,
          frequency: 1,
          variations: [],
        },
      ];
      const freshness = calculateExerciseFreshness('Squat', history, 7);
      expect(freshness).toBeLessThan(100);
    });

    it('should reward exercises not used recently', () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const history: ExerciseHistory[] = [
        {
          name: 'Deadlift',
          lastUsed: thirtyDaysAgo,
          frequency: 1,
          variations: [],
        },
      ];
      const freshness = calculateExerciseFreshness('Deadlift', history, 7);
      expect(freshness).toBeGreaterThan(50);
    });

    it('should be case-insensitive', () => {
      const history: ExerciseHistory[] = [
        {
          name: 'Push-up',
          lastUsed: Date.now(),
          frequency: 1,
          variations: [],
        },
      ];
      const freshness1 = calculateExerciseFreshness('Push-up', history);
      const freshness2 = calculateExerciseFreshness('PUSH-UP', history);
      const freshness3 = calculateExerciseFreshness('push-up', history);
      expect(freshness1).toBe(freshness2);
      expect(freshness2).toBe(freshness3);
    });
  });

  describe('analyzeExerciseVariety', () => {
    it('should calculate variety score correctly', () => {
      const exercises = [
        { name: 'Push-up' },
        { name: 'Squat' },
        { name: 'Deadlift' },
      ];
      const history: ExerciseHistory[] = [];

      const variety = analyzeExerciseVariety(exercises, history);

      expect(variety.varietyScore).toBeGreaterThan(0);
      expect(variety.varietyScore).toBeLessThanOrEqual(100);
      expect(variety.uniqueExercises).toBe(3);
      expect(variety.repetitionRisk.length).toBe(0);
    });

    it('should detect duplicate exercises', () => {
      const exercises = [
        { name: 'Push-up' },
        { name: 'Push-up' },
        { name: 'Squat' },
      ];
      const history: ExerciseHistory[] = [];

      const variety = analyzeExerciseVariety(exercises, history);

      expect(variety.uniqueExercises).toBe(2);
      expect(variety.varietyScore).toBeLessThan(100);
    });

    it('should identify repetition risk for recently used exercises', () => {
      const exercises = [
        { name: 'Push-up' },
        { name: 'Squat' },
      ];
      const now = Date.now();
      const history: ExerciseHistory[] = [
        {
          name: 'Push-up',
          lastUsed: now - 1000, // Just used
          frequency: 10,
          variations: [],
        },
      ];

      const variety = analyzeExerciseVariety(exercises, history);

      expect(variety.repetitionRisk).toContain('Push-up');
    });
  });

  describe('getVarietyRecommendations', () => {
    it('should recommend variety for low variety score', () => {
      const exercises = [
        { name: 'Push-up' },
        { name: 'Push-up' },
        { name: 'Push-up' },
      ];
      const history: ExerciseHistory[] = [];

      const recommendations = getVarietyRecommendations(exercises, history);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((r) => r.toLowerCase().includes('appear'))).toBe(true);
    });

    it('should recommend alternatives for recently used exercises', () => {
      const exercises = [
        { name: 'Push-up' },
        { name: 'Squat' },
      ];
      const now = Date.now();
      const history: ExerciseHistory[] = [
        {
          name: 'Push-up',
          lastUsed: now - 1000,
          frequency: 5,
          variations: [],
        },
      ];

      const recommendations = getVarietyRecommendations(exercises, history);

      expect(recommendations.some((r) => r.includes('Recently used'))).toBe(true);
    });

    it('should not recommend changes for good variety', () => {
      const exercises = [
        { name: 'Push-up' },
        { name: 'Squat' },
        { name: 'Deadlift' },
        { name: 'Row' },
      ];
      const history: ExerciseHistory[] = [];

      const recommendations = getVarietyRecommendations(exercises, history);

      expect(recommendations.length).toBe(0);
    });
  });

  describe('updateExerciseHistory', () => {
    it('should add new exercises to history', () => {
      const history: ExerciseHistory[] = [];
      const exercises = [{ name: 'Push-up' }, { name: 'Squat' }];

      const updated = updateExerciseHistory(history, exercises);

      expect(updated.length).toBe(2);
      expect(updated.some((h) => h.name === 'Push-up')).toBe(true);
      expect(updated.some((h) => h.name === 'Squat')).toBe(true);
    });

    it('should increment frequency for existing exercises', () => {
      const history: ExerciseHistory[] = [
        {
          name: 'Push-up',
          lastUsed: Date.now() - 1000,
          frequency: 3,
          variations: [],
        },
      ];
      const exercises = [{ name: 'Push-up' }];

      const updated = updateExerciseHistory(history, exercises);

      const pushUp = updated.find((h) => h.name === 'Push-up');
      expect(pushUp?.frequency).toBe(4);
    });

    it('should update lastUsed timestamp', () => {
      const oldTime = Date.now() - 10000;
      const history: ExerciseHistory[] = [
        {
          name: 'Push-up',
          lastUsed: oldTime,
          frequency: 1,
          variations: [],
        },
      ];
      const exercises = [{ name: 'Push-up' }];

      const updated = updateExerciseHistory(history, exercises);

      const pushUp = updated.find((h) => h.name === 'Push-up');
      expect(pushUp?.lastUsed).toBeGreaterThan(oldTime);
    });

    it('should be case-insensitive when matching exercises', () => {
      const history: ExerciseHistory[] = [
        {
          name: 'Push-up',
          lastUsed: Date.now(),
          frequency: 1,
          variations: [],
        },
      ];
      const exercises = [{ name: 'PUSH-UP' }];

      const updated = updateExerciseHistory(history, exercises);

      expect(updated.length).toBe(1);
      const pushUp = updated.find((h) => h.name === 'Push-up');
      expect(pushUp?.frequency).toBe(2);
    });
  });
});

