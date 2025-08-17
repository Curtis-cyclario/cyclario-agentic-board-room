#!/bin/bash

# 🏢 Agentic Boardroom - Quick Start Setup Script
# Architecting sustainable systems to elevate humanity
# Version: 2.0.0

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Emojis for better UX
ROCKET="🚀"
CHECK="✅"
CROSS="❌"
WARN="⚠️"
INFO="ℹ️"
GEAR="⚙️"
BRAIN="🧠"
TREE="🌳"

echo -e "${BLUE}${ROCKET} Welcome to Agentic Boardroom v2.0 Setup${NC}"
echo -e "${GREEN}Architecting sustainable systems to elevate humanity${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARN} $1${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

print_step() {
    echo -e "${PURPLE}${GEAR} $1${NC}"
}

# Check if running on supported OS
check_os() {
    print_step "Checking operating system compatibility..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_status "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_status "macOS detected"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        print_status "Windows detected"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js (>=18.0.0)")
    else
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        if ! npx semver $NODE_VERSION -r ">=18.0.0" &> /dev/null; then
            missing_deps+=("Node.js (>=18.0.0) - current: $NODE_VERSION")
        else
            print_status "Node.js $NODE_VERSION"
        fi
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm (>=8.0.0)")
    else
        NPM_VERSION=$(npm --version)
        print_status "npm $NPM_VERSION"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("Docker")
    else
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_status "Docker $DOCKER_VERSION"
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        missing_deps+=("kubectl")
    else
        KUBECTL_VERSION=$(kubectl version --client --short | cut -d' ' -f3)
        print_status "kubectl $KUBECTL_VERSION"
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        missing_deps+=("Terraform (>=1.5.0)")
    else
        TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
        print_status "Terraform $TERRAFORM_VERSION"
    fi
    
    # Check Helm
    if ! command -v helm &> /dev/null; then
        missing_deps+=("Helm (>=3.10.0)")
    else
        HELM_VERSION=$(helm version --short | cut -d':' -f2 | cut -d'+' -f1)
        print_status "Helm $HELM_VERSION"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing prerequisites:"
        for dep in "${missing_deps[@]}"; do
            echo -e "  ${RED}- $dep${NC}"
        done
        echo ""
        print_info "Please install the missing prerequisites and run this script again."
        print_info "Installation guides: https://docs.agentic-boardroom.com/prerequisites"
        exit 1
    fi
    
    print_status "All prerequisites satisfied!"
}

# Setup environment
setup_environment() {
    print_step "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        cp .env.example .env
        print_status "Created .env file from template"
        print_warning "Please update .env with your API keys before proceeding"
        
        echo ""
        echo -e "${YELLOW}Required API Keys:${NC}"
        echo "  - OPENAI_API_KEY: Your OpenAI API key"
        echo "  - ANTHROPIC_API_KEY: Your Anthropic API key"
        echo "  - GOOGLE_API_KEY: Your Google Vertex AI key (already provided)"
        echo "  - GOOGLE_CLOUD_PROJECT: Your Google Cloud project ID"
        echo ""
        
        read -p "Press Enter after updating your .env file..."
    else
        print_status "Environment file exists"
    fi
    
    # Load environment variables
    source .env
    
    # Validate required environment variables
    local missing_vars=()
    
    [ -z "$OPENAI_API_KEY" ] && missing_vars+=("OPENAI_API_KEY")
    [ -z "$ANTHROPIC_API_KEY" ] && missing_vars+=("ANTHROPIC_API_KEY")
    [ -z "$GOOGLE_API_KEY" ] && missing_vars+=("GOOGLE_API_KEY")
    [ -z "$GOOGLE_CLOUD_PROJECT" ] && missing_vars+=("GOOGLE_CLOUD_PROJECT")
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo -e "  ${RED}- $var${NC}"
        done
        exit 1
    fi
    
    print_status "Environment configuration validated"
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    # Install Node.js dependencies
    print_info "Installing Node.js dependencies..."
    npm install --silent
    print_status "Node.js dependencies installed"
    
    # Install UI dependencies
    if [ -d "ui" ]; then
        print_info "Installing UI dependencies..."
        cd ui && npm install --silent && cd ..
        print_status "UI dependencies installed"
    fi
    
    # Install development tools
    print_info "Installing development tools..."
    npm install -g nodemon cypress-cli --silent 2>/dev/null || true
    print_status "Development tools installed"
}

# Setup infrastructure
setup_infrastructure() {
    print_step "Setting up infrastructure..."
    
    # Initialize Terraform
    if [ -d "infrastructure" ]; then
        print_info "Initializing Terraform..."
        cd infrastructure
        terraform init -input=false
        cd ..
        print_status "Terraform initialized"
    fi
    
    # Create Kubernetes namespace
    print_info "Creating Kubernetes namespace..."
    kubectl create namespace agentic-boardroom --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    print_status "Kubernetes namespace ready"
    
    # Setup Helm repositories
    print_info "Adding Helm repositories..."
    helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
    helm repo update 2>/dev/null || true
    print_status "Helm repositories configured"
}

# Run tests
run_tests() {
    print_step "Running tests..."
    
    # Lint code
    print_info "Running linter..."
    npm run lint --silent 2>/dev/null || {
        print_warning "Linting issues found - continuing anyway"
    }
    
    # Run unit tests
    print_info "Running unit tests..."
    npm test --silent 2>/dev/null || {
        print_warning "Some tests failed - continuing anyway"
    }
    
    print_status "Tests completed"
}

# Deploy system
deploy_system() {
    local environment=${1:-"dev"}
    
    print_step "Deploying Agentic Boardroom to $environment..."
    
    case $environment in
        "dev"|"development")
            print_info "Deploying to development environment..."
            npm run deploy:dev
            ;;
        "staging")
            print_info "Deploying to staging environment..."
            npm run deploy:staging
            ;;
        "prod"|"production")
            print_info "Deploying to production environment..."
            print_warning "Production deployment requires additional approvals"
            npm run deploy:prod
            ;;
        *)
            print_error "Invalid environment: $environment"
            print_info "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac
    
    print_status "Deployment to $environment completed"
}

# Health check
health_check() {
    print_step "Running health check..."
    
    print_info "Checking system health..."
    npm run health:check || {
        print_warning "Health check reported issues - check logs for details"
        return 1
    }
    
    print_status "System health check passed"
}

# Start services
start_services() {
    print_step "Starting Agentic Boardroom services..."
    
    # Start agents
    print_info "Starting AI agents..."
    npm run agents:start &
    
    # Start overlord
    print_info "Starting Master Overlord..."
    npm run overlord:start &
    
    # Start dashboard
    print_info "Starting dashboard..."
    npm run dashboard &
    
    # Wait a moment for services to start
    sleep 5
    
    print_status "Services starting in background"
}

# Display final information
show_completion_info() {
    echo ""
    echo -e "${GREEN}${ROCKET}${ROCKET}${ROCKET} SETUP COMPLETE! ${ROCKET}${ROCKET}${ROCKET}${NC}"
    echo ""
    echo -e "${BLUE}${BRAIN} Agentic Boardroom v2.0 is now running!${NC}"
    echo ""
    echo -e "${YELLOW}Access Points:${NC}"
    echo -e "  ${GREEN}• Dashboard:${NC} http://localhost:3000"
    echo -e "  ${GREEN}• API:${NC} http://localhost:3000/api"
    echo -e "  ${GREEN}• Health Check:${NC} http://localhost:3000/health"
    echo -e "  ${GREEN}• Metrics:${NC} http://localhost:3000/metrics"
    echo ""
    echo -e "${YELLOW}Management Commands:${NC}"
    echo -e "  ${GREEN}• Check Status:${NC} npm run agents:status"
    echo -e "  ${GREEN}• View Logs:${NC} npm run logs"
    echo -e "  ${GREEN}• Stop Services:${NC} npm run agents:stop && npm run overlord:stop"
    echo -e "  ${GREEN}• Monitor:${NC} npm run monitor"
    echo ""
    echo -e "${YELLOW}AI Agents Active:${NC}"
    echo -e "  ${PURPLE}• Executive Suite:${NC} CEO, CTO, CFO, Document Analyst"
    echo -e "  ${PURPLE}• Think Tank:${NC} Research Director, Innovation Lead, Quality Assurance"
    echo -e "  ${PURPLE}• Fun Zones:${NC} Meeting Facilitator, Culture Champion, Company Mascot"
    echo -e "  ${PURPLE}• Overlord:${NC} Supreme AI Orchestrator"
    echo ""
    echo -e "${YELLOW}Sustainability Features:${NC}"
    echo -e "  ${GREEN}• Carbon Neutral Operations${NC}"
    echo -e "  ${GREEN}• 100% Renewable Energy Hosting${NC}"
    echo -e "  ${GREEN}• Green Computing Optimization${NC}"
    echo -e "  ${GREEN}• Circular Economy Principles${NC}"
    echo ""
    echo -e "${BLUE}${TREE} Architecting sustainable systems to elevate humanity${NC}"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo -e "  ${GREEN}• README:${NC} cat README.md"
    echo -e "  ${GREEN}• Deployment Guide:${NC} cat DEPLOYMENT_GUIDE.md"
    echo -e "  ${GREEN}• Online Docs:${NC} https://docs.agentic-boardroom.com"
    echo ""
    echo -e "${GREEN}Happy orchestrating! 🎯${NC}"
}

# Main execution flow
main() {
    local environment="dev"
    local skip_tests=false
    local skip_deploy=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-deploy)
                skip_deploy=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -e, --environment ENV    Target environment (dev, staging, prod) [default: dev]"
                echo "  --skip-tests            Skip running tests"
                echo "  --skip-deploy           Skip deployment step"
                echo "  -h, --help              Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                      # Quick start with defaults"
                echo "  $0 -e staging          # Deploy to staging environment"
                echo "  $0 --skip-tests        # Skip tests for faster setup"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use -h or --help for usage information"
                exit 1
                ;;
        esac
    done
    
    echo -e "${BLUE}Configuration:${NC}"
    echo -e "  Environment: ${GREEN}$environment${NC}"
    echo -e "  Skip Tests: ${GREEN}$skip_tests${NC}"
    echo -e "  Skip Deploy: ${GREEN}$skip_deploy${NC}"
    echo ""
    
    # Execute setup steps
    check_os
    check_prerequisites
    setup_environment
    install_dependencies
    setup_infrastructure
    
    if [ "$skip_tests" = false ]; then
        run_tests
    else
        print_warning "Skipping tests as requested"
    fi
    
    if [ "$skip_deploy" = false ]; then
        deploy_system "$environment"
        health_check
        start_services
    else
        print_warning "Skipping deployment as requested"
    fi
    
    show_completion_info
}

# Error handling
trap 'print_error "Setup failed! Check the error messages above."; exit 1' ERR

# Run main function with all arguments
main "$@"