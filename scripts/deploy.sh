#!/bin/bash

# 🏢 Agentic Boardroom - Deployment Automation Script
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
LOCK="🔐"

# Configuration
DEPLOYMENT_TIMEOUT=1800  # 30 minutes
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=30

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

print_success() {
    echo -e "${GREEN}${ROCKET} $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking deployment prerequisites..."

    local missing_tools=()

    # Check required tools
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v helm &> /dev/null; then
        missing_tools+=("helm")
    fi

    if ! command -v terraform &> /dev/null; then
        missing_tools+=("terraform")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo -e "  ${RED}- $tool${NC}"
        done
        exit 1
    fi

    print_status "All prerequisites satisfied"
}

# Function to validate environment
validate_environment() {
    local environment=$1

    print_step "Validating environment configuration..."

    # Check environment-specific values file
    if [ ! -f "infrastructure/values-${environment}.yaml" ]; then
        print_error "Environment values file not found: infrastructure/values-${environment}.yaml"
        exit 1
    fi

    # Check required environment variables
    if [ -z "$OPENAI_API_KEY" ] && [ "$environment" != "dev" ]; then
        print_error "OPENAI_API_KEY environment variable is required for $environment environment"
        exit 1
    fi

    print_status "Environment configuration validated"
}

# Function to run pre-deployment checks
pre_deployment_checks() {
    local environment=$1

    print_step "Running pre-deployment checks..."

    # Run tests
    print_info "Running test suite..."
    if ! npm test -- --coverage --watchAll=false; then
        print_error "Tests failed! Aborting deployment."
        exit 1
    fi

    # Run linting
    print_info "Running code quality checks..."
    if ! npm run lint; then
        print_error "Linting failed! Aborting deployment."
        exit 1
    fi

    # Security scan
    print_info "Running security scan..."
    if ! npm run security:check; then
        print_warning "Security issues found! Check the report above."
        if [ "$environment" = "prod" ]; then
            print_error "Security issues prevent production deployment."
            exit 1
        fi
    fi

    # Build application
    print_info "Building application..."
    if ! npm run build; then
        print_error "Build failed! Aborting deployment."
        exit 1
    fi

    print_status "Pre-deployment checks completed"
}

# Function to setup infrastructure
setup_infrastructure() {
    local environment=$1

    print_step "Setting up infrastructure..."

    cd infrastructure

    # Initialize Terraform
    print_info "Initializing Terraform..."
    terraform init -input=false

    # Validate Terraform configuration
    print_info "Validating Terraform configuration..."
    terraform validate

    # Plan infrastructure changes
    print_info "Planning infrastructure changes..."
    terraform plan -var="environment=$environment" -out=tfplan

    # Apply infrastructure changes
    print_info "Applying infrastructure changes..."
    terraform apply -auto-approve tfplan

    cd ..
    print_status "Infrastructure setup completed"
}

# Function to deploy application
deploy_application() {
    local environment=$1

    print_step "Deploying application..."

    # Build Docker image
    print_info "Building Docker image..."
    docker build -t agentic-boardroom:$environment .

    # Push to registry (if not local)
    if [ "$environment" != "dev" ]; then
        print_info "Pushing Docker image to registry..."
        docker tag agentic-boardroom:$environment registry.example.com/agentic-boardroom:$environment
        docker push registry.example.com/agentic-boardroom:$environment
    fi

    # Deploy with Helm
    print_info "Deploying with Helm..."
    helm upgrade --install agentic-boardroom ./helm/agentic-boardroom \
        --namespace agentic-boardroom \
        --values infrastructure/values-common.yaml \
        --values infrastructure/values-$environment.yaml \
        --set image.tag=$environment \
        --set environment=$environment

    print_status "Application deployment completed"
}

# Function to run health checks
run_health_checks() {
    local environment=$1

    print_step "Running health checks..."

    local retries=$HEALTH_CHECK_RETRIES

    while [ $retries -gt 0 ]; do
        print_info "Health check attempt $((HEALTH_CHECK_RETRIES - retries + 1))/$HEALTH_CHECK_RETRIES"

        # Check application health
        if curl -f -s http://agentic-boardroom/health > /dev/null 2>&1; then
            print_status "Application health check passed"
            break
        fi

        retries=$((retries - 1))

        if [ $retries -gt 0 ]; then
            print_warning "Health check failed, retrying in ${HEALTH_CHECK_INTERVAL}s..."
            sleep $HEALTH_CHECK_INTERVAL
        else
            print_error "Health checks failed after $HEALTH_CHECK_RETRIES attempts"
            return 1
        fi
    done

    print_status "Health checks completed successfully"
}

# Function to run post-deployment tests
post_deployment_tests() {
    local environment=$1

    print_step "Running post-deployment tests..."

    # Run smoke tests
    print_info "Running smoke tests..."
    if ! npm run test:integration; then
        print_error "Smoke tests failed!"
        return 1
    fi

    # Run end-to-end tests (if not dev)
    if [ "$environment" != "dev" ]; then
        print_info "Running end-to-end tests..."
        if ! npm run test:e2e; then
            print_error "E2E tests failed!"
            return 1
        fi
    fi

    print_status "Post-deployment tests completed"
}

# Function to setup monitoring
setup_monitoring() {
    local environment=$1

    print_step "Setting up monitoring and alerting..."

    # Deploy monitoring stack
    print_info "Deploying monitoring stack..."
    helm upgrade --install monitoring ./helm/monitoring \
        --namespace monitoring \
        --create-namespace

    # Configure alerts
    print_info "Configuring alerts..."
    kubectl apply -f k8s/alerts.yaml

    print_status "Monitoring setup completed"
}

# Function to send deployment notification
send_notification() {
    local environment=$1
    local status=$2

    print_step "Sending deployment notification..."

    # Create notification payload
    local payload=$(cat <<EOF
{
    "environment": "$environment",
    "status": "$status",
    "timestamp": "$(date -Iseconds)",
    "version": "2.0.0",
    "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "deployed_by": "$(whoami)"
}
EOF
    )

    # Send to configured webhooks
    if [ -n "$SLACK_WEBHOOK" ]; then
        print_info "Sending Slack notification..."
        # Slack notification would go here
    fi

    if [ -n "$TEAMS_WEBHOOK" ]; then
        print_info "Sending Teams notification..."
        # Teams notification would go here
    fi

    print_status "Notifications sent"
}

# Function to rollback deployment
rollback_deployment() {
    local environment=$1

    print_step "Rolling back deployment..."

    print_warning "Initiating rollback to previous version..."

    # Get previous version
    local previous_version=$(helm history agentic-boardroom -n agentic-boardroom --max=5 | grep -E "deployed|superseded" | head -2 | tail -1 | awk '{print $1}')

    if [ -n "$previous_version" ]; then
        print_info "Rolling back to version $previous_version..."
        helm rollback agentic-boardroom $previous_version -n agentic-boardroom

        # Wait for rollback to complete
        sleep 30

        # Run health checks after rollback
        if run_health_checks "$environment"; then
            print_status "Rollback completed successfully"
            send_notification "$environment" "rollback_success"
        else
            print_error "Rollback failed!"
            send_notification "$environment" "rollback_failed"
            exit 1
        fi
    else
        print_error "No previous version found for rollback!"
        exit 1
    fi
}

# Function to cleanup on failure
cleanup_on_failure() {
    local environment=$1

    print_error "Deployment failed! Starting cleanup..."

    # Attempt rollback
    if rollback_deployment "$environment"; then
        print_info "Cleanup completed with rollback"
    else
        print_error "Cleanup failed! Manual intervention required."
    fi
}

# Main deployment function
deploy() {
    local environment=$1
    local skip_checks=${2:-false}

    print_success "Starting deployment to $environment environment"

    # Trap cleanup function
    trap 'cleanup_on_failure "$environment"' ERR

    # Execute deployment steps
    check_prerequisites
    validate_environment "$environment"

    if [ "$skip_checks" = false ]; then
        pre_deployment_checks "$environment"
    else
        print_warning "Skipping pre-deployment checks as requested"
    fi

    setup_infrastructure "$environment"
    deploy_application "$environment"
    setup_monitoring "$environment"

    if run_health_checks "$environment"; then
        post_deployment_tests "$environment"
        print_success "Deployment to $environment completed successfully! 🎉"
        send_notification "$environment" "success"
    else
        print_error "Deployment failed health checks!"
        send_notification "$environment" "failed"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Environments:"
    echo "  dev        Deploy to development environment"
    echo "  staging    Deploy to staging environment"
    echo "  prod       Deploy to production environment"
    echo ""
    echo "Options:"
    echo "  --skip-checks    Skip pre-deployment checks (tests, linting, security)"
    echo "  --rollback       Rollback to previous version"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Deploy to development"
    echo "  $0 staging --skip-checks  # Deploy to staging without checks"
    echo "  $0 prod --rollback        # Rollback production deployment"
}

# Main execution
main() {
    local environment=""
    local skip_checks=false
    local rollback=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|staging|prod)
                environment=$1
                shift
                ;;
            --skip-checks)
                skip_checks=true
                shift
                ;;
            --rollback)
                rollback=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    if [ -z "$environment" ]; then
        print_error "Environment is required"
        show_usage
        exit 1
    fi

    if [ "$rollback" = true ]; then
        rollback_deployment "$environment"
        exit 0
    fi

    deploy "$environment" "$skip_checks"
}

# Run main function
main "$@"

