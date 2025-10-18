#!/bin/bash

# Comprehensive test script for deployed NeuraFit functions
# Tests various workout types, durations, and user scenarios

set -e

# Use deployed function URLs
BASE_URL="https://generateworkout-5zdm7qwt5a-uc.a.run.app"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_count=0
passed_count=0
failed_count=0

# Function to test a workout generation scenario
test_scenario() {
  local name="$1"
  local payload="$2"
  local expected_duration="$3"
  
  test_count=$((test_count + 1))
  echo -e "\n${BLUE}Test $test_count: $name${NC}"
  
  local start_time=$(date +%s%N)
  
  RESPONSE=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  local end_time=$(date +%s%N)
  local duration_ms=$(( (end_time - start_time) / 1000000 ))
  
  # Check if response contains exercises
  if echo "$RESPONSE" | jq -e '.exercises' > /dev/null 2>&1; then
    local exercise_count=$(echo "$RESPONSE" | jq '.exercises | length')
    local quality_score=$(echo "$RESPONSE" | jq '.metadata.qualityScore.overall // "N/A"')
    local actual_duration=$(echo "$RESPONSE" | jq '.metadata.actualDuration // "N/A"')
    local repair_attempts=$(echo "$RESPONSE" | jq '.metadata.repairAttempts // 0')
    
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  Exercises: $exercise_count"
    echo "  Quality Score: $quality_score"
    echo "  Target Duration: ${expected_duration}min | Actual: ${actual_duration}min"
    echo "  Repair Attempts: $repair_attempts"
    echo "  API Response Time: ${duration_ms}ms"
    
    passed_count=$((passed_count + 1))
    
    # Show first exercise as sample
    echo "  Sample Exercise:"
    echo "$RESPONSE" | jq '.exercises[0] | {name, sets, reps, muscleGroups}' | sed 's/^/    /'
  else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    failed_count=$((failed_count + 1))
  fi
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}NeuraFit Deployed Functions Test Suite${NC}"
echo -e "${YELLOW}========================================${NC}"

# Test 1: Short workout (15 min)
test_scenario "Beginner Full Body (15 min)" '{
  "experience": "Beginner",
  "goals": ["General Health"],
  "equipment": ["Bodyweight"],
  "workoutType": "Full Body",
  "duration": 15
}' 15

# Test 2: Medium workout (30 min)
test_scenario "Intermediate Upper Body (30 min)" '{
  "experience": "Intermediate",
  "goals": ["Muscle Gain", "Strength"],
  "equipment": ["Dumbbells", "Barbell"],
  "workoutType": "Upper Body",
  "duration": 30
}' 30

# Test 3: Long workout (60 min)
test_scenario "Advanced Lower Body (60 min)" '{
  "experience": "Advanced",
  "goals": ["Strength", "Power"],
  "equipment": ["Barbell", "Dumbbells", "Leg Press"],
  "workoutType": "Lower Body",
  "duration": 60
}' 60

# Test 4: Very long workout (90 min)
test_scenario "Advanced Full Body (90 min)" '{
  "experience": "Advanced",
  "goals": ["Muscle Gain", "Strength"],
  "equipment": ["Barbell", "Dumbbells", "Cable Machine"],
  "workoutType": "Full Body",
  "duration": 90
}' 90

# Test 5: Cardio (20 min)
test_scenario "Beginner Cardio (20 min)" '{
  "experience": "Beginner",
  "goals": ["Fat Loss"],
  "equipment": ["Bodyweight"],
  "workoutType": "Cardio",
  "duration": 20
}' 20

# Test 6: HIIT (25 min)
test_scenario "Intermediate HIIT (25 min)" '{
  "experience": "Intermediate",
  "goals": ["Fat Loss", "Endurance"],
  "equipment": ["Bodyweight"],
  "workoutType": "HIIT",
  "duration": 25
}' 25

# Test 7: With injuries
test_scenario "Beginner with Knee Injury (30 min)" '{
  "experience": "Beginner",
  "goals": ["General Health"],
  "equipment": ["Dumbbells"],
  "injuries": {
    "list": ["Knee"],
    "notes": "Avoid deep squats and jumping"
  },
  "workoutType": "Upper Body",
  "duration": 30
}' 30

# Test 8: Guest user (no uid)
test_scenario "Guest User - Intermediate (45 min)" '{
  "experience": "Intermediate",
  "goals": ["Muscle Gain"],
  "equipment": ["Dumbbells", "Barbell"],
  "workoutType": "Chest/Triceps",
  "duration": 45
}' 45

# Test 9: Advanced Yoga (45 min)
test_scenario "Advanced Yoga (45 min)" '{
  "experience": "Advanced",
  "goals": ["Flexibility", "Mindfulness"],
  "equipment": ["Bodyweight"],
  "workoutType": "Yoga",
  "duration": 45
}' 45

# Test 10: Very long workout (120 min)
test_scenario "Advanced Full Body (120 min)" '{
  "experience": "Advanced",
  "goals": ["Muscle Gain", "Strength", "Endurance"],
  "equipment": ["Barbell", "Dumbbells", "Cable Machine", "Leg Press"],
  "workoutType": "Full Body",
  "duration": 120
}' 120

# Summary
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo "Total Tests: $test_count"
echo -e "Passed: ${GREEN}$passed_count${NC}"
echo -e "Failed: ${RED}$failed_count${NC}"

if [ $failed_count -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi

