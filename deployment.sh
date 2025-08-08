#!/bin/bash -x

# Ask user what region they are deploying into
read -p "Enter AWS config profile: " PROFILE
read -p "Enter AWS region: " REGION

# Check if region name is valid
VALID_REGION=$(aws ec2 describe-regions --profile "$PROFILE" --query "Regions[].RegionName" --output text | tr '\t' '\n' | grep -w "$REGION")
if [ -z "$VALID_REGION" ]; then
    echo "'$REGION' is not a valid AWS region."
    exit 1
fi
echo "Using region: $REGION"

# Deploy VPC
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-01-vpc \
    --template-file "cf_templates/carApp_cf01_vpc.yaml"

echo "VPC deployed"

# Deploy RDS instance
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-02-rds \
    --template-file "cf_templates/carApp_cf02_rds.yaml"

echo "Waiting for DB to be ready"
sleep 30

# Publish Lambda Layer and capture output ARN
 LAYER_ARN=$(aws lambda publish-layer-version \
    --profile "$PROFILE" \
    --region "$REGION" \
    --layer-name psycopg2-layer-0x248e \
    --zip-file "fileb://backend/psycopg2-python312-layer.zip" \
    --compatible-runtimes python3.12 \
    --query 'LayerVersionArn' \
    --output text)

# Deploy Lambda script for DB init
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-02a-db-init \
    --template-file "cf_templates/carApp_cf02a_db_init.yaml" \
    --parameter-overrides LambdaLayerArn="$LAYER_ARN" \
    --capabilities CAPABILITY_NAMED_IAM

echo "RDS Instance now initialized"

# Deploy Auto Scaling Groups
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-03-asg \
    --template-file "cf_templates/carApp_cf03_asg.yaml" \
    --capabilities CAPABILITY_NAMED_IAM

echo "Auto Scaling Group deployed"

# Cleanup Lambda
echo "Initiate deletion of lambda used for DB init - may take up to 20 min"
aws cloudformation delete-stack \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-02a-db-init

# Deploy CloudFront distribution and S3 bucket
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-04-cloudfront \
    --template-file "cf_templates/carApp_cf04_s3_cloudfront.yaml"

BUCKET_NAME=$(aws cloudformation describe-stack-resources \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-04-cloudfront \
    --query "StackResources[?LogicalResourceId=='carAppBucket'].PhysicalResourceId" \
    --output text)

echo "Cloudfront distribution and bucket $BUCKET_NAME deployed"

# Deploy API Gateway and ALB
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-05-api \
    --template-file "cf_templates/carApp_cf05_api_alb.yaml"

# Retrieve API Gateway endpoint
API_GW_URL=$(aws cloudformation describe-stacks \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-05-api \
    --query "Stacks[0].Outputs[?OutputKey=='carAppApiEndpoint'].OutputValue" \
    --output text)

# Use the endpoint within Javascript
sed -i "s|<API-GW-URL>|$API_GW_URL|g" frontend/scripts.js

# copy website files to the bucket
aws s3 sync ./frontend/ s3://$BUCKET_NAME/
