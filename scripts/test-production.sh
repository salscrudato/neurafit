#!/bin/bash

# Production Smoke Tests for NeuraFit Backend
# Tests the deployed Firebase functions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Production URLs (from Firebase deployment)
GENERATE_WORKOUT_URL="https://generateworkout-5zdm7qwt5a-uc.a.run.app"
ADD_EXERCISE_URL="https://addexercisetoworkout-5zdm7qwt5a-uc.a.run.app"
SWAP_EXERCISE_URL="https://swapexercise-5zdm7qwt5a-uc.a.run.app"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}NeuraFit Production Smoke Tests${NC}"
echo -e "${BLUE}========================================${NC}\n"

TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_production() {
  local name=$1
  local url=$2
  local data=$3

  echo -e "${YELLOW}Testing: $name${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$data" \
    "$url")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    # Validate JSON
    if echo "$body" | jq . > /dev/null 2>&1; then
      exercise_count=$(echo "$body" | jq '.exercises | length' 2>/dev/null || echo "0")
      echo -e "${GREEN}✓ PASS${NC} - Status: $http_code, Exercises: $exercise_count"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "${RED}✗ FAIL${NC} - Invalid JSON response"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
    echo "Response: $body"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""
}

# Test 1: Generate Full Body Workout
test_production "Generate Full Body Workout (30 min)" "$GENERATE_WORKOUT_URL" \
  '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["General Fitness"],
    "equipment": ["Bodyweight"]
  }'

# Test 2: Generate Upper Body Workout
test_production "Generate Upper Body Workout (45 min)" "$GENERATE_WORKOUT_URL" \
  '{
    "workoutType": "Upper Body",
    "duration": 45,
    "experience": "Intermediate",
    "goals": ["Muscle Building"],
    "equipment": ["Dumbbells", "Barbell"]
  }'

# Test 3: Generate HIIT Workout
test_production "Generate HIIT Workout (20 min)" "$GENERATE_WORKOUT_URL" \
  '{
    "workoutType": "HIIT",
    "duration": 20,
    "experience": "Advanced",
    "goals": ["Cardio"],
    "equipment": ["Bodyweight"]
  }'

# Test 4: Generate Yoga Workout
test_production "Generate Yoga Workout (60 min)" "$GENERATE_WORKOUT_URL" \
  '{
    "workoutType": "Yoga",
    "duration": 60,
    "experience": "Beginner",
    "goals": ["Flexibility"],
    "equipment": ["Yoga Mat"]
  }'

# Test 5: Generate Core Focus Workout
test_production "Generate Core Focus Workout (30 min)" "$GENERATE_WORKOUT_URL" \
  '{
    "workoutType": "Core Focus",
    "duration": 30,
    "experience": "Intermediate",
    "goals": ["Core Strength"],
    "equipment": ["Bodyweight"]
  }'

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Production Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All production tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some production tests failed${NC}"
  exit 1
fi

