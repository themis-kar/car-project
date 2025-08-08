#!/bin/bash -x

# Ask user what region the application was deployed
read -p "Enter AWS config profile: " PROFILE
read -p "Enter AWS region: " REGION

# Check if region name is valid
VALID_REGION=$(aws ec2 describe-regions --profile "$PROFILE" --query "Regions[].RegionName" --output text | tr '\t' '\n' | grep -w "$REGION")
if [ -z "$VALID_REGION" ]; then
    echo "'$REGION' is not a valid AWS region."
    exit 1
fi
echo "Using region: $REGION"

BUCKET_NAME=$(aws cloudformation describe-stack-resources \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-04-cloudfront \
    --query "StackResources[?LogicalResourceId=='carAppBucket'].PhysicalResourceId" \
    --output text)

# Empty the bucket first
aws s3 rm s3://$BUCKET_NAME --recursive

for stack in carApp-05-api carApp-04-cloudfront carApp-03-asg carApp-02-rds carApp-01-vpc
do 
    echo "Deleting $stack..."
    aws cloudformation delete-stack --profile $PROFILE --region $REGION --stack-name "$stack"
    aws cloudformation wait stack-delete-complete --profile $PROFILE --region $REGION --stack-name "$stack"
    echo "$stack deleted."
done

LAMBDA_LAYER_VERSION=$(aws lambda list-layer-versions --layer-name psycopg2-layer-0x248e --query 'LayerVersions[].Version' --output text)
aws lambda delete-layer-version --layer-name psycopg2-layer-0x248e --version-number $LAMBDA_LAYER_VERSION