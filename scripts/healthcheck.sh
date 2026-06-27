#!/bin/bash

# Healthcheck script for ReleaseHub
# Returns 0 if all checks pass, non-zero otherwise

CHECK_DEPS=false
CHECK_BUILD=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()    { echo -e "${GREEN}✅ $1${NC}"; }
log_fail()  { echo -e "${RED}❌ $1${NC}"; }
log_warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }

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
            # Silently ignore unknown options (for forward compat)
            shift
            ;;
    esac
done

EXIT_CODE=0

# 1. Check Node.js
if ! command -v node &>/dev/null; then
    log_fail "Node.js is not installed or not in PATH"
    EXIT_CODE=1
else
    NODE_VERSION=$(node --version 2>/dev/null)
    log_ok "Node.js found: $NODE_VERSION"
fi

# 2. Check npm
if ! command -v npm &>/dev/null; then
    log_fail "npm is not installed or not in PATH"
    EXIT_CODE=1
else
    NPM_VERSION=$(npm --version 2>/dev/null)
    log_ok "npm found: $NPM_VERSION"
fi

# 3. Check git (optional but recommended)
if ! command -v git &>/dev/null; then
    log_warn "git is not installed (optional, needed for auto-updates)"
else
    log_ok "git found: $(git --version 2>/dev/null)"
fi

# 4. Check dependencies (deep validation)
if [ "$CHECK_DEPS" = true ]; then
    if [ ! -d "node_modules" ]; then
        log_fail "node_modules directory not found"
        EXIT_CODE=1
    elif [ ! -f "node_modules/.package-lock.json" ]; then
        log_fail "node_modules/.package-lock.json not found (incomplete install)"
        EXIT_CODE=1
    else
        log_ok "node_modules present and valid"
    fi
fi

# 5. Check build (deep validation)
if [ "$CHECK_BUILD" = true ]; then
    if [ ! -d "dist" ]; then
        log_fail "dist directory not found"
        EXIT_CODE=1
    elif [ ! -f "dist/index.html" ]; then
        log_fail "dist/index.html not found (incomplete build)"
        EXIT_CODE=1
    else
        log_ok "dist directory present and valid"
    fi
fi

exit $EXIT_CODE
