# car-project  
A basic CRUD project utilizing AWS services

## User stories  

Users can perform the following actions:
1. Add single car in the database
2. Search cars by attribute
3. View all cars
4. Delete single car based on registration plate
5. Update details of single car

## High Level Architecture  

**Users**  
|  
**Cloudfront** (delivering static assets)  
|  
**S3** (hosting static websites)  
|  
**API** Gateway (endpoint for API request)  
|  
**ALB** (routing requests to different instances)  
|  
**ASG** (scaling EC2 instances)  
|  
**EC2** instances (Gunicorn - Flask)  
|  
**RDS** (multi-AZ database deployment)  

### Database schema

Car table: plate (primary key), make, model, year, colour, mileage(km), status (TOTALLED, REPAIR_NEEDED, ACCEPTABLE) 

### Files required

Folder 1: Frontend (html, css, javascript files for S3)  
Folder 2: Backend (ec2_user_data.sh, Flask scripts, deployment script)  
Folder 3: CloudFormation yaml templates  

Deployment order: VPC -> RDS -> Lambda for RDS init -> ELB & API Gateway -> ASG

Routes for API calls:
View all cars -> GET /cars/view_all (no query parameters)
Filter by -> GET /cars (with query parameters e.g. GET /cars?colour=red&year=2004)
Add car -> POST /car (with a JSON body for the parameters and return 201 or 409 for conflict)
Update car -> PATCH /car/{plate} (JSON body with only modified parameters -> return 204 on success, 404 if car not found, 400 if logic is wrong)
Delete car -> DELETE /car/{plate} (without a body and return 204 or 404 if car not found)

{
        "Version": "2008-10-17",
        "Id": "PolicyForCloudFrontPrivateContent",
        "Statement": [
            {
                "Sid": "AllowCloudFrontServicePrincipal",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::car-app-2025-ac92b3f4/*",
                "Condition": {
                    "StringEquals": {
                      "AWS:SourceArn": "arn:aws:cloudfront::495599734937:distribution/E2QT9AHR6RA7J8"
                    }
                }
            }
        ]
      }