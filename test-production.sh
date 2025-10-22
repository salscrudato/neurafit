#!/bin/bash

# Production Verification Test Suite for Neurafit Workout Generation
# Tests deployed Firebase Cloud Functions

set -e

# Configuration
FUNCTION_URL="https://generateworkout-5zdm7qwt5a-uc.a.run.app"
RESULTS_FILE="production-test-results.json"
PASSED=0
FAILED=0
TOTAL=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Initialize results
echo "[]" > "$RESULTS_FILE"

# Test function
test_workout() {
  local test_name="$1"
  local workout_type="$2"
  local duration="$3"
  local experience="$4"
  local equipment="$5"
  local goals="$6"
  
  TOTAL=$((TOTAL + 1))
  
  local payload=$(cat <<EOF
{
  "workoutType": "$workout_type",
  "duration": $duration,
  "experience": "$experience",
  "equipment": $(echo "$equipment" | jq -R 'split(",") | map(select(length > 0))'),
  "goals": $(echo "$goals" | jq -R 'split(",") | map(select(length > 0))'),
  "preferenceNotes": "Production verification test"
}
EOF
)

  echo -n "Test $TOTAL: $test_name... "
  
  local start_time=$(date +%s%N)
  local response=$(curl -s -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    --max-time 30)
  local end_time=$(date +%s%N)
  local duration_ms=$(( (end_time - start_time) / 1000000 ))
  
  # Check if response contains exercises
  if echo "$response" | jq -e '.exercises | length > 0' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} (${duration_ms}ms)"
    PASSED=$((PASSED + 1))
    
    local exercise_count=$(echo "$response" | jq '.exercises | length')
    echo "$response" | jq --arg test "$test_name" --arg duration_ms "$duration_ms" \
      '. + {test: $test, response_time_ms: $duration_ms}' >> "$RESULTS_FILE"
  else
    echo -e "${RED}✗ FAIL${NC} (${duration_ms}ms)"
    FAILED=$((FAILED + 1))
    echo "$response" | jq --arg test "$test_name" \
      '. + {test: $test}' >> "$RESULTS_FILE"
  fi
}

echo "=========================================="
echo "Production Verification Test Suite"
echo "=========================================="
echo ""

# Quick smoke tests - 10 diverse tests
echo "Running production verification tests..."
test_workout "Full Body - 30min - Beginner" "Full Body" 30 "Beginner" "Bodyweight" "General Fitness"
test_workout "Upper Body - 45min - Intermediate" "Upper Body" 45 "Intermediate" "Dumbbells" "Muscle Gain"
test_workout "HIIT - 20min - Advanced" "HIIT" 20 "Advanced" "Bodyweight" "Fat Loss"
test_workout "Yoga - 45min - Beginner" "Yoga" 45 "Beginner" "Bodyweight" "Flexibility"
test_workout "Core Focus - 30min - Intermediate" "Core Focus" 30 "Intermediate" "Bodyweight" "Core Strength"
test_workout "Cardio - 30min - Intermediate" "Cardio" 30 "Intermediate" "Bodyweight" "Endurance"
test_workout "Legs/Glutes - 40min - Advanced" "Legs/Glutes" 40 "Advanced" "Dumbbells,Barbell" "Glute Activation"
test_workout "Pilates - 30min - Beginner" "Pilates" 30 "Beginner" "Bodyweight" "Core Strength"
test_workout "Back/Biceps - 50min - Expert" "Back/Biceps" 50 "Expert" "Dumbbells,Barbell,Cables" "Strength"
test_workout "Stretching - 15min - Beginner" "Stretching" 15 "Beginner" "Bodyweight" "Recovery"

echo ""
echo "=========================================="
echo "Production Test Summary"
echo "=========================================="
echo -e "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo -e "Success Rate: ${GREEN}${SUCCESS_RATE}%${NC}"
echo ""

# Calculate average response time
AVG_RESPONSE=$(jq '[.[] | select(.response_time_ms) | .response_time_ms | tonumber] | add / length' "$RESULTS_FILE" 2>/dev/null || echo "N/A")
echo "Average Response Time: ${AVG_RESPONSE}ms"

# Check for failures
if [ $FAILED -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed Tests:${NC}"
  jq '.[] | select(.error) | {test: .test, error: .error}' "$RESULTS_FILE"
  exit 1
else
  echo ""
  echo -e "${GREEN}All production tests passed!${NC}"
  exit 0
fi

