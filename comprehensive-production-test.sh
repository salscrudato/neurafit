#!/bin/bash

# Comprehensive Production Testing for NeuraFit Workout Generation
# Tests all workout types, durations, equipment, and user scenarios

BASE_URL="https://generateworkout-5zdm7qwt5a-uc.a.run.app"
RESULTS_FILE="test-results-$(date +%s).json"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
  local test_name=$1
  local payload=$2
  local expected_status=$3
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -e "\n${BLUE}Test $TOTAL_TESTS: $test_name${NC}"
  echo "Payload: $payload"
  
  # Make the request and capture response
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  # Extract status code (last line)
  status_code=$(echo "$response" | tail -n1)
  # Extract body (everything except last line)
  body=$(echo "$response" | head -n-1)
  
  echo "Status: $status_code"
  
  # Check if status matches expected
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Validate response structure
    if echo "$body" | jq . > /dev/null 2>&1; then
      echo "Response is valid JSON"
      
      # Check for required fields
      if [ "$status_code" = "200" ]; then
        if echo "$body" | jq -e '.exercises' > /dev/null 2>&1; then
          exercise_count=$(echo "$body" | jq '.exercises | length')
          quality=$(echo "$body" | jq '.metadata.qualityScore.overall')
          echo "Exercises: $exercise_count, Quality Score: $quality"
        fi
      fi
    fi
  else
    echo -e "${RED}❌ FAILED (expected $expected_status, got $status_code)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "Response: $body"
  fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}NeuraFit Production Testing Suite${NC}"
echo -e "${BLUE}========================================${NC}"

# Test 1: Beginner Full Body (15 min)
run_test "Beginner Full Body (15 min)" \
  '{"experience":"Beginner","goals":["General Health"],"equipment":["Bodyweight"],"workoutType":"Full Body","duration":15}' \
  "200"

# Test 2: Intermediate Upper Body (30 min)
run_test "Intermediate Upper Body (30 min)" \
  '{"experience":"Intermediate","goals":["Muscle Gain"],"equipment":["Dumbbells"],"workoutType":"Upper Body","duration":30}' \
  "200"

# Test 3: Advanced Lower Body (45 min)
run_test "Advanced Lower Body (45 min)" \
  '{"experience":"Advanced","goals":["Strength"],"equipment":["Barbell","Dumbbells"],"workoutType":"Lower Body","duration":45}' \
  "200"

# Test 4: Beginner Cardio (20 min)
run_test "Beginner Cardio (20 min)" \
  '{"experience":"Beginner","goals":["Weight Loss"],"equipment":["Bodyweight"],"workoutType":"Cardio","duration":20}' \
  "200"

# Test 5: Intermediate HIIT (25 min)
run_test "Intermediate HIIT (25 min)" \
  '{"experience":"Intermediate","goals":["Endurance"],"equipment":["Bodyweight"],"workoutType":"HIIT","duration":25}' \
  "200"

# Test 6: Advanced Yoga (45 min)
run_test "Advanced Yoga (45 min)" \
  '{"experience":"Advanced","goals":["Flexibility"],"equipment":["Bodyweight"],"workoutType":"Yoga","duration":45}' \
  "200"

# Test 7: Beginner Pilates (30 min)
run_test "Beginner Pilates (30 min)" \
  '{"experience":"Beginner","goals":["Core Strength"],"equipment":["Bodyweight"],"workoutType":"Pilates","duration":30}' \
  "200"

# Test 8: With Injuries (30 min)
run_test "With Injuries - Lower Back (30 min)" \
  '{"experience":"Intermediate","goals":["General Health"],"equipment":["Dumbbells"],"workoutType":"Full Body","duration":30,"injuries":{"list":["Lower Back"]}}' \
  "200"

# Test 9: Long Duration (60 min)
run_test "Long Duration (60 min)" \
  '{"experience":"Advanced","goals":["Muscle Gain","Strength"],"equipment":["Full Gym"],"workoutType":"Full Body","duration":60}' \
  "200"

# Test 10: Very Long Duration (90 min)
run_test "Very Long Duration (90 min)" \
  '{"experience":"Advanced","goals":["Muscle Gain"],"equipment":["Full Gym"],"workoutType":"Upper Body","duration":90}' \
  "200"

# Test 11: Multiple Equipment (30 min)
run_test "Multiple Equipment (30 min)" \
  '{"experience":"Intermediate","goals":["Muscle Gain"],"equipment":["Dumbbells","Barbell","Cables"],"workoutType":"Full Body","duration":30}' \
  "200"

# Test 12: Multiple Goals (30 min)
run_test "Multiple Goals (30 min)" \
  '{"experience":"Intermediate","goals":["Muscle Gain","Strength","Endurance"],"equipment":["Dumbbells"],"workoutType":"Full Body","duration":30}' \
  "200"

# Test 13: Invalid Duration (0 min)
run_test "Invalid Duration (0 min)" \
  '{"experience":"Beginner","duration":0}' \
  "500"

# Test 14: Missing Required Fields
run_test "Missing Duration" \
  '{"experience":"Beginner"}' \
  "500"

# Test 15: Cache Hit Test (repeat request)
run_test "Cache Hit Test (repeat)" \
  '{"experience":"Beginner","goals":["General Health"],"equipment":["Bodyweight"],"workoutType":"Full Body","duration":15}' \
  "200"

# Print summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "\n${GREEN}✅ ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
  exit 1
fi

