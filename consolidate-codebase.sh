#!/bin/bash

# NeuraFit Codebase Consolidation Script
# This script consolidates all frontend and backend code into a single text file

OUTPUT_FILE="neurafit-codebase.txt"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "========================================" > "$OUTPUT_FILE"
echo "NEURAFIT CODEBASE CONSOLIDATION" >> "$OUTPUT_FILE"
echo "Generated: $TIMESTAMP" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "📦 Consolidating NeuraFit codebase..."

# Function to add a file to the output
add_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo "" >> "$OUTPUT_FILE"
        echo "========================================" >> "$OUTPUT_FILE"
        echo "FILE: $file" >> "$OUTPUT_FILE"
        echo "========================================" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# Add Table of Contents
echo "========================================" >> "$OUTPUT_FILE"
echo "TABLE OF CONTENTS" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "FRONTEND CODE (src/)" >> "$OUTPUT_FILE"
echo "  - Main Application Files" >> "$OUTPUT_FILE"
echo "  - Components" >> "$OUTPUT_FILE"
echo "  - Pages" >> "$OUTPUT_FILE"
echo "  - Design System" >> "$OUTPUT_FILE"
echo "  - Hooks" >> "$OUTPUT_FILE"
echo "  - Libraries & Utilities" >> "$OUTPUT_FILE"
echo "  - Configuration" >> "$OUTPUT_FILE"
echo "  - Types" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "BACKEND CODE (functions/src/)" >> "$OUTPUT_FILE"
echo "  - Cloud Functions" >> "$OUTPUT_FILE"
echo "  - Libraries & Utilities" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "CONFIGURATION FILES" >> "$OUTPUT_FILE"
echo "  - TypeScript Configuration" >> "$OUTPUT_FILE"
echo "  - Build Configuration" >> "$OUTPUT_FILE"
echo "  - Firebase Configuration" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# ========================================
# FRONTEND CODE
# ========================================

echo "========================================" >> "$OUTPUT_FILE"
echo "SECTION 1: FRONTEND CODE" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"

# Main Application Files
echo "Adding main application files..."
add_file "src/main.tsx"
add_file "src/App.tsx"
add_file "src/index.css"

# Components
echo "Adding components..."
for file in src/components/*.tsx; do
    add_file "$file"
done

# Pages
echo "Adding pages..."
for file in src/pages/*.tsx; do
    add_file "$file"
done

# Workout Pages
echo "Adding workout pages..."
for file in src/pages/workout/*.tsx; do
    add_file "$file"
done

# Design System
echo "Adding design system..."
for file in src/design-system/components/*.tsx; do
    add_file "$file"
done
for file in src/design-system/variants/*.ts; do
    add_file "$file"
done
add_file "src/design-system/tokens.ts"

# Hooks
echo "Adding hooks..."
for file in src/hooks/*.ts src/hooks/*.tsx; do
    add_file "$file"
done

# Libraries
echo "Adding libraries..."
for file in src/lib/*.ts; do
    add_file "$file"
done

# Providers
echo "Adding providers..."
for file in src/providers/*.ts src/providers/*.tsx; do
    add_file "$file"
done

# Routes
echo "Adding routes..."
for file in src/routes/*.tsx; do
    add_file "$file"
done

# Store
echo "Adding store..."
for file in src/store/*.ts; do
    add_file "$file"
done

# Session
echo "Adding session..."
for file in src/session/*.ts; do
    add_file "$file"
done

# Configuration
echo "Adding configuration..."
for file in src/config/*.ts; do
    add_file "$file"
done

# Types
echo "Adding types..."
for file in src/types/*.ts src/types/*.d.ts; do
    add_file "$file"
done

# Utils
echo "Adding utils..."
for file in src/utils/*.ts; do
    add_file "$file"
done

# ========================================
# BACKEND CODE
# ========================================

echo "========================================" >> "$OUTPUT_FILE"
echo "SECTION 2: BACKEND CODE" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"

# Cloud Functions
echo "Adding cloud functions..."
add_file "functions/src/index.ts"
add_file "functions/src/stripe-webhooks.ts"
add_file "functions/src/subscription-functions.ts"

# Function Libraries
echo "Adding function libraries..."
for file in functions/src/lib/*.ts; do
    add_file "$file"
done

# ========================================
# CONFIGURATION FILES
# ========================================

echo "========================================" >> "$OUTPUT_FILE"
echo "SECTION 3: CONFIGURATION FILES" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"

echo "Adding configuration files..."
add_file "package.json"
add_file "tsconfig.json"
add_file "tsconfig.app.json"
add_file "tsconfig.node.json"
add_file "vite.config.ts"
add_file "firebase.json"
add_file "firestore.rules"
add_file "firestore.indexes.json"
add_file "functions/package.json"
add_file "functions/tsconfig.json"
add_file "index.html"

# ========================================
# SUMMARY
# ========================================

echo "========================================" >> "$OUTPUT_FILE"
echo "END OF CODEBASE" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"

# Count files and lines
TOTAL_FILES=$(grep -c "^FILE: " "$OUTPUT_FILE")
TOTAL_LINES=$(wc -l < "$OUTPUT_FILE")

echo "" >> "$OUTPUT_FILE"
echo "Statistics:" >> "$OUTPUT_FILE"
echo "  Total Files: $TOTAL_FILES" >> "$OUTPUT_FILE"
echo "  Total Lines: $TOTAL_LINES" >> "$OUTPUT_FILE"
echo "  Generated: $TIMESTAMP" >> "$OUTPUT_FILE"

echo "✅ Consolidation complete!"
echo "📄 Output file: $OUTPUT_FILE"
echo "📊 Total files: $TOTAL_FILES"
echo "📊 Total lines: $TOTAL_LINES"

