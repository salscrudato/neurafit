/**
 * Tests for JSON Schema validation
 */

import { validateWorkoutPlanJSON, validateRepFormat, validateRestPeriods } from '../lib/schemaValidator';

describe('Schema Validation', () => {
  describe('validateWorkoutPlanJSON', () => {
    it('should validate a valid workout plan', () => {
      const validPlan = {
        exercises: [
          {
            name: 'Bench Press',
            description: 'Lie on bench, lower bar to chest, press up. Exhale on press, inhale on descent. Keep feet flat, back arched slightly.',
            sets: 3,
            reps: '8-12',
            formTips: ['Keep elbows at 45 degrees', 'Retract shoulder blades', 'Full range of motion'],
            safetyTips: ['Use spotter for heavy sets', 'Start with lighter weight'],
            restSeconds: 90,
            usesWeight: true,
            muscleGroups: ['Chest', 'Triceps'],
            difficulty: 'intermediate',
          },
        ],
        workoutSummary: {
          totalVolume: '3 sets x 8-12 reps',
          primaryFocus: 'Chest and Triceps',
          expectedRPE: '7-8',
        },
      };

      const result = validateWorkoutPlanJSON(validPlan, 1, 10);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workout with too few exercises', () => {
      const invalidPlan = {
        exercises: [],
        workoutSummary: {
          totalVolume: 'N/A',
          primaryFocus: 'None',
          expectedRPE: '0',
        },
      };

      const result = validateWorkoutPlanJSON(invalidPlan, 3, 10);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject exercise with missing required fields', () => {
      const invalidPlan = {
        exercises: [
          {
            name: 'Squat',
            // Missing description, sets, reps, etc.
          },
        ],
        workoutSummary: {
          totalVolume: '1 exercise',
          primaryFocus: 'Legs',
          expectedRPE: '7',
        },
      };

      const result = validateWorkoutPlanJSON(invalidPlan, 1, 10);
      expect(result.valid).toBe(false);
    });

    it('should reject exercise with invalid rep format', () => {
      const invalidPlan = {
        exercises: [
          {
            name: 'Push-up',
            description: 'Standard push-up with proper form. Lower chest to ground, push back up. Exhale on push, inhale on descent.',
            sets: 3,
            reps: 'invalid-format', // Invalid
            formTips: ['Keep core tight', 'Elbows at 45 degrees', 'Full range of motion'],
            safetyTips: ['Start on knees if needed', 'Stop if wrists hurt'],
            restSeconds: 60,
            usesWeight: false,
            muscleGroups: ['Chest', 'Triceps'],
            difficulty: 'beginner',
          },
        ],
        workoutSummary: {
          totalVolume: '3 sets',
          primaryFocus: 'Chest',
          expectedRPE: '6',
        },
      };

      const result = validateWorkoutPlanJSON(invalidPlan, 1, 10);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateRepFormat', () => {
    it('should require time format for Cardio workouts', () => {
      const exercises = [
        {
          name: 'Running',
          description: 'Steady-state running at moderate pace',
          sets: 1,
          reps: '8-12', // Should be time format
          formTips: ['Maintain steady pace', 'Breathe rhythmically', 'Land midfoot'],
          safetyTips: ['Warm up first', 'Stay hydrated'],
          restSeconds: 60,
          usesWeight: false,
          muscleGroups: ['Legs'],
          difficulty: 'beginner',
        },
      ];

      const result = validateRepFormat(exercises, 'Cardio');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept time format for HIIT workouts', () => {
      const exercises = [
        {
          name: 'Burpees',
          description: 'Full body explosive movement',
          sets: 3,
          reps: '45s',
          formTips: ['Explosive movement', 'Full extension', 'Land softly'],
          safetyTips: ['Modify if needed', 'Stop if dizzy'],
          restSeconds: 90,
          usesWeight: false,
          muscleGroups: ['Full Body'],
          difficulty: 'intermediate',
        },
      ];

      const result = validateRepFormat(exercises, 'HIIT');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept range format for Strength Training', () => {
      const exercises = [
        {
          name: 'Deadlift',
          description: 'Hip hinge movement with barbell',
          sets: 4,
          reps: '5-8',
          formTips: ['Neutral spine', 'Drive through heels', 'Hip hinge pattern'],
          safetyTips: ['Start light', 'Use proper form'],
          restSeconds: 180,
          usesWeight: true,
          muscleGroups: ['Back', 'Legs'],
          difficulty: 'advanced',
        },
      ];

      const result = validateRepFormat(exercises, 'Strength Training');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateRestPeriods', () => {
    it('should warn about very short rest periods for heavy exercises', () => {
      const exercises = [
        {
          name: 'Squat',
          description: 'Barbell back squat',
          sets: 5,
          reps: '3-5',
          formTips: ['Depth to parallel', 'Knees track toes', 'Chest up'],
          safetyTips: ['Use safety bars', 'Proper depth'],
          restSeconds: 45, // Too short for heavy squats
          usesWeight: true,
          muscleGroups: ['Legs'],
          difficulty: 'advanced',
        },
      ];

      const result = validateRestPeriods(exercises);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should not warn about appropriate rest periods', () => {
      const exercises = [
        {
          name: 'Bicep Curl',
          description: 'Dumbbell bicep curl',
          sets: 3,
          reps: '10-12',
          formTips: ['Control the weight', 'Full range', 'No swinging'],
          safetyTips: ['Start light', 'Avoid momentum'],
          restSeconds: 60,
          usesWeight: true,
          muscleGroups: ['Biceps'],
          difficulty: 'beginner',
        },
      ];

      const result = validateRestPeriods(exercises);
      expect(result.warnings || []).toHaveLength(0);
    });
  });
});

