#!/bin/bash

# =============================================================================
# Deploy Docker Image to AWS ECR
# =============================================================================

set -e  # Exit on error

# Configuration (matches Terraform variables.tf defaults)
PROJECT_NAME="${PROJECT_NAME:-exchange-layer}"
AWS_REGION="${AWS_REGION:-eu-central-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
IMAGE_TAG="${1:-latest}"  # Use first argument or default to "latest"

# Try to get ECR URL from Terraform outputs (if available)
TERRAFORM_DIR="${TERRAFORM_DIR:-./infra}"
if [ -d "${TERRAFORM_DIR}" ] && command -v terraform &> /dev/null; then
  echo "Attempting to get ECR URL from Terraform outputs..."
  cd "${TERRAFORM_DIR}"
  ECR_REPOSITORY_URL=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")
  cd - > /dev/null
  
  if [ -n "${ECR_REPOSITORY_URL}" ]; then
    echo "✅ Found ECR URL from Terraform: ${ECR_REPOSITORY_URL}"
  else
    echo "⚠️  Could not get ECR URL from Terraform, constructing from AWS account..."
    # Fallback: construct ECR URL
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REPOSITORY_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}"
  fi
else
  # Fallback: construct ECR URL
  echo "Constructing ECR URL from AWS account..."
  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  ECR_REPOSITORY_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}"
fi

# Verify ECR repository exists
echo "Verifying ECR repository exists..."
if ! aws ecr describe-repositories --repository-names "${PROJECT_NAME}" --region "${AWS_REGION}" &> /dev/null; then
  echo "❌ Error: ECR repository '${PROJECT_NAME}' does not exist in region ${AWS_REGION}"
  echo "   Please create it first using Terraform:"
  echo "   cd ${TERRAFORM_DIR} && terraform apply"
  exit 1
fi

echo "=========================================="
echo "Building and Pushing Docker Image"
echo "=========================================="
echo "Project: ${PROJECT_NAME}"
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${AWS_REGION}"
echo "ECR URL: ${ECR_REPOSITORY_URL}"
echo "Tag: ${IMAGE_TAG}"
echo "=========================================="
echo ""

# Step 1: Authenticate Docker with ECR
echo "Step 1: Authenticating with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_REPOSITORY_URL}

# Step 2: Build the Docker image for linux/amd64 (required for ECS Fargate)
echo ""
echo "Step 2: Building Docker image for linux/amd64 platform..."
docker build --platform linux/amd64 -t ${PROJECT_NAME}:${IMAGE_TAG} .

# Step 3: Tag the image for ECR
echo ""
echo "Step 3: Tagging image for ECR..."
docker tag ${PROJECT_NAME}:${IMAGE_TAG} ${ECR_REPOSITORY_URL}:${IMAGE_TAG}

# Step 4: Push the image to ECR
echo ""
echo "Step 4: Pushing image to ECR..."
docker push ${ECR_REPOSITORY_URL}:${IMAGE_TAG}

echo ""
echo "=========================================="
echo "✅ Successfully pushed to ECR!"
echo "=========================================="
echo "Image: ${ECR_REPOSITORY_URL}:${IMAGE_TAG}"
echo ""

# Step 5: Run database migrations via ECS task
CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
MIGRATION_TASK_FAMILY="${PROJECT_NAME}-${ENVIRONMENT}-migration"

if [ "${SKIP_MIGRATION}" != "true" ]; then
  echo "Step 5: Running database migrations..."

  PRIVATE_SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=*${PROJECT_NAME}*private*" \
    --query "Subnets[].SubnetId" \
    --output text \
    --region ${AWS_REGION} | tr '\t' ',')

  ECS_SG=$(aws ec2 describe-security-groups \
    --filters "Name=tag:Name,Values=*${PROJECT_NAME}*ecs*" \
    --query "SecurityGroups[0].GroupId" \
    --output text \
    --region ${AWS_REGION})

  if [ -z "${PRIVATE_SUBNETS}" ] || [ -z "${ECS_SG}" ] || [ "${ECS_SG}" = "None" ]; then
    echo "❌ Could not find subnets or security group. Run migration manually:"
    echo "   aws ecs run-task --cluster ${CLUSTER_NAME} --task-definition ${MIGRATION_TASK_FAMILY} --launch-type FARGATE --network-configuration \"awsvpcConfiguration={subnets=[SUBNET_IDS],securityGroups=[SG_ID],assignPublicIp=DISABLED}\""
  else
    echo "   Cluster: ${CLUSTER_NAME}"
    echo "   Task:    ${MIGRATION_TASK_FAMILY}"
    echo "   Subnets: ${PRIVATE_SUBNETS}"
    echo "   SG:      ${ECS_SG}"

    TASK_ARN=$(aws ecs run-task \
      --cluster ${CLUSTER_NAME} \
      --task-definition ${MIGRATION_TASK_FAMILY} \
      --launch-type FARGATE \
      --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNETS}],securityGroups=[${ECS_SG}],assignPublicIp=DISABLED}" \
      --region ${AWS_REGION} \
      --query "tasks[0].taskArn" \
      --output text \
      --no-cli-pager)

    if [ -z "${TASK_ARN}" ] || [ "${TASK_ARN}" = "None" ]; then
      echo "❌ Failed to start migration task"
      exit 1
    fi

    TASK_ID=$(echo ${TASK_ARN} | awk -F'/' '{print $NF}')
    echo "   Task ID: ${TASK_ID}"
    echo "   Waiting for migration to complete..."

    aws ecs wait tasks-stopped \
      --cluster ${CLUSTER_NAME} \
      --tasks ${TASK_ARN} \
      --region ${AWS_REGION}

    EXIT_CODE=$(aws ecs describe-tasks \
      --cluster ${CLUSTER_NAME} \
      --tasks ${TASK_ARN} \
      --query "tasks[0].containers[0].exitCode" \
      --output text \
      --region ${AWS_REGION})

    if [ "${EXIT_CODE}" = "0" ]; then
      echo "✅ Database migration completed successfully!"
    else
      echo "❌ Migration failed with exit code: ${EXIT_CODE}"
      echo "   Check logs: aws logs tail /ecs/${PROJECT_NAME}-${ENVIRONMENT}-migration --follow --region ${AWS_REGION}"
      exit 1
    fi
  fi
else
  echo "Step 5: Skipping migrations (SKIP_MIGRATION=true)"
fi

# Step 6: Force new deployment
echo ""
echo "Step 6: Deploying to ECS..."
aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${PROJECT_NAME}-${ENVIRONMENT}-service \
  --force-new-deployment \
  --region ${AWS_REGION} \
  --no-cli-pager > /dev/null

echo ""
echo "=========================================="
echo "✅ Deployment complete!"
echo "=========================================="
echo "API: https://dev.coalition-x-exchange.com"
echo "Migration logs: aws logs tail /ecs/${PROJECT_NAME}-${ENVIRONMENT}-migration --follow --region ${AWS_REGION}"
echo ""
