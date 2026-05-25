#!/bin/bash

# Healthcheck script for ReleaseHub
# Returns 0 if all checks pass, non-zero otherwise

CHECK_DEPS=false
CHECK_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --deps)
            CHECK_DEPS=true
            shift
            ;;
        --build)
            CHECK_BUILD=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check dependencies
if [ "$CHECK_DEPS" = true ]; then
    if [ ! -d "node_modules" ]; then
        echo "❌ node_modules not found"
        exit 1
    fi
fi

# Check build
if [ "$CHECK_BUILD" = true ]; then
    if [ ! -d "dist" ]; then
        echo "❌ dist directory not found"
        exit 1
    fi
fi

# All checks passed
exit 0
