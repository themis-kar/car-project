# car-project
A basic CRUD project utilizing AWS services

--- Car Website ---

Users are presented with a front end website of a car database
Allowed user actions:
1. Add single car in the database
2. Search cars by attribute
3. View all cars
4. Delete single car based on registration plate
5. Update details of single car

--- Draft Architecture ---

Users
|
S3 (hosting static websites)
|
API Gateway (catching each request)
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

Folder 1: html, css, javascript files for S3
Folder 2: python scripts for Flask, launch shell scripts
Folder 3: CloudFormation yaml templates (S3 & API Gateway, VPC, ELB & ASG, RDS)
