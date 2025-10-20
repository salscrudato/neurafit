#!/bin/bash

# Comprehensive Backend Testing Script for Optimized Workout Generation
# Tests all scenarios: workout types, durations, equipment, user types, edge cases

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_URL="https://generateworkout-5zdm7qwt5a-uc.a.run.app"
ADD_EXERCISE_URL="https://addexercisetoworkout-5zdm7qwt5a-uc.a.run.app"
SWAP_EXERCISE_URL="https://swapexercise-5zdm7qwt5a-uc.a.run.app"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test headers
print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

# Helper function to print test results
print_result() {
  local test_name=$1
  local status=$2
  local response=$3
  
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    echo -e "${RED}Response: $response${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Helper function to validate JSON response
validate_response() {
  local response=$1
  local test_name=$2
  
  # Check if response contains error
  if echo "$response" | grep -q '"error"'; then
    print_result "$test_name" "FAIL" "$response"
    return 1
  fi
  
  # Check if response contains exercises
  if echo "$response" | grep -q '"exercises"'; then
    print_result "$test_name" "PASS" ""
    return 0
  fi
  
  print_result "$test_name" "FAIL" "No exercises in response"
  return 1
}

# Test 1: Full Body Workout - 30 minutes
print_header "Test 1: Full Body Workout - 30 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Intermediate",
    "goals": ["Muscle Gain", "Strength"],
    "equipment": ["Dumbbells", "Barbell", "Bench"]
  }')
validate_response "$RESPONSE" "Full Body 30min"

# Test 2: Upper Body Workout - 45 minutes
print_header "Test 2: Upper Body Workout - 45 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Upper Body",
    "duration": 45,
    "experience": "Advanced",
    "goals": ["Strength", "Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells", "Cable Machine"]
  }')
validate_response "$RESPONSE" "Upper Body 45min"

# Test 3: Lower Body Workout - 60 minutes
print_header "Test 3: Lower Body Workout - 60 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Lower Body",
    "duration": 60,
    "experience": "Intermediate",
    "goals": ["Muscle Gain"],
    "equipment": ["Barbell", "Dumbbells", "Leg Press Machine"]
  }')
validate_response "$RESPONSE" "Lower Body 60min"

# Test 4: HIIT Workout - 20 minutes
print_header "Test 4: HIIT Workout - 20 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "HIIT",
    "duration": 20,
    "experience": "Intermediate",
    "goals": ["Cardio", "Fat Loss"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "HIIT 20min"

# Test 5: Cardio Workout - 30 minutes
print_header "Test 5: Cardio Workout - 30 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Cardio",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["Endurance"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Cardio 30min"

# Test 6: Yoga Workout - 45 minutes
print_header "Test 6: Yoga Workout - 45 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Yoga",
    "duration": 45,
    "experience": "Beginner",
    "goals": ["Flexibility", "Recovery"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Yoga 45min"

# Test 7: Core Focus Workout - 15 minutes
print_header "Test 7: Core Focus Workout - 15 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Core Focus",
    "duration": 15,
    "experience": "Intermediate",
    "goals": ["Core Strength"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Core Focus 15min"

# Test 8: Minimal Equipment - Bodyweight Only
print_header "Test 8: Minimal Equipment - Bodyweight Only"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["General Fitness"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Bodyweight Only"

# Test 9: Advanced User - Complex Equipment
print_header "Test 9: Advanced User - Complex Equipment"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 60,
    "experience": "Advanced",
    "goals": ["Strength", "Hypertrophy", "Power"],
    "equipment": ["Barbell", "Dumbbells", "Cable Machine", "Kettlebell", "Resistance Bands"]
  }')
validate_response "$RESPONSE" "Advanced User Complex Equipment"

# Test 10: Guest User (No UID)
print_header "Test 10: Guest User (No UID)"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Intermediate",
    "goals": ["General Fitness"],
    "equipment": ["Dumbbells"]
  }')
validate_response "$RESPONSE" "Guest User"

# Test 11: Authenticated User with UID
print_header "Test 11: Authenticated User with UID"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Upper Body",
    "duration": 45,
    "experience": "Advanced",
    "goals": ["Strength"],
    "equipment": ["Barbell", "Dumbbells"],
    "uid": "test-user-12345"
  }')
validate_response "$RESPONSE" "Authenticated User"

# Test 12: Workout with Injury Constraints
print_header "Test 12: Workout with Injury Constraints"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Intermediate",
    "goals": ["General Fitness"],
    "equipment": ["Dumbbells"],
    "injuries": {
      "list": ["lower back"],
      "notes": "Avoid heavy deadlifts"
    }
  }')
validate_response "$RESPONSE" "Injury Constraints"

# Test 13: Workout with Preference Notes
print_header "Test 13: Workout with Preference Notes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Intermediate",
    "goals": ["Muscle Gain"],
    "equipment": ["Dumbbells", "Barbell"],
    "preferenceNotes": "Focus on compound movements, minimal isolation"
  }')
validate_response "$RESPONSE" "Preference Notes"

# Test 14: Short Duration Workout - 15 minutes
print_header "Test 14: Short Duration Workout - 15 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 15,
    "experience": "Intermediate",
    "goals": ["General Fitness"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Short Duration 15min"

# Test 15: Long Duration Workout - 90 minutes
print_header "Test 15: Long Duration Workout - 90 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 90,
    "experience": "Advanced",
    "goals": ["Strength", "Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells", "Cable Machine"]
  }')
validate_response "$RESPONSE" "Long Duration 90min"

# Print summary
print_header "Test Summary"
echo -e "Total Tests: ${BLUE}$TESTS_RUN${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed!${NC}\n"
  exit 1
fi

