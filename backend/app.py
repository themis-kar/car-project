from flask import Flask, request, jsonify
import psycopg2
import boto3
import json
import time
import fcntl
from os import getenv

TOKEN_CACHE = "iam_db_auth_token.json"
REFRESH_THRESHOLD = 120 # refresh token if < 2 mins left
TOKEN_VALIDITY = 15*60 # 15 min validity for token

def get_iam_auth_token_from_file():
    now = int(time.time())
    # Check if file exists and retrieve existing token
    try:
        with open(TOKEN_CACHE, "r") as f:
            fcntl.flock(f, fcntl.LOCK_SH)  # shared lock for read
            data = json.load(f)
            fcntl.flock(f, fcntl.LOCK_UN)
    except (FileNotFoundError, json.JSONDecodeError):
        data = None
    # Check if data was retrieved and token not close to expiry
    if data and (int(data["expires_at"]) - now) > REFRESH_THRESHOLD:
            return data["token"]
    # Generate new token
    rds = boto3.client('rds', region_name=getenv('REGION'))
    token = rds.generate_db_auth_token(DBHostname=getenv('DB_ENDPOINT'), Port=5432, DBUsername='db_iam_user')
    # Write new token to file
    expires_at = now + TOKEN_VALIDITY
    with open(TOKEN_CACHE, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)  # exclusive lock for write
        json.dump({"token": token, "expires_at": expires_at}, f)
        fcntl.flock(f, fcntl.LOCK_UN)
    return token
    
def rds_connect():
    # Connect to database
    try:
        token = get_iam_auth_token_from_file()
        return psycopg2.connect(
            host=getenv('DB_ENDPOINT'),
            port=5432,
            dbname='postgres',
            user='db_iam_user',
            password=token,
            sslmode='verify-ca',
            sslrootcert='rds_cert.pem'
        )
    except Exception as e:
        print(f"Connection to database failed with message: {e}")
        raise

app = Flask(__name__)

@app.route('/ping')
def health_check():
    return 'This instance is healthy', 200

@app.route('/car', methods=['POST'])
def add_car():
    # Check if data within the body is valid json
    try:
        data = request.get_json()
    except:
        return 'No JSON data provided', 400
    
    # Check if data has the required format
    expected_keys = {'plate', 'make', 'model', 'year', 'colour', 'mileage', 'status'}
    missing = expected_keys - data.keys()
    if missing:
        return f"Missing fields: {missing}", 400
    
    # Extract data
    plate = data.get('plate')
    make = data.get('make')
    model = data.get('model')
    year = data.get('year')
    colour = data.get('colour')
    mileage = data.get('mileage')
    status = data.get('status')
    
    # Build query for inserting values
    query = "INSERT INTO cars (plate, make, model, year, colour, mileage, status) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    new_car = (plate, make, model, year, colour, mileage, status)

    #Connect to RDS
    try:
        conn = rds_connect()
    except:
        return 'Unable to connect to database', 503
    cur = conn.cursor()

    # Attempt query execution and handle primary key violation
    try:
        cur.execute(query, new_car)
        conn.commit()
        # Close connection to database
        cur.close()
        conn.close()
        return f"Added: {plate} > {make} {model} > {year} > {colour} > {mileage}km", 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        # Close connection to database
        cur.close()
        conn.close()
        return f"Car with plate {plate} already exists", 409

@app.route('/car/<string:plate>', methods=['DELETE', 'PATCH'])
def modify_car(plate):
    #Connect to RDS
    try:
        conn = rds_connect()
    except:
        return 'Unable to connect to database', 503
    cur = conn.cursor()

    if request.method == 'DELETE':
        query = "DELETE FROM cars WHERE plate = %s"
        # Attempt query execution and return 404 if plate not found
        cur.execute(query, (plate,))
        conn.commit()

        cur.close()
        conn.close()

        if cur.rowcount == 0:
            return 'Car not found in the database', 404
        
        return f"Car with plate ${plate} was deleted successfully", 204 # delete successful
    elif request.method == 'PATCH':
        query = "SELECT colour, mileage, status FROM cars WHERE plate = %s"
        # Attempt query execution and return 404 if plate not found
        cur.execute(query, (plate,))

        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return 'Car not found in the database', 404

        IMMUTABLE_FIELDS = {'plate', 'make', 'model', 'year'} # fields that cannot be modified
        old_car_info = cur.fetchone() # retrieve current car details
        try:
            new_car_info = request.get_json() # retrieve new car details
        except:
            return 'No fields for modification provided', 400
        
        new_fields = new_car_info.keys() # retrieve the fields that require modification
        forbidden = IMMUTABLE_FIELDS.intersection(new_fields) # check if request includes any forbidden fields
        if forbidden:
            cur.close()
            conn.close()
            return f'Cannot modify fields: {", ".join(forbidden)}', 403 # return forbidden code
        
        for field in new_fields:
            if field == 'mileage' and new_car_info[field] < old_car_info[1]:
                cur.close()
                conn.close()
                return 'New mileage cannot be lower than old value', 400
            if field == 'status' and old_car_info[2] == 'TOTALLED' and new_car_info[field] != 'TOTALLED':
                cur.close()
                conn.close()
                return 'The status of a totalled car cannot change', 400
            # checks passed update value
            query = "UPDATE cars SET " + field + ' = %s WHERE plate = %s'
            cur.execute(query, (new_car_info[field], plate)) # update each field
        
        conn.commit()
        cur.close()
        conn.close()

        return f"Car with plate {plate} updated successfully", 204 # update successful

@app.route('/cars/view_all')
def get_all_cars():
    # Connect to RDS
    try:
        conn = rds_connect()
    except:
        return 'Unable to connect to database', 503
    cur = conn.cursor()

    cur.execute("SELECT * FROM cars")
    rows = cur.fetchall() #stores results as list of tuples
    cur.close()
    conn.close()

    if len(rows) == 0:
        return 'No cars found in the database', 404 # no cars found in the DB
    # Populate and return list of cars
    cars_array = [{"plate": row[0], "make": row[1], "model": row[2], "year": row[3], "colour": row[4], "mileage": row[5], "status": row[6]} for row in rows]
    
    return jsonify(cars_array), 200

@app.route('/cars')
def filter_cars():
    # Validate fields in the request
    mask_request = request.args
    expected_keys = {'plate', 'make', 'model', 'year', 'colour', 'mileage', 'status'}
    mask_valid = {key: mask_request[key] for key in expected_keys if key in mask_request} # store valid filters only

    if not mask_valid: # return bad request if the filter doesn't have any valid values
        return 'No valid fields provided', 400
    
    # Connect to RDS
    try:
        conn = rds_connect()
    except:
        return 'Unable to connect to database', 503
    cur = conn.cursor()

    base_query = "SELECT * FROM cars"
    where_clause = " AND ".join([f"{key} = %s" for key in mask_valid.keys()])
    query = f"{base_query} WHERE {where_clause}"
    cur.execute(query, list(mask_valid.values()))
    rows = cur.fetchall() #stores results as list of tuples
    
    cur.close()
    conn.close()

    if len(rows) == 0:
        return f"No cars with {mask_valid} found", 404 # no cars found in the DB
    # Populate and return list of cars
    cars_array = [{"plate": row[0], "make": row[1], "model": row[2], "year": row[3], "colour": row[4], "mileage": row[5], "status": row[6]} for row in rows]

    return jsonify(cars_array), 200

if __name__ == '__main__':
    app.run(debug=True)
