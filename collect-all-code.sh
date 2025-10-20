#!/bin/bash

# Script to collect all front and backend coding files into a single file
# Output file will be created in the project root

OUTPUT_FILE="all-code-files.txt"
PROJECT_ROOT="/Users/salscrudato/Projects/neurafit"

# Remove existing output file if it exists
rm -f "$PROJECT_ROOT/$OUTPUT_FILE"

# Function to add file to output
add_file_to_output() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        {
            echo "================================================================================"
            echo "FILE: $file_path"
            echo "================================================================================"
            cat "$file_path"
            echo ""
            echo ""
        } >> "$PROJECT_ROOT/$OUTPUT_FILE"
    fi
}

# Function to recursively find and add files with specific extensions
process_directory() {
    local dir="$1"
    local extensions="$2"
    
    if [ -d "$dir" ]; then
        while IFS= read -r file; do
            add_file_to_output "$file"
        done < <(find "$dir" -type f \( $extensions \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.git/*" 2>/dev/null)
    fi
}

echo "Collecting all coding files..."
echo "Output will be saved to: $PROJECT_ROOT/$OUTPUT_FILE"
echo ""

# Frontend source files
echo "Processing frontend source files..."
process_directory "$PROJECT_ROOT/src" "-name '*.tsx' -o -name '*.ts' -o -name '*.css' -o -name '*.json'"

# Backend functions
echo "Processing backend functions..."
process_directory "$PROJECT_ROOT/functions/src" "-name '*.ts' -o -name '*.js' -o -name '*.json'"

# Configuration files
echo "Processing configuration files..."
add_file_to_output "$PROJECT_ROOT/package.json"
add_file_to_output "$PROJECT_ROOT/tsconfig.json"
add_file_to_output "$PROJECT_ROOT/tsconfig.app.json"
add_file_to_output "$PROJECT_ROOT/tsconfig.node.json"
add_file_to_output "$PROJECT_ROOT/vite.config.ts"
add_file_to_output "$PROJECT_ROOT/vitest.config.ts"
add_file_to_output "$PROJECT_ROOT/eslint.config.js"
add_file_to_output "$PROJECT_ROOT/firebase.json"
add_file_to_output "$PROJECT_ROOT/firestore.rules"
add_file_to_output "$PROJECT_ROOT/firestore.indexes.json"
add_file_to_output "$PROJECT_ROOT/functions/package.json"
add_file_to_output "$PROJECT_ROOT/functions/tsconfig.json"
add_file_to_output "$PROJECT_ROOT/functions/vitest.config.ts"
add_file_to_output "$PROJECT_ROOT/functions/eslint.config.js"

# Script files
echo "Processing script files..."
add_file_to_output "$PROJECT_ROOT/index.html"
add_file_to_output "$PROJECT_ROOT/scripts/build-sw.js"
add_file_to_output "$PROJECT_ROOT/scripts/check-bundle-size.js"
add_file_to_output "$PROJECT_ROOT/scripts/clear-all-caches.js"
add_file_to_output "$PROJECT_ROOT/scripts/deploy.js"
add_file_to_output "$PROJECT_ROOT/scripts/update-manifest-version.js"

echo "✓ Collection complete!"
echo "Total lines in output file: $(wc -l < "$PROJECT_ROOT/$OUTPUT_FILE")"
echo "File size: $(du -h "$PROJECT_ROOT/$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Output saved to: $PROJECT_ROOT/$OUTPUT_FILE"

