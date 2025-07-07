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

# Deploy VPC template
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name VPC-structure \
    --template-file "cf_templates/vpc_template.yaml"

# Publish Lambda Layer and capture output ARN
 LAYER_ARN=$(aws lambda publish-layer-version \
    --profile "$PROFILE" \
    --region "$REGION" \
    --layer-name psycopg2-layer-0x248e \
    --zip-file "fileb://backend/psycopg2-python312-layer.zip" \
    --compatible-runtimes python3.12 \
    --query 'LayerVersionArn' \
    --output text)

# Deploy RDS template
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name RDS-instance \
    --template-file "cf_templates/rds_template.yaml"

sleep 10
# Deploy Lambda script for DB init
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name Lambda-DbInit \
    --template-file "cf_templates/lambda_db_init.yaml" \
    --parameter-overrides LambdaLayerArn="$LAYER_ARN" \
    --capabilities CAPABILITY_NAMED_IAM

# Cleanup Lambda to avoid NAT gateway costs (at the end of the script as it takes time)
sleep 5
aws cloudformation wait stack-delete-complete \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name Lambda-DbInit