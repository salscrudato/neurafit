/**
 * Tests for exercise context validation
 */

import {
  isExerciseMatchingWorkoutType,
  isExerciseUsingAvailableEquipment,
  isRepFormatMatchingWorkoutType,
  getExerciseContextValidationErrors,
} from '../lib/exerciseContextValidation';

describe('Exercise Context Validation', () => {
  describe('isExerciseMatchingWorkoutType', () => {
    it('should match exercises to Full Body workout (lenient)', () => {
      expect(isExerciseMatchingWorkoutType('Barbell Squat', 'Full Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Bench Press', 'Full Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Deadlift', 'Full Body')).toBe(true);
    });

    it('should match exercises to Upper Body workout (lenient)', () => {
      expect(isExerciseMatchingWorkoutType('Bench Press', 'Upper Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Barbell Row', 'Upper Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Shoulder Press', 'Upper Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Push-up', 'Upper Body')).toBe(true);
    });

    it('should reject leg exercises for Upper Body workout (hard constraint)', () => {
      expect(isExerciseMatchingWorkoutType('Barbell Squat', 'Upper Body')).toBe(false);
      expect(isExerciseMatchingWorkoutType('Leg Press', 'Upper Body')).toBe(false);
    });

    it('should match exercises to Lower Body workout (lenient)', () => {
      expect(isExerciseMatchingWorkoutType('Barbell Squat', 'Lower Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Deadlift', 'Lower Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Leg Press', 'Lower Body')).toBe(true);
    });

    it('should allow most exercises for any workout type (lenient)', () => {
      expect(isExerciseMatchingWorkoutType('Burpees', 'Cardio')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Mountain Climbers', 'Cardio')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Jump Rope', 'Cardio')).toBe(true);
      // Lenient - allow strength exercises for cardio
      expect(isExerciseMatchingWorkoutType('Bench Press', 'Cardio')).toBe(true);
    });

    it('should match exercises to Yoga workout (lenient)', () => {
      expect(isExerciseMatchingWorkoutType('Warrior Pose', 'Yoga')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Downward Dog', 'Yoga')).toBe(true);
    });
  });

  describe('isExerciseUsingAvailableEquipment', () => {
    it('should allow bodyweight exercises with bodyweight equipment', () => {
      expect(isExerciseUsingAvailableEquipment('Push-up', ['Bodyweight'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Pull-up', ['Bodyweight'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Dip', ['Bodyweight'])).toBe(true);
    });

    it('should allow dumbbell exercises even without dumbbell equipment (lenient)', () => {
      // Lenient - trust the AI
      expect(isExerciseUsingAvailableEquipment('Dumbbell Bench Press', ['Bodyweight'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Dumbbell Curl', ['Barbell'])).toBe(true);
    });

    it('should allow dumbbell exercises with dumbbell equipment', () => {
      expect(isExerciseUsingAvailableEquipment('Dumbbell Bench Press', ['Dumbbells', 'Bench'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Dumbbell Curl', ['Dumbbells'])).toBe(true);
    });

    it('should allow barbell exercises with barbell equipment', () => {
      expect(isExerciseUsingAvailableEquipment('Barbell Squat', ['Barbell'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Barbell Bench Press', ['Barbell', 'Bench'])).toBe(true);
    });

    it('should allow exercises with multiple equipment options (lenient)', () => {
      expect(isExerciseUsingAvailableEquipment('Dumbbell Bench Press', ['Dumbbells', 'Bench'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Barbell Squat', ['Dumbbells', 'Barbell'])).toBe(true);
    });

    it('should reject cable exercises without cable machine (hard constraint)', () => {
      expect(isExerciseUsingAvailableEquipment('Cable Chest Press', ['Dumbbells'])).toBe(false);
    });

    it('should allow cable exercises with cable machine', () => {
      expect(isExerciseUsingAvailableEquipment('Cable Chest Press', ['Cable Machine'])).toBe(true);
    });
  });

  describe('isRepFormatMatchingWorkoutType', () => {
    it('should accept rep ranges for strength workouts (lenient)', () => {
      expect(isRepFormatMatchingWorkoutType('8-12', 'Full Body')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('6-10', 'Upper Body')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('10-15', 'Lower Body')).toBe(true);
    });

    it('should accept time format for any workout (lenient)', () => {
      expect(isRepFormatMatchingWorkoutType('30s', 'Full Body')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('45s', 'Upper Body')).toBe(true);
    });

    it('should accept time format for time-based workouts', () => {
      expect(isRepFormatMatchingWorkoutType('30s', 'Cardio')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('45s', 'HIIT')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('60s', 'Yoga')).toBe(true);
    });

    it('should accept rep ranges for any workout (lenient)', () => {
      expect(isRepFormatMatchingWorkoutType('8-12', 'Cardio')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('10-15', 'HIIT')).toBe(true);
    });

    it('should accept numeric reps for any workout (lenient)', () => {
      expect(isRepFormatMatchingWorkoutType(10, 'Full Body')).toBe(true);
      expect(isRepFormatMatchingWorkoutType(12, 'Upper Body')).toBe(true);
      expect(isRepFormatMatchingWorkoutType(10, 'Cardio')).toBe(true);
      expect(isRepFormatMatchingWorkoutType(12, 'HIIT')).toBe(true);
    });

    it('should reject invalid rep format (no digits)', () => {
      expect(isRepFormatMatchingWorkoutType('abc', 'Full Body')).toBe(false);
      expect(isRepFormatMatchingWorkoutType('xyz', 'Cardio')).toBe(false);
    });
  });

  describe('getExerciseContextValidationErrors', () => {
    it('should return no errors for valid Full Body exercise', () => {
      const errors = getExerciseContextValidationErrors(
        'Barbell Squat',
        '8-12',
        'Full Body',
        ['Barbell'],
      );
      expect(errors).toHaveLength(0);
    });

    it('should return error only for hard constraint violations (leg exercises in Upper Body)', () => {
      const errors = getExerciseContextValidationErrors(
        'Leg Press',
        '8-12',
        'Upper Body',
        ['Machine'],
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('does not match Upper Body');
    });

    it('should allow dumbbell exercises even if barbell is listed (lenient)', () => {
      const errors = getExerciseContextValidationErrors(
        'Dumbbell Bench Press',
        '8-12',
        'Upper Body',
        ['Barbell'],
      );
      // Lenient validation - allow this
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid rep format (no digits)', () => {
      const errors = getExerciseContextValidationErrors(
        'Burpees',
        'abc',
        'Cardio',
        ['Bodyweight'],
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('invalid rep format');
    });

    it('should allow time format for any workout (lenient)', () => {
      const errors = getExerciseContextValidationErrors(
        'Bench Press',
        '30s',
        'Upper Body',
        ['Dumbbells'],
      );
      // Lenient validation - allow this
      expect(errors).toHaveLength(0);
    });
  });
});

