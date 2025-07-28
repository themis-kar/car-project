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
