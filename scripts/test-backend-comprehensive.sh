#!/bin/bash

# Comprehensive Backend Testing Script
# Tests all workout generation scenarios with curl

set -e

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Firebase function URL
FUNCTION_URL="https://generateworkout-5zdm7qwt5a-uc.a.run.app"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test headers
print_test() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}TEST: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Helper function to validate response
validate_response() {
  local response=$1
  local test_name=$2
  
  # Check if response contains exercises
  if echo "$response" | grep -q '"exercises"'; then
    # Check if exercises array is not empty
    if echo "$response" | grep -q '"name"'; then
      echo -e "${GREEN}✓ PASS: $test_name${NC}"
      ((TESTS_PASSED++))
      return 0
    fi
  fi
  
  echo -e "${RED}✗ FAIL: $test_name${NC}"
  echo "Response: $response" | head -20
  ((TESTS_FAILED++))
  return 1
}

# Test 1: Full Body Strength - 30 minutes
print_test "Full Body Strength - 30 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Intermediate",
    "goals": ["Strength"],
    "equipment": ["Barbell", "Dumbbells", "Bench"]
  }')
validate_response "$RESPONSE" "Full Body Strength 30min"

# Test 2: Upper Body - 45 minutes
print_test "Upper Body - 45 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Upper Body",
    "duration": 45,
    "experience": "Advanced",
    "goals": ["Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells", "Cable Machine"]
  }')
validate_response "$RESPONSE" "Upper Body 45min"

# Test 3: Lower Body - 60 minutes
print_test "Lower Body - 60 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Lower Body",
    "duration": 60,
    "experience": "Intermediate",
    "goals": ["Strength", "Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells", "Leg Press Machine"]
  }')
validate_response "$RESPONSE" "Lower Body 60min"

# Test 4: HIIT - 20 minutes
print_test "HIIT - 20 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "HIIT",
    "duration": 20,
    "experience": "Intermediate",
    "goals": ["Cardio"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "HIIT 20min"

# Test 5: Cardio - 30 minutes
print_test "Cardio - 30 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Cardio",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["Cardio"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Cardio 30min"

# Test 6: Yoga - 45 minutes
print_test "Yoga - 45 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Yoga",
    "duration": 45,
    "experience": "Beginner",
    "goals": ["Flexibility"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Yoga 45min"

# Test 7: Core Focus - 15 minutes
print_test "Core Focus - 15 minutes"
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

# Test 8: Minimal Equipment - Bodyweight only
print_test "Minimal Equipment - Bodyweight only"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["General Fitness"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Bodyweight only"

# Test 9: Full Gym Equipment
print_test "Full Gym Equipment"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 60,
    "experience": "Advanced",
    "goals": ["Strength", "Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells", "Cable Machine", "Leg Press Machine", "Bench"]
  }')
validate_response "$RESPONSE" "Full gym equipment"

# Test 10: Beginner with Injuries
print_test "Beginner with Injuries"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Upper Body",
    "duration": 30,
    "experience": "Beginner",
    "goals": ["General Fitness"],
    "equipment": ["Dumbbells", "Bench"],
    "injuries": {
      "list": ["lower back"],
      "notes": "Avoid heavy deadlifts and bent-over rows"
    }
  }')
validate_response "$RESPONSE" "Beginner with injuries"

# Test 11: Advanced with Preference Notes
print_test "Advanced with Preference Notes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Chest/Triceps",
    "duration": 45,
    "experience": "Advanced",
    "goals": ["Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells", "Cable Machine"],
    "preferenceNotes": "Focus on high volume, prefer compound movements first"
  }')
validate_response "$RESPONSE" "Advanced with preferences"

# Test 12: Long Duration - 90 minutes
print_test "Long Duration - 90 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 90,
    "experience": "Advanced",
    "goals": ["Strength", "Hypertrophy"],
    "equipment": ["Barbell", "Dumbbells", "Cable Machine", "Leg Press Machine"]
  }')
validate_response "$RESPONSE" "Long duration 90min"

# Test 13: Short Duration - 15 minutes
print_test "Short Duration - 15 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Full Body",
    "duration": 15,
    "experience": "Intermediate",
    "goals": ["General Fitness"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Short duration 15min"

# Test 14: Pilates - 30 minutes
print_test "Pilates - 30 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Pilates",
    "duration": 30,
    "experience": "Intermediate",
    "goals": ["Core Strength"],
    "equipment": ["Bodyweight"]
  }')
validate_response "$RESPONSE" "Pilates 30min"

# Test 15: Shoulders - 40 minutes
print_test "Shoulders - 40 minutes"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutType": "Shoulders",
    "duration": 40,
    "experience": "Intermediate",
    "goals": ["Hypertrophy"],
    "equipment": ["Dumbbells", "Barbell", "Cable Machine"]
  }')
validate_response "$RESPONSE" "Shoulders 40min"

# Print summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi

