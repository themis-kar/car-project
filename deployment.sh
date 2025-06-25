#!/bin/bash -xe

# Ask user what region they are deploying into
read -p "Enter AWS region: " REGION

# Check if region name is valid
VALID_REGION=$(aws ec2 describe-regions --query "Regions[].RegionName" --output text | tr '\t' '\n' | grep -w "$REGION")
if [ -z "$VALID_REGION" ]; then
    echo "'$REGION' is not a valid AWS region."
    exit 1
else
    echo "Using region: $REGION"
    # Now you can use $REGION in your AWS CLI commands
    # Example:
    # aws cloudformation deploy --region "$REGION" ...
fi
# Deploy VPC template (AWS CLI)

# Publish Lambda Layer and capture output ARN (AWS CLI)
# Deploy RDS template and pass Lambda Layer ARN (AWS CLI)