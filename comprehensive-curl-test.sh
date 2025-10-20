#!/bin/bash

# Comprehensive test script for NeuraFit workout generation functions
# Tests all workout types, durations, equipment, and user scenarios

set -e

BASE_URL="http://localhost:5001/neurafit-ai-2025/us-central1"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_count=0
passed_count=0
failed_count=0
errors=()

# Function to test a workout generation scenario
test_scenario() {
  local name="$1"
  local payload="$2"
  local expected_duration="$3"
  
  test_count=$((test_count + 1))
  echo -e "\n${BLUE}Test $test_count: $name${NC}"
  echo "Payload: $payload"
  
  local start_time=$(date +%s%N)
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/generateWorkout" \
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
    errors+=("$name: $RESPONSE")
  fi
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}NeuraFit Comprehensive Test Suite${NC}"
echo -e "${YELLOW}========================================${NC}"

# Test 1: Beginner Full Body (15 min)
test_scenario "Beginner Full Body (15 min)" '{
  "experience": "Beginner",
  "goals": ["General Health"],
  "equipment": ["Bodyweight"],
  "workoutType": "Full Body",
  "duration": 15
}' 15

# Test 2: Intermediate Upper Body (30 min)
test_scenario "Intermediate Upper Body (30 min)" '{
  "experience": "Intermediate",
  "goals": ["Muscle Gain", "Strength"],
  "equipment": ["Dumbbells", "Barbell"],
  "workoutType": "Upper Body",
  "duration": 30
}' 30

# Test 3: Advanced Lower Body (45 min)
test_scenario "Advanced Lower Body (45 min)" '{
  "experience": "Advanced",
  "goals": ["Strength", "Power"],
  "equipment": ["Barbell", "Dumbbells"],
  "workoutType": "Lower Body",
  "duration": 45
}' 45

# Test 4: Beginner Cardio (20 min)
test_scenario "Beginner Cardio (20 min)" '{
  "experience": "Beginner",
  "goals": ["Fat Loss"],
  "equipment": ["Bodyweight"],
  "workoutType": "Cardio",
  "duration": 20
}' 20

# Test 5: Intermediate HIIT (25 min)
test_scenario "Intermediate HIIT (25 min)" '{
  "experience": "Intermediate",
  "goals": ["Fat Loss", "Endurance"],
  "equipment": ["Bodyweight"],
  "workoutType": "HIIT",
  "duration": 25
}' 25

# Test 6: Advanced Yoga (45 min)
test_scenario "Advanced Yoga (45 min)" '{
  "experience": "Advanced",
  "goals": ["Flexibility", "Mindfulness"],
  "equipment": ["Bodyweight"],
  "workoutType": "Yoga",
  "duration": 45
}' 45

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

# Test 8: Chest/Triceps (45 min)
test_scenario "Intermediate Chest/Triceps (45 min)" '{
  "experience": "Intermediate",
  "goals": ["Muscle Gain"],
  "equipment": ["Dumbbells", "Barbell"],
  "workoutType": "Chest/Triceps",
  "duration": 45
}' 45

# Test 9: Back/Biceps (45 min)
test_scenario "Intermediate Back/Biceps (45 min)" '{
  "experience": "Intermediate",
  "goals": ["Muscle Gain"],
  "equipment": ["Dumbbells", "Barbell"],
  "workoutType": "Back/Biceps",
  "duration": 45
}' 45

# Test 10: Shoulders (40 min)
test_scenario "Intermediate Shoulders (40 min)" '{
  "experience": "Intermediate",
  "goals": ["Muscle Gain"],
  "equipment": ["Dumbbells", "Barbell"],
  "workoutType": "Shoulders",
  "duration": 40
}' 40

# Summary
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo "Total Tests: $test_count"
echo -e "Passed: ${GREEN}$passed_count${NC}"
echo -e "Failed: ${RED}$failed_count${NC}"

if [ $failed_count -gt 0 ]; then
  echo -e "\n${RED}Failed Tests:${NC}"
  for error in "${errors[@]}"; do
    echo "  - $error"
  done
fi

if [ $failed_count -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi

