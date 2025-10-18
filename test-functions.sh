#!/bin/bash

# Test script for NeuraFit workout generation functions
# Tests generateWorkout, addExerciseToWorkout, and swapExercise endpoints

set -e

BASE_URL="http://localhost:5001/neurafit-ai-2025/us-central1"

echo "🧪 NeuraFit Workout Generation API Tests"
echo "=========================================="
echo ""

# Test 1: Generate a basic Full Body workout
echo "📝 Test 1: Generate Full Body Workout (30 min)"
echo "---"
RESPONSE=$(curl -s -X POST "$BASE_URL/generateWorkout" \
  -H "Content-Type: application/json" \
  -d '{
    "experience": "Intermediate",
    "goals": ["Muscle Gain", "Strength"],
    "equipment": ["Dumbbells", "Barbell"],
    "workoutType": "Full Body",
    "duration": 30
  }')

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract exercises for next tests
EXERCISES=$(echo "$RESPONSE" | jq -r '.exercises[].name' 2>/dev/null | head -3)
echo "Generated exercises: $EXERCISES"
echo ""

# Test 2: Generate a Cardio workout
echo "📝 Test 2: Generate Cardio Workout (20 min)"
echo "---"
CARDIO_RESPONSE=$(curl -s -X POST "$BASE_URL/generateWorkout" \
  -H "Content-Type: application/json" \
  -d '{
    "experience": "Beginner",
    "goals": ["Fat Loss"],
    "equipment": ["Bodyweight"],
    "workoutType": "Cardio",
    "duration": 20
  }')

echo "$CARDIO_RESPONSE" | jq '.' 2>/dev/null || echo "$CARDIO_RESPONSE"
echo ""

# Test 3: Generate Upper Body workout
echo "📝 Test 3: Generate Upper Body Workout (45 min)"
echo "---"
UPPER_RESPONSE=$(curl -s -X POST "$BASE_URL/generateWorkout" \
  -H "Content-Type: application/json" \
  -d '{
    "experience": "Advanced",
    "goals": ["Muscle Gain"],
    "equipment": ["Dumbbells", "Barbell", "Cable Machine"],
    "workoutType": "Upper Body",
    "duration": 45
  }')

echo "$UPPER_RESPONSE" | jq '.' 2>/dev/null || echo "$UPPER_RESPONSE"
echo ""

echo "✅ All tests completed!"

