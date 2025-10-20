#!/bin/bash

# Comprehensive Backend Testing Script for NeuraFit Workout Generation
# Tests all endpoints with various scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_URL="${VITE_WORKOUT_FN_URL:-http://localhost:5001/neurafit-ai-2025/us-central1/generateWorkout}"
BASE_URL="${FUNCTION_URL%/generateWorkout}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}NeuraFit Backend Comprehensive Testing${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
  local name=$1
  local endpoint=$2
  local method=$3
  local data=$4
  local expected_status=$5

  echo -e "${YELLOW}Testing: $name${NC}"
  
  if [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} - Expected: $expected_status, Got: $http_code"
    echo "Response: $body"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""
}

# Test 1: Generate Full Body Workout (30 min, Beginner)
echo -e "${BLUE}=== Test 1: Full Body Workout (30 min, Beginner) ===${NC}"
test_endpoint "Generate Full Body Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["General Fitness"],
    "equipment": ["Bodyweight"],
    "personalInfo": {"sex": "Male", "height": "5'\''10\"", "weight": "180 lbs"}
  }' "200"

# Test 2: Generate Upper Body Workout (45 min, Intermediate)
echo -e "${BLUE}=== Test 2: Upper Body Workout (45 min, Intermediate) ===${NC}"
test_endpoint "Generate Upper Body Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Upper Body",
    "duration": 45,
    "experience": "Intermediate",
    "goals": ["Muscle Building", "Strength"],
    "equipment": ["Dumbbells", "Barbell"],
    "personalInfo": {"sex": "Female", "height": "5'\''6\"", "weight": "140 lbs"}
  }' "200"

# Test 3: Generate HIIT Workout (20 min, Advanced)
echo -e "${BLUE}=== Test 3: HIIT Workout (20 min, Advanced) ===${NC}"
test_endpoint "Generate HIIT Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "HIIT",
    "duration": 20,
    "experience": "Advanced",
    "goals": ["Cardio", "Fat Loss"],
    "equipment": ["Bodyweight"],
    "preferenceNotes": "High intensity, explosive movements"
  }' "200"

# Test 4: Generate Yoga Workout (60 min, Beginner)
echo -e "${BLUE}=== Test 4: Yoga Workout (60 min, Beginner) ===${NC}"
test_endpoint "Generate Yoga Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Yoga",
    "duration": 60,
    "experience": "Beginner",
    "goals": ["Flexibility", "Stress Relief"],
    "equipment": ["Yoga Mat"],
    "preferenceNotes": "Gentle, relaxing flow"
  }' "200"

# Test 5: Generate Legs/Glutes Workout (50 min, Intermediate)
echo -e "${BLUE}=== Test 5: Legs/Glutes Workout (50 min, Intermediate) ===${NC}"
test_endpoint "Generate Legs/Glutes Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Legs/Glutes",
    "duration": 50,
    "experience": "Intermediate",
    "goals": ["Muscle Building"],
    "equipment": ["Barbell", "Dumbbells", "Machines"],
    "injuries": {"list": ["knee"], "notes": "Avoid deep squats"}
  }' "200"

# Test 6: Generate Core Focus Workout (30 min, Beginner)
echo -e "${BLUE}=== Test 6: Core Focus Workout (30 min, Beginner) ===${NC}"
test_endpoint "Generate Core Focus Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Core Focus",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["Core Strength"],
    "equipment": ["Bodyweight", "Yoga Mat"]
  }' "200"

# Test 7: Generate Cardio Workout (40 min, Intermediate)
echo -e "${BLUE}=== Test 7: Cardio Workout (40 min, Intermediate) ===${NC}"
test_endpoint "Generate Cardio Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Cardio",
    "duration": 40,
    "experience": "Intermediate",
    "goals": ["Endurance", "Cardiovascular Health"],
    "equipment": ["Bodyweight"]
  }' "200"

# Test 8: Generate Lower Body Workout (55 min, Advanced)
echo -e "${BLUE}=== Test 8: Lower Body Workout (55 min, Advanced) ===${NC}"
test_endpoint "Generate Lower Body Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Lower Body",
    "duration": 55,
    "experience": "Advanced",
    "goals": ["Strength", "Power"],
    "equipment": ["Barbell", "Dumbbells", "Machines"]
  }' "200"

# Test 9: Generate Pilates Workout (45 min, Beginner)
echo -e "${BLUE}=== Test 9: Pilates Workout (45 min, Beginner) ===${NC}"
test_endpoint "Generate Pilates Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Pilates",
    "duration": 45,
    "experience": "Beginner",
    "goals": ["Core Strength", "Flexibility"],
    "equipment": ["Yoga Mat", "Pilates Ball"]
  }' "200"

# Test 10: Generate Shoulders Workout (40 min, Intermediate)
echo -e "${BLUE}=== Test 10: Shoulders Workout (40 min, Intermediate) ===${NC}"
test_endpoint "Generate Shoulders Workout" "/generateWorkout" "POST" \
  '{
    "workoutType": "Shoulders",
    "duration": 40,
    "experience": "Intermediate",
    "goals": ["Muscle Building"],
    "equipment": ["Dumbbells", "Barbell", "Cables"]
  }' "200"

# Test 11: Invalid request (missing required fields)
echo -e "${BLUE}=== Test 11: Invalid Request (Missing Fields) ===${NC}"
test_endpoint "Invalid Request" "/generateWorkout" "POST" \
  '{}' "500"

# Test 12: Invalid method
echo -e "${BLUE}=== Test 12: Invalid HTTP Method ===${NC}"
test_endpoint "Invalid Method" "/generateWorkout" "GET" "" "405"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi

