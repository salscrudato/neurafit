#!/bin/bash

# Test Exercise Operations: Add and Swap
# Tests the addExerciseToWorkout and swapExercise endpoints

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ADD_EXERCISE_URL="https://addexercisetoworkout-5zdm7qwt5a-uc.a.run.app"
SWAP_EXERCISE_URL="https://swapexercise-5zdm7qwt5a-uc.a.run.app"

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_result() {
  local test_name=$1
  local status=$2
  
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Test 1: Add Exercise to Full Body Workout
print_header "Test 1: Add Exercise to Full Body Workout"
RESPONSE=$(curl -s -X POST "$ADD_EXERCISE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "currentWorkout": {
      "exercises": [
        {"name": "Barbell Squat"},
        {"name": "Bench Press"},
        {"name": "Deadlift"}
      ]
    },
    "workoutType": "Full Body",
    "experience": "Intermediate",
    "goals": ["Strength"],
    "equipment": ["Barbell", "Dumbbells"]
  }')

if echo "$RESPONSE" | grep -q '"exercise"' && ! echo "$RESPONSE" | grep -q '"error"'; then
  print_result "Add Exercise Full Body" "PASS"
else
  print_result "Add Exercise Full Body" "FAIL"
  echo "Response: $RESPONSE"
fi

# Test 2: Add Exercise to Upper Body Workout
print_header "Test 2: Add Exercise to Upper Body Workout"
RESPONSE=$(curl -s -X POST "$ADD_EXERCISE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "currentWorkout": {
      "exercises": [
        {"name": "Bench Press"},
        {"name": "Barbell Row"}
      ]
    },
    "workoutType": "Upper Body",
    "experience": "Advanced",
    "goals": ["Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells", "Cable Machine"]
  }')

if echo "$RESPONSE" | grep -q '"exercise"' && ! echo "$RESPONSE" | grep -q '"error"'; then
  print_result "Add Exercise Upper Body" "PASS"
else
  print_result "Add Exercise Upper Body" "FAIL"
  echo "Response: $RESPONSE"
fi

# Test 3: Add Exercise to Core Focus Workout
print_header "Test 3: Add Exercise to Core Focus Workout"
RESPONSE=$(curl -s -X POST "$ADD_EXERCISE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "currentWorkout": {
      "exercises": [
        {"name": "Plank"},
        {"name": "Dead Bug"}
      ]
    },
    "workoutType": "Core Focus",
    "experience": "Intermediate",
    "goals": ["Core Strength"],
    "equipment": ["Bodyweight"]
  }')

if echo "$RESPONSE" | grep -q '"exercise"' && ! echo "$RESPONSE" | grep -q '"error"'; then
  print_result "Add Exercise Core Focus" "PASS"
else
  print_result "Add Exercise Core Focus" "FAIL"
  echo "Response: $RESPONSE"
fi

# Test 4: Swap Exercise in Lower Body Workout
print_header "Test 4: Swap Exercise in Lower Body Workout"
RESPONSE=$(curl -s -X POST "$SWAP_EXERCISE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "exerciseToReplace": {
      "name": "Leg Press",
      "muscleGroups": ["quadriceps", "glutes"],
      "sets": 4,
      "reps": "8-12",
      "restSeconds": 90
    },
    "currentWorkout": {
      "exercises": [
        {"name": "Leg Press"},
        {"name": "Leg Curl"},
        {"name": "Calf Raise"}
      ]
    },
    "workoutType": "Lower Body",
    "experience": "Intermediate",
    "goals": ["Hypertrophy"],
    "equipment": ["Machine"]
  }')

if echo "$RESPONSE" | grep -q '"exercise"' && ! echo "$RESPONSE" | grep -q '"error"'; then
  print_result "Swap Exercise Lower Body" "PASS"
else
  print_result "Swap Exercise Lower Body" "FAIL"
  echo "Response: $RESPONSE"
fi

# Test 5: Swap Exercise in Upper Body Workout
print_header "Test 5: Swap Exercise in Upper Body Workout"
RESPONSE=$(curl -s -X POST "$SWAP_EXERCISE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "exerciseToReplace": {
      "name": "Bench Press",
      "muscleGroups": ["chest", "triceps"],
      "sets": 4,
      "reps": "8-10",
      "restSeconds": 90
    },
    "currentWorkout": {
      "exercises": [
        {"name": "Bench Press"},
        {"name": "Barbell Row"},
        {"name": "Shoulder Press"}
      ]
    },
    "workoutType": "Upper Body",
    "experience": "Advanced",
    "goals": ["Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells"]
  }')

if echo "$RESPONSE" | grep -q '"exercise"' && ! echo "$RESPONSE" | grep -q '"error"'; then
  print_result "Swap Exercise Upper Body" "PASS"
else
  print_result "Swap Exercise Upper Body" "FAIL"
  echo "Response: $RESPONSE"
fi

# Test 6: Swap Exercise in Chest/Triceps Workout
print_header "Test 6: Swap Exercise in Chest/Triceps Workout"
RESPONSE=$(curl -s -X POST "$SWAP_EXERCISE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "exerciseToReplace": {
      "name": "Dumbbell Bench Press",
      "muscleGroups": ["chest", "triceps"],
      "sets": 4,
      "reps": "8-10",
      "restSeconds": 90
    },
    "currentWorkout": {
      "exercises": [
        {"name": "Dumbbell Bench Press"},
        {"name": "Tricep Dips"},
        {"name": "Chest Flyes"}
      ]
    },
    "workoutType": "Chest/Triceps",
    "experience": "Intermediate",
    "goals": ["Hypertrophy"],
    "equipment": ["Dumbbells", "Bench"]
  }')

if echo "$RESPONSE" | grep -q '"exercise"' && ! echo "$RESPONSE" | grep -q '"error"'; then
  print_result "Swap Exercise Chest/Triceps" "PASS"
else
  print_result "Swap Exercise Chest/Triceps" "FAIL"
  echo "Response: $RESPONSE"
fi

# Test 7: Add Exercise with Injury Constraints
print_header "Test 7: Add Exercise with Injury Constraints"
RESPONSE=$(curl -s -X POST "$ADD_EXERCISE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "currentWorkout": {
      "exercises": [
        {"name": "Leg Press"},
        {"name": "Leg Curl"}
      ]
    },
    "workoutType": "Lower Body",
    "experience": "Intermediate",
    "goals": ["Muscle Gain"],
    "equipment": ["Machine"],
    "injuries": {
      "list": ["knee"],
      "notes": "Avoid high impact"
    }
  }')

if echo "$RESPONSE" | grep -q '"exercise"' && ! echo "$RESPONSE" | grep -q '"error"'; then
  print_result "Add Exercise with Injury Constraints" "PASS"
else
  print_result "Add Exercise with Injury Constraints" "FAIL"
  echo "Response: $RESPONSE"
fi

# Test 8: Swap Exercise with Minimal Equipment
print_header "Test 8: Swap Exercise with Minimal Equipment"
RESPONSE=$(curl -s -X POST "$SWAP_EXERCISE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "exerciseToReplace": {
      "name": "Push-ups",
      "muscleGroups": ["chest", "triceps"],
      "sets": 3,
      "reps": "10-15",
      "restSeconds": 60
    },
    "currentWorkout": {
      "exercises": [
        {"name": "Push-ups"},
        {"name": "Squats"},
        {"name": "Lunges"}
      ]
    },
    "workoutType": "Full Body",
    "experience": "Beginner",
    "goals": ["General Fitness"],
    "equipment": ["Bodyweight"]
  }')

if echo "$RESPONSE" | grep -q '"exercise"' && ! echo "$RESPONSE" | grep -q '"error"'; then
  print_result "Swap Exercise Minimal Equipment" "PASS"
else
  print_result "Swap Exercise Minimal Equipment" "FAIL"
  echo "Response: $RESPONSE"
fi

# Print summary
print_header "Test Summary"
echo -e "Total Tests: ${BLUE}$TESTS_RUN${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All exercise operation tests passed!${NC}\n"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed!${NC}\n"
  exit 1
fi

