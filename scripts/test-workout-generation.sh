#!/bin/bash

# Comprehensive test script for workout generation API
# Tests all workout types, durations, equipment, and user scenarios

set -e

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API endpoint
API_URL="https://generateworkout-5zdm7qwt5a-uc.a.run.app"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_result() {
  local test_name=$1
  local status=$2
  local response=$3
  
  if [ "$status" -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    echo "Response: $response"
    ((TESTS_FAILED++))
  fi
}

# Helper function to test workout generation
test_workout() {
  local test_name=$1
  local workout_type=$2
  local duration=$3
  local equipment=$4
  local experience=$5
  local goals=$6
  
  echo -e "\n${BLUE}Testing: $test_name${NC}"
  
  local payload=$(cat <<EOF
{
  "workoutType": "$workout_type",
  "duration": $duration,
  "equipment": $equipment,
  "experience": "$experience",
  "goals": $goals
}
EOF
)
  
  local http_code=$(curl -s -o /tmp/response.json -w "%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$payload")

  local body=$(cat /tmp/response.json)
  
  if [ "$http_code" -eq 200 ]; then
    # Verify response has required fields
    if echo "$body" | grep -q '"exercises"' && echo "$body" | grep -q '"metadata"'; then
      local exercise_count=$(echo "$body" | grep -o '"name"' | wc -l)
      echo "Generated $exercise_count exercises"
      print_result "$test_name" 0
    else
      print_result "$test_name" 1 "Missing required fields in response"
    fi
  else
    print_result "$test_name" 1 "HTTP $http_code"
  fi
}

echo -e "${YELLOW}=== Workout Generation API Test Suite ===${NC}\n"

# Test 1: Full Body - 30 minutes - Beginner
test_workout "Full Body 30min Beginner" "Full Body" 30 '["Bodyweight"]' "Beginner" '["General Fitness"]'

# Test 2: Upper Body - 45 minutes - Intermediate
test_workout "Upper Body 45min Intermediate" "Upper Body" 45 '["Dumbbells", "Barbell"]' "Intermediate" '["Muscle Gain", "Strength"]'

# Test 3: Lower Body - 60 minutes - Advanced
test_workout "Lower Body 60min Advanced" "Lower Body" 60 '["Barbell", "Dumbbells", "Machines"]' "Advanced" '["Strength", "Power"]'

# Test 4: Cardio - 20 minutes - Beginner
test_workout "Cardio 20min Beginner" "Cardio" 20 '["Bodyweight"]' "Beginner" '["Endurance"]'

# Test 5: HIIT - 15 minutes - Intermediate
test_workout "HIIT 15min Intermediate" "HIIT" 15 '["Bodyweight"]' "Intermediate" '["Fat Loss", "Endurance"]'

# Test 6: Yoga - 30 minutes - Beginner
test_workout "Yoga 30min Beginner" "Yoga" 30 '["Bodyweight"]' "Beginner" '["Flexibility", "Stress Relief"]'

# Test 7: Pilates - 45 minutes - Intermediate
test_workout "Pilates 45min Intermediate" "Pilates" 45 '["Bodyweight", "Mat"]' "Intermediate" '["Core Strength"]'

# Test 8: Core Focus - 20 minutes - Beginner
test_workout "Core Focus 20min Beginner" "Core Focus" 20 '["Bodyweight"]' "Beginner" '["Core Strength"]'

# Test 9: Chest/Triceps - 50 minutes - Advanced
test_workout "Chest/Triceps 50min Advanced" "Chest/Triceps" 50 '["Barbell", "Dumbbells", "Cables"]' "Advanced" '["Muscle Gain"]'

# Test 10: Back/Biceps - 55 minutes - Intermediate
test_workout "Back/Biceps 55min Intermediate" "Back/Biceps" 55 '["Barbell", "Dumbbells"]' "Intermediate" '["Muscle Gain", "Strength"]'

# Test 11: Shoulders - 40 minutes - Intermediate
test_workout "Shoulders 40min Intermediate" "Shoulders" 40 '["Dumbbells", "Cables"]' "Intermediate" '["Muscle Gain"]'

# Test 12: Legs/Glutes - 60 minutes - Advanced
test_workout "Legs/Glutes 60min Advanced" "Legs/Glutes" 60 '["Barbell", "Dumbbells", "Machines"]' "Advanced" '["Muscle Gain", "Strength"]'

# Test 13: Minimal Equipment - 30 minutes
test_workout "Minimal Equipment 30min" "Full Body" 30 '["Bodyweight"]' "Beginner" '["General Fitness"]'

# Test 14: Full Gym - 60 minutes
test_workout "Full Gym 60min" "Full Body" 60 '["Barbell", "Dumbbells", "Cables", "Machines"]' "Advanced" '["Strength", "Muscle Gain"]'

# Test 15: Edge case - Very short workout (15 min)
test_workout "Short Workout 15min" "Full Body" 15 '["Bodyweight"]' "Beginner" '["General Fitness"]'

# Test 16: Edge case - Long workout (90 min)
test_workout "Long Workout 90min" "Full Body" 90 '["Barbell", "Dumbbells"]' "Advanced" '["Strength", "Endurance"]'

# Print summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "Total: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}Some tests failed!${NC}"
  exit 1
fi

