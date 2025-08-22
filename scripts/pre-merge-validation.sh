#!/bin/bash

# 🔍 Pre-Merge Validation Script
# Comprehensive checks before merging the management shade tree
# Version: 2.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Status tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

echo -e "${BLUE}🔍 Pre-Merge Validation for Agentic Boardroom v2.0${NC}"
echo -e "${GREEN}Ensuring system readiness before merge${NC}"
echo ""

# Function to run a check
run_check() {
    local check_name="$1"
    local check_command="$2"
    local is_critical="${3:-true}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -ne "${BLUE}[$(printf "%02d" $TOTAL_CHECKS)] ${check_name}...${NC} "
    
    if eval "$check_command" &>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            echo -e "${RED}❌ FAIL${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            echo -e "${YELLOW}⚠️ WARN${NC}"
            WARNINGS=$((WARNINGS + 1))
            return 0
        fi
    fi
}

# 1. File Structure Validation
echo -e "${PURPLE}📁 File Structure Validation${NC}"
run_check "README.md exists" "[ -f README.md ]"
run_check "DEPLOYMENT_GUIDE.md exists" "[ -f DEPLOYMENT_GUIDE.md ]"
run_check "package.json exists" "[ -f package.json ]"
run_check "Environment template exists" "[ -f .env.example ]"
run_check "Quick start script exists" "[ -f scripts/quick-start.sh ]"
run_check "Teams directory structure" "[ -d teams/executive-suite ] && [ -d teams/think-tank ] && [ -d teams/fun-zones ]"
run_check "Overlord configuration exists" "[ -f overlord/master-orchestrator.yaml ]"
run_check "UI dashboard exists" "[ -f ui/dashboard/index.html ]"
echo ""

# 2. Configuration Validation
echo -e "${PURPLE}⚙️ Configuration Validation${NC}"
run_check "All agent configs valid" "find teams/ -name '*.yaml' -exec yamllint {} \; 2>/dev/null"
run_check "Overlord config valid" "yamllint overlord/master-orchestrator.yaml 2>/dev/null"
run_check "Schema config valid" "yamllint schema/agentic-intelligence-tree.yaml 2>/dev/null"
run_check "Infrastructure config valid" "yamllint infrastructure/sustainable-hosting.yaml 2>/dev/null"
run_check "Package.json valid" "npm run validate --silent 2>/dev/null" false
echo ""

# 3. Dependencies Check
echo -e "${PURPLE}📦 Dependencies Check${NC}"
run_check "Node.js dependencies installable" "npm install --dry-run --silent 2>/dev/null"
run_check "No security vulnerabilities" "npm audit --audit-level=high --silent 2>/dev/null" false
run_check "License compliance" "npm ls --silent 2>/dev/null" false
echo ""

# 4. Code Quality
echo -e "${PURPLE}🔍 Code Quality${NC}"
run_check "YAML files lint clean" "find . -name '*.yaml' -exec yamllint {} \; 2>/dev/null"
run_check "Markdown files valid" "find . -name '*.md' -exec markdownlint {} \; 2>/dev/null" false
run_check "JSON files valid" "find . -name '*.json' -exec jq empty {} \; 2>/dev/null"
run_check "Shell scripts executable" "find scripts/ -name '*.sh' -executable | wc -l | grep -q '^[1-9]'"
echo ""

# 5. Security Validation
echo -e "${PURPLE}🔐 Security Validation${NC}"
run_check "No hardcoded secrets" "! grep -r 'password\|secret\|key' --include='*.yaml' --include='*.json' . | grep -v 'example\|template\|placeholder'" false
run_check "Environment variables documented" "grep -q 'API_KEY' .env.example"
run_check "Git ignore properly configured" "[ -f .gitignore ] && grep -q '.env' .gitignore"
echo ""

# 6. Documentation Quality
echo -e "${PURPLE}📚 Documentation Quality${NC}"
run_check "README has installation instructions" "grep -q 'Quick Start\|Installation' README.md"
run_check "Deployment guide comprehensive" "grep -q 'Prerequisites\|Deployment' DEPLOYMENT_GUIDE.md"
run_check "API documentation exists" "grep -q 'API' README.md || grep -q 'API' DEPLOYMENT_GUIDE.md"
run_check "Sustainability features documented" "grep -q 'sustainab\|carbon\|green' README.md"
echo ""

# 7. System Architecture Validation
echo -e "${PURPLE}🏗️ System Architecture Validation${NC}"
run_check "All 10 agents configured" "find teams/ -name '*.yaml' | wc -l | grep -q '^10$'"
run_check "Overlord system complete" "grep -q 'supreme' overlord/master-orchestrator.yaml"
run_check "Decision routing configured" "[ -f orchestration/decision-routing-engine.yaml ]"
run_check "Feedback systems configured" "[ -f feedback-systems/continuous-improvement.yaml ]"
run_check "QA RnD workflow defined" "[ -f qa-rnd/workflow-system.yaml ]"
echo ""

# 8. Deployment Readiness
echo -e "${PURPLE}🚀 Deployment Readiness${NC}"
run_check "Deployment automation configured" "[ -f automation/production-deployment.yaml ]"
run_check "Infrastructure as code ready" "[ -f infrastructure/sustainable-hosting.yaml ]"
run_check "Monitoring configured" "grep -q 'monitoring\|metrics' configs/deployment-config.yaml"
run_check "Health checks defined" "grep -q 'health' automation/production-deployment.yaml"
echo ""

# 9. User Experience
echo -e "${PURPLE}🎨 User Experience${NC}"
run_check "UI dashboard functional" "[ -f ui/dashboard/index.html ] && grep -q 'dashboardApp' ui/dashboard/index.html"
run_check "Quick start script user-friendly" "grep -q 'emoji\|color' scripts/quick-start.sh"
run_check "Help documentation accessible" "grep -q 'help\|support' README.md"
echo ""

# 10. Sustainability Features
echo -e "${PURPLE}🌱 Sustainability Features${NC}"
run_check "Carbon neutral configuration" "grep -q 'carbon.*neutral' infrastructure/sustainable-hosting.yaml"
run_check "Green hosting specified" "grep -q 'renewable.*energy' infrastructure/sustainable-hosting.yaml"
run_check "Sustainability metrics defined" "grep -q 'sustainability.*metrics' feedback-systems/continuous-improvement.yaml"
echo ""

# Generate Summary Report
echo -e "${BLUE}📊 VALIDATION SUMMARY${NC}"
echo "=================================="
echo -e "Total Checks: ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

# Calculate success rate
SUCCESS_RATE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
echo -e "Success Rate: ${GREEN}$SUCCESS_RATE%${NC}"
echo ""

# Final recommendation
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 READY TO MERGE!${NC}"
    echo -e "${GREEN}All critical checks passed. The management shade tree is ready for production.${NC}"
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARNINGS non-critical warnings found. Consider addressing these in a follow-up PR.${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "1. Review and approve the PR"
    echo "2. Merge to main branch"
    echo "3. Deploy to staging for final validation"
    echo "4. Deploy to production"
    echo ""
    echo -e "${GREEN}🌳 Ready to architect sustainable systems and elevate humanity!${NC}"
    
    exit 0
else
    echo -e "${RED}❌ NOT READY TO MERGE${NC}"
    echo -e "${RED}$FAILED_CHECKS critical issues must be resolved before merging.${NC}"
    echo ""
    echo -e "${YELLOW}📋 Action Items:${NC}"
    echo "1. Fix all critical issues listed above"
    echo "2. Re-run this validation script"
    echo "3. Address any warnings if possible"
    echo "4. Update PR with fixes"
    echo ""
    
    exit 1
fi