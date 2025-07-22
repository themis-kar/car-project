from flask import Flask, request, jsonify
import psycopg2

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

    # Connect to database - to be updated for RDS endpoints and IAM authentication
    conn = psycopg2.connect(
        host='192.168.1.196',
        port=5432,
        dbname='postgres',
        user='postgres',
        password='mypass'
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
def delete_car(plate):
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
        # Attempt query execution and handle primary key violation
        cur.execute(query, (plate,))
        conn.commit()

        cur.close()
        conn.close()

        if cur.rowcount == 0:
            return '', 404 # not found in the database
        return '', 204
    elif request.method == 'PATCH':
        # search the db for plate and retrieve current car details -> return 404 if car not found
        # retrieve new car details from request.get_json()
        # fields that are allowed to be edited: colour, mileage, status
        # check that mileage is higher than current value -> return 400 and message if not
        # check that status is totalled it won't attempt a change -> return 400 and message if not
        # apply new values and return 204

        return '', 400

@app.route('/cars/view_all')
def get_all_cars():
    # Connect to database - to be updated for RDS endpoints and IAM authentication
    conn = psycopg2.connect(
        host='192.168.1.196',
        port=5432,
        dbname='postgres',
        user='postgres',
        password='mypass'
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

if __name__ == '__main__':
    app.run(debug=True)
