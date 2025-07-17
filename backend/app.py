from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello, Flask!"

@app.route('/ping')
def health_check():
    return "This instance is healthy", 200

if __name__ == '__main__':
    app.run(debug=True)
