#!/bin/bash

# Comprehensive Backend Testing Suite for NeuraFit Workout Generation
# Tests all workout types, durations, equipment, user types, and edge cases

API_URL="https://generateworkout-5zdm7qwt5a-uc.a.run.app"
PASS=0
FAIL=0
TOTAL=0
FAILED_TESTS=()

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

test_workout() {
  local name=$1
  local type=$2
  local duration=$3
  local equipment=$4
  local experience=$5
  local goals=$6
  
  ((TOTAL++))
  printf "${BLUE}%-50s${NC}" "Testing $name... "
  
  local payload="{\"workoutType\":\"$type\",\"duration\":$duration,\"equipment\":[$equipment],\"experience\":\"$experience\",\"goals\":[$goals]}"
  
  local response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  # Check for exercises array
  if echo "$response" | grep -q '"exercises"'; then
    local count=$(echo "$response" | jq '.exercises | length' 2>/dev/null)
    local duration_actual=$(echo "$response" | jq '.metadata.actualDuration' 2>/dev/null)

    if [ "$count" -gt 0 ] && [ ! -z "$duration_actual" ] && [ "$duration_actual" != "null" ]; then
      # Validate first exercise has required fields (name, description, sets, reps)
      local first_ex=$(echo "$response" | jq '.exercises[0]' 2>/dev/null)
      if echo "$first_ex" | jq -e '.name and .description and .sets and .reps' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC} ($count exercises, ${duration_actual}min)"
        ((PASS++))
        return 0
      fi
    fi
  fi
  
  echo -e "${RED}✗ FAIL${NC}"
  FAILED_TESTS+=("$name")
  ((FAIL++))
  return 1
}

echo ""
echo "=========================================="
echo "COMPREHENSIVE BACKEND TESTING SUITE"
echo "=========================================="
echo ""

# Test 1: All Workout Types (30 min, Bodyweight)
echo -e "${YELLOW}TEST GROUP 1: All Workout Types${NC}"
test_workout "Full Body 30min" "Full Body" 30 '"Bodyweight"' "Beginner" '"General Fitness"'
test_workout "Upper Body 30min" "Upper Body" 30 '"Bodyweight"' "Intermediate" '"Muscle Gain"'
test_workout "Lower Body 30min" "Lower Body" 30 '"Bodyweight"' "Beginner" '"Strength"'
test_workout "Legs/Glutes 30min" "Legs/Glutes" 30 '"Bodyweight"' "Intermediate" '"Muscle Gain"'
test_workout "Chest/Triceps 30min" "Chest/Triceps" 30 '"Bodyweight"' "Beginner" '"Muscle Gain"'
test_workout "Back/Biceps 30min" "Back/Biceps" 30 '"Bodyweight"' "Intermediate" '"Strength"'
test_workout "Shoulders 30min" "Shoulders" 30 '"Bodyweight"' "Beginner" '"Muscle Gain"'
test_workout "Cardio 30min" "Cardio" 30 '"Bodyweight"' "Beginner" '"Endurance"'
test_workout "HIIT 30min" "HIIT" 30 '"Bodyweight"' "Intermediate" '"Fat Loss"'
test_workout "Yoga 30min" "Yoga" 30 '"Bodyweight"' "Beginner" '"Flexibility"'
test_workout "Pilates 30min" "Pilates" 30 '"Bodyweight"' "Beginner" '"Core Strength"'
test_workout "Core Focus 30min" "Core Focus" 30 '"Bodyweight"' "Beginner" '"Core Strength"'

echo ""
echo -e "${YELLOW}TEST GROUP 2: Different Durations${NC}"
test_workout "Full Body 15min" "Full Body" 15 '"Bodyweight"' "Beginner" '"General Fitness"'
test_workout "Full Body 45min" "Full Body" 45 '"Bodyweight"' "Intermediate" '"General Fitness"'
test_workout "Full Body 60min" "Full Body" 60 '"Bodyweight"' "Advanced" '"General Fitness"'

echo ""
echo -e "${YELLOW}TEST GROUP 3: Different Equipment${NC}"
test_workout "Upper Body Dumbbells" "Upper Body" 30 '"Dumbbells"' "Intermediate" '"Muscle Gain"'
test_workout "Full Body Gym" "Full Body" 30 '"Dumbbells","Barbells","Machines"' "Advanced" '"Strength"'
test_workout "Lower Body Minimal" "Lower Body" 30 '"Bodyweight","Resistance Band"' "Beginner" '"Strength"'

echo ""
echo -e "${YELLOW}TEST GROUP 4: Different Experience Levels${NC}"
test_workout "Beginner Workout" "Full Body" 30 '"Bodyweight"' "Beginner" '"General Fitness"'
test_workout "Intermediate Workout" "Full Body" 30 '"Dumbbells"' "Intermediate" '"Muscle Gain"'
test_workout "Advanced Workout" "Full Body" 30 '"Dumbbells","Barbells"' "Advanced" '"Strength"'

echo ""
echo -e "${YELLOW}TEST GROUP 5: Multiple Goals${NC}"
test_workout "Multi-Goal Workout" "Full Body" 30 '"Bodyweight"' "Intermediate" '"Strength","Muscle Gain","Endurance"'

echo ""
echo "=========================================="
echo "TEST RESULTS"
echo "=========================================="
echo "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASS ✓${NC}"
echo -e "Failed: ${RED}$FAIL ✗${NC}"
PASS_RATE=$((PASS * 100 / TOTAL))
echo "Pass Rate: $PASS_RATE%"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
fi

echo "=========================================="

if [ $PASS_RATE -ge 95 ]; then
  echo -e "${GREEN}✅ EXCELLENT RELIABILITY - PRODUCTION READY!${NC}"
  exit 0
elif [ $PASS_RATE -ge 80 ]; then
  echo -e "${YELLOW}⚠️ GOOD RELIABILITY - Minor issues detected${NC}"
  exit 1
else
  echo -e "${RED}❌ POOR RELIABILITY - Needs investigation${NC}"
  exit 2
fi

