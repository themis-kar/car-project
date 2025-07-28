from flask import Flask, request, jsonify
import psycopg2
import boto3
from os import getenv

app = Flask(__name__)

@app.route('/ping')
def health_check():
    return "This instance is healthy", 200

@app.route('/car', methods=['POST'])
def add_car():
    # Check if data within the body is valid json
    try:
        data = request.get_json()
    except:
        return jsonify({'error': 'No JSON data provided'}), 400
    
    # Check if data has the required format
    expected_keys = {'plate', 'make', 'model', 'year', 'colour', 'mileage', 'status'}
    missing = expected_keys - data.keys()
    if missing:
        return jsonify({'error': f"Missing fields: {missing}"}), 400
    
    # Extract data
    plate = data.get('plate').upper()
    make = data.get('make').upper()
    model = data.get('model').upper()
    year = data.get('year')
    colour = data.get('colour').upper()
    mileage = data.get('mileage')
    status = data.get('status')

    # Connect to database
    rds_client = boto3.client('rds', region_name=getenv('REGION'))
    token = rds_client.generate_db_auth_token(
        DBHostname=getenv('DB_ENDPOINT'),
        Port=5432,
        DBUsername='db_iam_user'
    )

    with open('token_list.txt', 'a') as f:
        f.write(f"{token}\n-------\n")
    
    conn = psycopg2.connect(
        host=getenv('DB_ENDPOINT'),
        port=5432,
        dbname='postgres',
        user='db_iam_user',
        password=token,
        sslmode='verify-ca',
        sslrootcert='rds_cert.pem'
    )

    cur = conn.cursor()
    
    # Build query for inserting values
    query = "INSERT INTO cars (plate, make, model, year, colour, mileage, status) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    new_car = (plate, make, model, year, colour, mileage, status)
    # Attempt query execution and handle primary key violation
    try:
        cur.execute(query, new_car)
        conn.commit()
        # Close connection to database
        cur.close()
        conn.close()
        return jsonify({"message": f"Car added: {plate} | {colour} {make} {model} from {year} with {mileage} km",}), 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        # Close connection to database
        cur.close()
        conn.close()
        return jsonify({"error": "Conflict", "message": f"Car with plate {plate} already exists."}), 409

@app.route('/car/<string:plate>', methods=['DELETE', 'PATCH'])
def modify_car(plate):
    # Connect to database - to be updated for RDS endpoints and IAM authentication
    conn = psycopg2.connect(
        host='192.168.1.196',
        port=5432,
        dbname='postgres',
        user='postgres',
        password='mypass'
    )
    cur = conn.cursor()

    if request.method == 'DELETE':
        query = "DELETE FROM cars WHERE plate = %s"
        # Attempt query execution and return 404 if plate not found
        cur.execute(query, (plate,))
        conn.commit()

        cur.close()
        conn.close()

        if cur.rowcount == 0:
            return '', 404 # not found in the database
        
        return '', 204 # delete successful
    elif request.method == 'PATCH':
        query = "SELECT colour, mileage, status FROM cars WHERE plate = %s"
        cur.execute(query, (plate,))

        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return '', 404 # not found in the database - close connection

        IMMUTABLE_FIELDS = {'plate', 'make', 'model', 'year'}

        old_car_info = cur.fetchone() # retrieve current car details
        try:
            new_car_info = request.get_json() # retrieve new car details
        except:
            return jsonify({'error': 'No fields for modification provided'}), 400
        
        new_fields = new_car_info.keys() # retrieve the fields that require modification
        
        forbidden = IMMUTABLE_FIELDS.intersection(new_fields) # check if request includes any forbidden fields
        if forbidden:
            cur.close()
            conn.close()
            return jsonify({'error': f'Cannot modify fields: {", ".join(forbidden)}'}), 403 # return forbidden code
        
        for field in new_fields:
            if field == 'mileage' and new_car_info[field] < old_car_info[1]:
                cur.close()
                conn.close()
                return jsonify({"error": "Invalid Value", "message": "New mileage cannot be lower than old value"}), 400
            if field == 'status' and old_car_info[2] == 'TOTALLED' and new_car_info[field] != 'TOTALLED':
                cur.close()
                conn.close()
                return jsonify({"error": "Invalid value", "message": "The status of a totalled car cannot change"}), 400
            # checks passed update value
            query = "UPDATE cars SET " + field + ' = %s WHERE plate = %s'
            cur.execute(query, (new_car_info[field], plate)) # update each field
        
        conn.commit()
        cur.close()
        conn.close()

        return '', 204 # update successful

@app.route('/cars/view_all')
def get_all_cars():
    # Connect to RDS as user=db_iam_user, host='retrieve from env variables', SSL_cert='rds_cert.pem', dbname='postgres'
    # environment variables REGION, DB_ENDPOINT
    rds_client = boto3.client('rds', region_name=getenv('REGION'))
    token = rds_client.generate_db_auth_token(
        DBHostname=getenv('DB_ENDPOINT'),
        Port=5432,
        DBUsername='db_iam_user'
    )

    with open('token_list.txt', 'a') as f:
        f.write(f"{token}\n-------\n")

    conn = psycopg2.connect(
        host=getenv('DB_ENDPOINT'),
        port=5432,
        dbname='postgres',
        user='db_iam_user',
        password=token,
        sslmode='verify-ca',
        sslrootcert='rds_cert.pem'
    )
    cur = conn.cursor()

    cars_array = []
    cur.execute("SELECT * FROM cars")
    rows = cur.fetchall() #stores results as list of tuples
    cur.close()
    conn.close()

    if len(rows) == 0:
        return '', 404 # no cars found in the DB
    
    for row in rows:
        cars_array.append({
            "plate": row[0],
            "make": row[1],
            "model": row[2],
            "year": row[3],
            "colour": row[4],
            "mileage": row[5],
            "status": row[6]
        })
    
    return jsonify(cars_array), 200

@app.route('/cars')
def filter_cars():
    
    mask_request = request.args
    expected_keys = {'plate', 'make', 'model', 'year', 'colour', 'mileage', 'status'}
    mask_valid = {key: mask_request[key] for key in expected_keys if key in mask_request} # store valid filters only

    if not mask_valid: # return bad request if the filter doesn't have any valid values
        return jsonify({"error": "Invalid filter", "message": "No valid fields provided"}), 400
    
    conn = psycopg2.connect(
        host='192.168.1.196',
        port=5432,
        dbname='postgres',
        user='postgres',
        password='mypass'
    )
    cur = conn.cursor()

    base_query = "SELECT * FROM cars"
    where_clause = " AND ".join([f"{key} = %s" for key in mask_valid.keys()])
    query = f"{base_query} WHERE {where_clause}"
    cur.execute(query, list(mask_valid.values()))
    rows = cur.fetchall() #stores results as list of tuples
    
    cur.close()
    conn.close()

    if len(rows) == 0:
        return '', 404 # no cars found in the DB
    cars_array = []
    for row in rows:
        cars_array.append({
            "plate": row[0],
            "make": row[1],
            "model": row[2],
            "year": row[3],
            "colour": row[4],
            "mileage": row[5],
            "status": row[6]
        })
    
    return jsonify(cars_array), 200

if __name__ == '__main__':
    app.run(debug=True)
