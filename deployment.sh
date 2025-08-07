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

sleep 10

echo "RDS Instance deployed"

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
    --parameter-overrides Ec2KeyPair="labKey"

echo "Auto Scaling Group deployed"

# Deploye CloudFront distribution and S3 bucket
aws cloudformation deploy \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-04-cloudfront \
    --template-file "cf_templates/carApp_cf04_s3_cloudfront.yaml"

BUCKET_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name carApp-04-cloudfront \
    --query "Stacks[0].Outputs[?OutputKey=='carAppBucketDomain'].OutputValue"
    --output text)

echo "Cloudfront distribution and bucket at $BUCKET_DOMAIN deployed"

# Cleanup Lambda to avoid NAT gateway costs (at the end of the script as it takes time)
echo "Now deleting lambda used for DB init - may take up to 20 min"
sleep 5
aws cloudformation wait stack-delete-complete \
    --profile "$PROFILE" \
    --region "$REGION" \
    --stack-name carApp-02a-db-init