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
    it('should match exercises to Full Body workout', () => {
      expect(isExerciseMatchingWorkoutType('Barbell Squat', 'Full Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Bench Press', 'Full Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Deadlift', 'Full Body')).toBe(true);
    });

    it('should match exercises to Upper Body workout', () => {
      expect(isExerciseMatchingWorkoutType('Bench Press', 'Upper Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Barbell Row', 'Upper Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Shoulder Press', 'Upper Body')).toBe(true);
    });

    it('should NOT match leg exercises to Upper Body workout', () => {
      expect(isExerciseMatchingWorkoutType('Barbell Squat', 'Upper Body')).toBe(false);
      expect(isExerciseMatchingWorkoutType('Leg Press', 'Upper Body')).toBe(false);
    });

    it('should match exercises to Lower Body workout', () => {
      expect(isExerciseMatchingWorkoutType('Barbell Squat', 'Lower Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Deadlift', 'Lower Body')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Leg Press', 'Lower Body')).toBe(true);
    });

    it('should match exercises to Cardio workout', () => {
      expect(isExerciseMatchingWorkoutType('Burpees', 'Cardio')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Mountain Climbers', 'Cardio')).toBe(true);
      expect(isExerciseMatchingWorkoutType('Jump Rope', 'Cardio')).toBe(true);
    });

    it('should NOT match strength exercises to Cardio workout', () => {
      expect(isExerciseMatchingWorkoutType('Bench Press', 'Cardio')).toBe(false);
      expect(isExerciseMatchingWorkoutType('Barbell Squat', 'Cardio')).toBe(false);
    });

    it('should match exercises to Yoga workout', () => {
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

    it('should reject dumbbell exercises without dumbbell equipment', () => {
      expect(isExerciseUsingAvailableEquipment('Dumbbell Bench Press', ['Bodyweight'])).toBe(false);
      expect(isExerciseUsingAvailableEquipment('Dumbbell Curl', ['Barbell'])).toBe(false);
    });

    it('should allow dumbbell exercises with dumbbell equipment', () => {
      expect(isExerciseUsingAvailableEquipment('Dumbbell Bench Press', ['Dumbbells', 'Bench'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Dumbbell Curl', ['Dumbbells'])).toBe(true);
    });

    it('should allow barbell exercises with barbell equipment', () => {
      expect(isExerciseUsingAvailableEquipment('Barbell Squat', ['Barbell'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Barbell Bench Press', ['Barbell', 'Bench'])).toBe(true);
    });

    it('should allow exercises with multiple equipment options', () => {
      expect(isExerciseUsingAvailableEquipment('Dumbbell Bench Press', ['Dumbbells', 'Bench'])).toBe(true);
      expect(isExerciseUsingAvailableEquipment('Barbell Squat', ['Dumbbells', 'Barbell'])).toBe(true);
    });

    it('should reject cable exercises without cable machine', () => {
      expect(isExerciseUsingAvailableEquipment('Cable Chest Press', ['Dumbbells'])).toBe(false);
    });

    it('should allow cable exercises with cable machine', () => {
      expect(isExerciseUsingAvailableEquipment('Cable Chest Press', ['Cable Machine'])).toBe(true);
    });
  });

  describe('isRepFormatMatchingWorkoutType', () => {
    it('should accept rep ranges for strength workouts', () => {
      expect(isRepFormatMatchingWorkoutType('8-12', 'Full Body')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('6-10', 'Upper Body')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('10-15', 'Lower Body')).toBe(true);
    });

    it('should reject time format for strength workouts', () => {
      expect(isRepFormatMatchingWorkoutType('30s', 'Full Body')).toBe(false);
      expect(isRepFormatMatchingWorkoutType('45s', 'Upper Body')).toBe(false);
    });

    it('should accept time format for time-based workouts', () => {
      expect(isRepFormatMatchingWorkoutType('30s', 'Cardio')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('45s', 'HIIT')).toBe(true);
      expect(isRepFormatMatchingWorkoutType('60s', 'Yoga')).toBe(true);
    });

    it('should reject rep ranges for time-based workouts', () => {
      expect(isRepFormatMatchingWorkoutType('8-12', 'Cardio')).toBe(false);
      expect(isRepFormatMatchingWorkoutType('10-15', 'HIIT')).toBe(false);
    });

    it('should accept numeric reps for strength workouts', () => {
      expect(isRepFormatMatchingWorkoutType(10, 'Full Body')).toBe(true);
      expect(isRepFormatMatchingWorkoutType(12, 'Upper Body')).toBe(true);
    });

    it('should reject numeric reps for time-based workouts', () => {
      expect(isRepFormatMatchingWorkoutType(10, 'Cardio')).toBe(false);
      expect(isRepFormatMatchingWorkoutType(12, 'HIIT')).toBe(false);
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

    it('should return error for mismatched workout type', () => {
      const errors = getExerciseContextValidationErrors(
        'Barbell Squat',
        '8-12',
        'Upper Body',
        ['Barbell'],
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('does not match Upper Body');
    });

    it('should return error for unavailable equipment', () => {
      const errors = getExerciseContextValidationErrors(
        'Dumbbell Bench Press',
        '8-12',
        'Upper Body',
        ['Barbell'],
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('requires equipment');
    });

    it('should return error for invalid rep format', () => {
      const errors = getExerciseContextValidationErrors(
        'Burpees',
        '8-12',
        'Cardio',
        ['Bodyweight'],
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('invalid rep format');
    });

    it('should return multiple errors for multiple violations', () => {
      const errors = getExerciseContextValidationErrors(
        'Barbell Squat',
        '30s',
        'Upper Body',
        ['Dumbbells'],
      );
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

