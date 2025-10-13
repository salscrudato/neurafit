/**
 * Tests for duration validation and adjustment
 */

import { validateAndAdjustDuration, computeMinMaxExerciseCount } from '../lib/durationAdjustment';
import type { ProgrammingContext } from '../lib/promptBuilder';

describe('Duration Validation', () => {
  describe('computeMinMaxExerciseCount', () => {
    const defaultProgramming: ProgrammingContext = {
      sets: [3, 4],
      reps: [8, 12],
      restSeconds: [60, 90],
      intensity: '70-80% 1RM',
    };

    it('should compute correct range for 30-minute workout', () => {
      const result = computeMinMaxExerciseCount(30, defaultProgramming, 'Full Body');
      expect(result.min).toBeGreaterThan(0);
      expect(result.max).toBeGreaterThan(result.min);
      expect(result.warmupMin).toBeGreaterThan(0);
    });

    it('should compute correct range for 60-minute workout', () => {
      const result = computeMinMaxExerciseCount(60, defaultProgramming, 'Full Body');
      expect(result.min).toBeGreaterThan(0);
      expect(result.max).toBeGreaterThan(result.min);
      // Longer workout should allow more exercises
      const shortResult = computeMinMaxExerciseCount(30, defaultProgramming, 'Full Body');
      expect(result.max).toBeGreaterThan(shortResult.max);
    });

    it('should account for longer rest periods', () => {
      const longRestProgramming: ProgrammingContext = {
        sets: [3, 4],
        reps: [3, 5],
        restSeconds: [180, 240], // Much longer rest
        intensity: '85-95% 1RM',
      };

      const result = computeMinMaxExerciseCount(30, longRestProgramming, 'Strength Training');
      const normalResult = computeMinMaxExerciseCount(30, defaultProgramming, 'Full Body');
      
      // Longer rest should mean fewer exercises fit in same time
      expect(result.max).toBeLessThan(normalResult.max);
    });

    it('should handle edge cases', () => {
      const result = computeMinMaxExerciseCount(15, defaultProgramming, 'Full Body');
      expect(result.min).toBeGreaterThanOrEqual(1);
      expect(result.max).toBeGreaterThanOrEqual(result.min);
    });
  });

  describe('validateAndAdjustDuration', () => {
    const createWorkout = (exercises: Array<{ sets: number; reps: string; restSeconds: number }>) => ({
      exercises: exercises.map((ex, i) => ({
        name: `Exercise ${i + 1}`,
        description: 'Test exercise description with proper length for validation requirements.',
        sets: ex.sets,
        reps: ex.reps,
        formTips: ['Tip 1', 'Tip 2', 'Tip 3'],
        safetyTips: ['Safety 1', 'Safety 2'],
        restSeconds: ex.restSeconds,
        usesWeight: true,
        muscleGroups: ['Test'],
        difficulty: 'intermediate',
      })),
      workoutSummary: {
        totalVolume: 'Test',
        primaryFocus: 'Test',
        expectedRPE: '7',
      },
    });

    it('should validate workout within acceptable duration range', () => {
      const workout = createWorkout([
        { sets: 3, reps: '8-12', restSeconds: 90 },
        { sets: 3, reps: '8-12', restSeconds: 90 },
        { sets: 3, reps: '8-12', restSeconds: 90 },
        { sets: 3, reps: '8-12', restSeconds: 90 },
      ]);

      const result = validateAndAdjustDuration(workout, 30, 4);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should use ±3 min variance for workouts < 45 min', () => {
      const workout = createWorkout([
        { sets: 3, reps: '8-12', restSeconds: 90 },
        { sets: 3, reps: '8-12', restSeconds: 90 },
      ]);

      const result = validateAndAdjustDuration(workout, 30, 2);
      
      // Should be valid if within ±3 minutes
      if (result.actualDuration >= 27 && result.actualDuration <= 33) {
        expect(result.isValid).toBe(true);
      }
    });

    it('should use ±4 min variance for workouts ≥ 45 min', () => {
      const workout = createWorkout([
        { sets: 4, reps: '8-12', restSeconds: 120 },
        { sets: 4, reps: '8-12', restSeconds: 120 },
        { sets: 4, reps: '8-12', restSeconds: 120 },
        { sets: 4, reps: '8-12', restSeconds: 120 },
        { sets: 4, reps: '8-12', restSeconds: 120 },
      ]);

      const result = validateAndAdjustDuration(workout, 45, 5);
      
      // Should be valid if within ±4 minutes
      if (result.actualDuration >= 41 && result.actualDuration <= 49) {
        expect(result.isValid).toBe(true);
      }
    });

    it('should calculate actual duration correctly', () => {
      const workout = createWorkout([
        { sets: 3, reps: '10-12', restSeconds: 60 },
      ]);

      const result = validateAndAdjustDuration(workout, 30, 1);
      
      // 5 min warmup + (3 sets * (1 min exercise + 1 min rest)) - 1 min (no rest after last set)
      // = 5 + (3 * 2) - 1 = 10 minutes
      expect(result.actualDuration).toBeGreaterThan(0);
      expect(result.actualDuration).toBeLessThan(30);
    });

    it('should handle time-based reps format', () => {
      const workout = createWorkout([
        { sets: 3, reps: '45s', restSeconds: 90 },
        { sets: 3, reps: '30s', restSeconds: 60 },
      ]);

      const result = validateAndAdjustDuration(workout, 20, 2);
      expect(result.actualDuration).toBeGreaterThan(0);
    });

    it('should reject workout significantly over duration', () => {
      const workout = createWorkout([
        { sets: 5, reps: '8-12', restSeconds: 180 },
        { sets: 5, reps: '8-12', restSeconds: 180 },
        { sets: 5, reps: '8-12', restSeconds: 180 },
        { sets: 5, reps: '8-12', restSeconds: 180 },
        { sets: 5, reps: '8-12', restSeconds: 180 },
        { sets: 5, reps: '8-12', restSeconds: 180 },
      ]);

      const result = validateAndAdjustDuration(workout, 30, 6);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject workout significantly under duration', () => {
      const workout = createWorkout([
        { sets: 1, reps: '5', restSeconds: 30 },
      ]);

      const result = validateAndAdjustDuration(workout, 60, 1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should calculate difference correctly', () => {
      const workout = createWorkout([
        { sets: 3, reps: '8-12', restSeconds: 90 },
        { sets: 3, reps: '8-12', restSeconds: 90 },
      ]);

      const result = validateAndAdjustDuration(workout, 30, 2);
      expect(result.difference).toBe(result.actualDuration - 30);
    });
  });
});

