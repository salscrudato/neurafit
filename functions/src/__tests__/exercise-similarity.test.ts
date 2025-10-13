/**
 * Tests for exercise similarity detection
 */

import { isSimilarExercise, findSimilarExercises } from '../lib/exerciseTaxonomy';

describe('Exercise Similarity Detection', () => {
  describe('isSimilarExercise', () => {
    it('should detect exact matches (case-insensitive)', () => {
      expect(isSimilarExercise('Bench Press', 'bench press')).toBe(true);
      expect(isSimilarExercise('SQUAT', 'squat')).toBe(true);
    });

    it('should detect synonym variations', () => {
      expect(isSimilarExercise('Bench Press', 'Chest Press')).toBe(true);
      expect(isSimilarExercise('Pull-up', 'Chin-up')).toBe(true);
      expect(isSimilarExercise('Sit-up', 'Crunch')).toBe(true);
    });

    it('should detect equipment variations of same exercise', () => {
      expect(isSimilarExercise('Barbell Bench Press', 'Dumbbell Bench Press')).toBe(true);
      expect(isSimilarExercise('Barbell Row', 'Dumbbell Row')).toBe(true);
      expect(isSimilarExercise('Cable Fly', 'Dumbbell Fly')).toBe(true);
    });

    it('should NOT match completely different exercises', () => {
      expect(isSimilarExercise('Bench Press', 'Squat')).toBe(false);
      expect(isSimilarExercise('Deadlift', 'Bicep Curl')).toBe(false);
      expect(isSimilarExercise('Plank', 'Running')).toBe(false);
    });

    it('should NOT match exercises with different movement patterns', () => {
      expect(isSimilarExercise('Bench Press', 'Dumbbell Fly')).toBe(false);
      expect(isSimilarExercise('Squat', 'Leg Press')).toBe(false);
      expect(isSimilarExercise('Deadlift', 'Romanian Deadlift')).toBe(false);
    });

    it('should handle partial word matches correctly', () => {
      // These should be similar (same base exercise)
      expect(isSimilarExercise('Incline Bench Press', 'Decline Bench Press')).toBe(true);
      
      // These should NOT be similar (different exercises)
      expect(isSimilarExercise('Leg Extension', 'Leg Curl')).toBe(false);
    });
  });

  describe('findSimilarExercises', () => {
    it('should find no similarities in diverse workout', () => {
      const exercises = [
        { name: 'Bench Press' },
        { name: 'Squat' },
        { name: 'Deadlift' },
        { name: 'Pull-up' },
      ];

      const similar = findSimilarExercises(exercises);
      expect(similar).toHaveLength(0);
    });

    it('should detect duplicate exercises', () => {
      const exercises = [
        { name: 'Bench Press' },
        { name: 'Squat' },
        { name: 'bench press' }, // Duplicate
      ];

      const similar = findSimilarExercises(exercises);
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0]).toEqual([0, 2, 'Bench Press', 'bench press']);
    });

    it('should detect synonym variations', () => {
      const exercises = [
        { name: 'Bench Press' },
        { name: 'Chest Press' }, // Synonym
        { name: 'Squat' },
      ];

      const similar = findSimilarExercises(exercises);
      expect(similar.length).toBeGreaterThan(0);
    });

    it('should detect equipment variations', () => {
      const exercises = [
        { name: 'Barbell Bench Press' },
        { name: 'Dumbbell Bench Press' }, // Equipment variation
        { name: 'Squat' },
      ];

      const similar = findSimilarExercises(exercises);
      expect(similar.length).toBeGreaterThan(0);
    });

    it('should find multiple similar pairs', () => {
      const exercises = [
        { name: 'Barbell Bench Press' },
        { name: 'Dumbbell Bench Press' }, // Similar to #0
        { name: 'Pull-up' },
        { name: 'Chin-up' }, // Similar to #2
      ];

      const similar = findSimilarExercises(exercises);
      expect(similar.length).toBe(2);
    });

    it('should handle empty array', () => {
      const exercises: Array<{ name: string }> = [];
      const similar = findSimilarExercises(exercises);
      expect(similar).toHaveLength(0);
    });

    it('should handle single exercise', () => {
      const exercises = [{ name: 'Bench Press' }];
      const similar = findSimilarExercises(exercises);
      expect(similar).toHaveLength(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should prevent adding "Incline Dumbbell Press" when "Bench Press" exists', () => {
      const existingExercises = ['Bench Press', 'Squat', 'Deadlift'];
      const newExercise = 'Incline Dumbbell Press';

      const hasSimilar = existingExercises.some((existing) =>
        isSimilarExercise(existing, newExercise),
      );

      expect(hasSimilar).toBe(true);
    });

    it('should allow adding "Dumbbell Fly" when "Bench Press" exists', () => {
      const existingExercises = ['Bench Press', 'Squat', 'Deadlift'];
      const newExercise = 'Dumbbell Fly';

      const hasSimilar = existingExercises.some((existing) =>
        isSimilarExercise(existing, newExercise),
      );

      expect(hasSimilar).toBe(false);
    });

    it('should prevent swapping "Barbell Row" with "Dumbbell Row"', () => {
      const original = 'Barbell Row';
      const replacement = 'Dumbbell Row';

      expect(isSimilarExercise(original, replacement)).toBe(true);
    });

    it('should allow swapping "Barbell Row" with "Pull-up"', () => {
      const original = 'Barbell Row';
      const replacement = 'Pull-up';

      expect(isSimilarExercise(original, replacement)).toBe(false);
    });
  });
});

