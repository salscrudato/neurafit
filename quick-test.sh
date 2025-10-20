#!/bin/bash

# Quick test for NeuraFit workout generation

BASE_URL="http://localhost:5001/neurafit-ai-2025/us-central1"

echo "Testing generateWorkout endpoint..."
echo ""

# Test 1: Beginner Full Body
echo "Test 1: Beginner Full Body (15 min)"
RESPONSE=$(curl -s -X POST "$BASE_URL/generateWorkout" \
  -H "Content-Type: application/json" \
  -d '{
    "experience": "Beginner",
    "goals": ["General Health"],
    "equipment": ["Bodyweight"],
    "workoutType": "Full Body",
    "duration": 15
  }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo "---"
echo ""

# Test 2: Intermediate Upper Body
echo "Test 2: Intermediate Upper Body (30 min)"
RESPONSE=$(curl -s -X POST "$BASE_URL/generateWorkout" \
  -H "Content-Type: application/json" \
  -d '{
    "experience": "Intermediate",
    "goals": ["Muscle Gain", "Strength"],
    "equipment": ["Dumbbells", "Barbell"],
    "workoutType": "Upper Body",
    "duration": 30
  }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo "---"
echo ""

# Test 3: Beginner Cardio
echo "Test 3: Beginner Cardio (20 min)"
RESPONSE=$(curl -s -X POST "$BASE_URL/generateWorkout" \
  -H "Content-Type: application/json" \
  -d '{
    "experience": "Beginner",
    "goals": ["Fat Loss"],
    "equipment": ["Bodyweight"],
    "workoutType": "Cardio",
    "duration": 20
  }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

