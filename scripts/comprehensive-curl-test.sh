#!/bin/bash

# Comprehensive curl-based testing for NeuraFit AI Workout Generation Backend
# Tests all endpoints with various scenarios, edge cases, and error conditions
# Validates response structure, error handling, and robustness

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:5001/neurafit-ai-2025/us-central1}"
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper: Print test header
print_header() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Helper: Test API endpoint
test_endpoint() {
  local test_name=$1
  local endpoint=$2
  local method=$3
  local payload=$4
  local expected_status=$5
  local check_fields=$6
  
  ((TESTS_TOTAL++))
  
  echo -e "\n${BLUE}Test $TESTS_TOTAL: $test_name${NC}"
  
  local response=$(mktemp)
  local http_code=$(curl -s -w "%{http_code}" -X "$method" "$API_URL$endpoint" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    -o "$response" 2>&1)
  
  local body=$(cat "$response")
  
  # Check HTTP status
  if [ "$http_code" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ HTTP Status: $http_code${NC}"
    
    # Check required fields if specified
    if [ -n "$check_fields" ]; then
      local all_fields_present=true
      for field in $check_fields; do
        if ! echo "$body" | grep -q "\"$field\""; then
          echo -e "${RED}✗ Missing field: $field${NC}"
          all_fields_present=false
        fi
      done
      
      if [ "$all_fields_present" = true ]; then
        echo -e "${GREEN}✓ All required fields present${NC}"
        ((TESTS_PASSED++))
      else
        echo -e "${RED}✗ Response missing required fields${NC}"
        echo "Response: $body"
        ((TESTS_FAILED++))
      fi
    else
      ((TESTS_PASSED++))
    fi
  else
    echo -e "${RED}✗ HTTP Status: $http_code (expected $expected_status)${NC}"
    echo "Response: $body"
    ((TESTS_FAILED++))
  fi
  
  rm -f "$response"
}

# ============================================================================
# MAIN TEST SUITE
# ============================================================================

print_header "NeuraFit AI Workout Generation - Comprehensive Backend Test Suite"

echo -e "\n${YELLOW}API Endpoint: $API_URL${NC}"
echo -e "${YELLOW}Testing at: $(date)${NC}"

# ============================================================================
# SECTION 1: Basic Workout Generation Tests
# ============================================================================

print_header "SECTION 1: Basic Workout Generation"

test_endpoint \
  "Full Body 30min Beginner" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Full Body","duration":30,"experience":"Beginner","goals":["General Fitness"],"equipment":["Bodyweight"]}' \
  200 \
  "exercises metadata"

test_endpoint \
  "Upper Body 45min Intermediate" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Upper Body","duration":45,"experience":"Intermediate","goals":["Muscle Gain","Strength"],"equipment":["Dumbbells","Barbell"]}' \
  200 \
  "exercises metadata"

test_endpoint \
  "Lower Body 60min Advanced" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Lower Body","duration":60,"experience":"Advanced","goals":["Strength","Power"],"equipment":["Barbell","Dumbbells","Machines"]}' \
  200 \
  "exercises metadata"

# ============================================================================
# SECTION 2: Time-Based Workout Tests
# ============================================================================

print_header "SECTION 2: Time-Based Workouts (Cardio, HIIT, Yoga, etc.)"

test_endpoint \
  "Cardio 20min Beginner" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Cardio","duration":20,"experience":"Beginner","goals":["Endurance"],"equipment":["Bodyweight"]}' \
  200 \
  "exercises metadata"

test_endpoint \
  "HIIT 15min Intermediate" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"HIIT","duration":15,"experience":"Intermediate","goals":["Fat Loss","Endurance"],"equipment":["Bodyweight"]}' \
  200 \
  "exercises metadata"

test_endpoint \
  "Yoga 30min Beginner" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Yoga","duration":30,"experience":"Beginner","goals":["Flexibility","Stress Relief"],"equipment":["Bodyweight"]}' \
  200 \
  "exercises metadata"

test_endpoint \
  "Pilates 45min Intermediate" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Pilates","duration":45,"experience":"Intermediate","goals":["Core Strength"],"equipment":["Bodyweight","Mat"]}' \
  200 \
  "exercises metadata"

# ============================================================================
# SECTION 3: Edge Cases and Duration Extremes
# ============================================================================

print_header "SECTION 3: Edge Cases and Duration Extremes"

test_endpoint \
  "Very Short Workout (5min)" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Full Body","duration":5,"experience":"Beginner","goals":["General Fitness"],"equipment":["Bodyweight"]}' \
  200 \
  "exercises metadata"

test_endpoint \
  "Long Workout (120min)" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Full Body","duration":120,"experience":"Advanced","goals":["Strength","Endurance"],"equipment":["Barbell","Dumbbells"]}' \
  200 \
  "exercises metadata"

# ============================================================================
# SECTION 4: Error Handling Tests
# ============================================================================

print_header "SECTION 4: Error Handling and Validation"

test_endpoint \
  "Missing Required Fields" \
  "/generateWorkout" \
  "POST" \
  '{}' \
  400 \
  "error"

test_endpoint \
  "Invalid HTTP Method" \
  "/generateWorkout" \
  "GET" \
  '' \
  405 \
  "error"

test_endpoint \
  "Invalid Duration (too high)" \
  "/generateWorkout" \
  "POST" \
  '{"workoutType":"Full Body","duration":500,"experience":"Beginner","goals":["General Fitness"],"equipment":["Bodyweight"]}' \
  200 \
  "exercises metadata"

# ============================================================================
# SUMMARY
# ============================================================================

print_header "TEST SUMMARY"

echo -e "\n${YELLOW}Total Tests: $TESTS_TOTAL${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed!${NC}"
  exit 1
fi

