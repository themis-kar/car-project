# car-project
A basic CRUD project utilizing AWS services

--- Car Website ---

Users can perform the following actions:
1. Add single car in the database
2. Search cars by attribute
3. View all cars
4. Delete single car based on registration plate
5. Update details of single car

--- Draft Architecture ---

Users
|
Cloudfront (delivering static assets)
|
S3 (hosting static websites)
|
API Gateway (endpoint for API request)
|
ALB (routing requests to different instances)
|
ASG (scaling EC2 instances)
|
EC2 instances (Gunicorn - Flask)
|
RDS (multi-AZ database deployment)

--- Database schema ---

Car table: Registration Plate (primary key), Manufacturer, Model, Year, Colour, Mileage

--- Files required ---

Folder 1: Frontend (html, css, javascript files for S3)
Folder 2: Backend (python scripts for Flask, configuration shell scripts)
Folder 3: CloudFormation yaml templates
