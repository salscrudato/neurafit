#!/bin/bash

# Detailed Backend Testing Script - Validates Response Structure
# Tests workout generation and validates JSON structure

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FUNCTION_URL="${VITE_WORKOUT_FN_URL:-http://localhost:5001/neurafit-ai-2025/us-central1/generateWorkout}"
BASE_URL="${FUNCTION_URL%/generateWorkout}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Detailed Backend Response Validation${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test function with detailed validation
test_workout_generation() {
  local name=$1
  local payload=$2

  echo -e "${YELLOW}Testing: $name${NC}"
  
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$BASE_URL/generateWorkout")

  # Check if response is valid JSON
  if ! echo "$response" | jq . > /dev/null 2>&1; then
    echo -e "${RED}✗ FAIL - Invalid JSON response${NC}"
    echo "Response: $response"
    return 1
  fi

  # Validate required fields
  exercises=$(echo "$response" | jq '.exercises' 2>/dev/null)
  metadata=$(echo "$response" | jq '.metadata' 2>/dev/null)
  summary=$(echo "$response" | jq '.workoutSummary' 2>/dev/null)

  if [ -z "$exercises" ] || [ "$exercises" = "null" ]; then
    echo -e "${RED}✗ FAIL - Missing exercises field${NC}"
    return 1
  fi

  if [ -z "$metadata" ] || [ "$metadata" = "null" ]; then
    echo -e "${RED}✗ FAIL - Missing metadata field${NC}"
    return 1
  fi

  if [ -z "$summary" ] || [ "$summary" = "null" ]; then
    echo -e "${RED}✗ FAIL - Missing workoutSummary field${NC}"
    return 1
  fi

  # Count exercises
  exercise_count=$(echo "$exercises" | jq 'length')
  echo -e "${GREEN}✓ PASS${NC} - Generated $exercise_count exercises"

  # Validate exercise structure
  echo "$exercises" | jq -r '.[] | "\(.name) - \(.sets)x\(.reps) - \(.restSeconds)s rest"' | while read line; do
    echo "  • $line"
  done

  # Show metadata
  echo "  Metadata:"
  echo "$metadata" | jq -r '"    Model: \(.model), Duration: \(.actualDuration)min, Attempts: \(.repairAttempts)"'

  echo ""
  return 0
}

# Test 1: Full Body 30 min
test_workout_generation "Full Body 30 min" \
  '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["General Fitness"],
    "equipment": ["Bodyweight"]
  }'

# Test 2: Upper Body 45 min
test_workout_generation "Upper Body 45 min" \
  '{
    "workoutType": "Upper Body",
    "duration": 45,
    "experience": "Intermediate",
    "goals": ["Muscle Building"],
    "equipment": ["Dumbbells", "Barbell"]
  }'

# Test 3: HIIT 20 min
test_workout_generation "HIIT 20 min" \
  '{
    "workoutType": "HIIT",
    "duration": 20,
    "experience": "Advanced",
    "goals": ["Cardio"],
    "equipment": ["Bodyweight"]
  }'

# Test 4: Yoga 60 min
test_workout_generation "Yoga 60 min" \
  '{
    "workoutType": "Yoga",
    "duration": 60,
    "experience": "Beginner",
    "goals": ["Flexibility"],
    "equipment": ["Yoga Mat"]
  }'

# Test 5: Core Focus 30 min
test_workout_generation "Core Focus 30 min" \
  '{
    "workoutType": "Core Focus",
    "duration": 30,
    "experience": "Intermediate",
    "goals": ["Core Strength"],
    "equipment": ["Bodyweight"]
  }'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All detailed tests completed${NC}"
echo -e "${BLUE}========================================${NC}"

