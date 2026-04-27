from flask import Flask, request, jsonify, render_template
import sqlite3
import datetime
import os

# Configure the app to look for templates and static files in the parent directory
app = Flask(__name__, 
            template_folder='../templates',
            static_folder='../static')

# Ensure the database is accessed from the server/ directory reliably
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def init_db():
    """Initialize the database with the required table."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS data
                     (time TEXT, soil INT, water INT, risk REAL)''')
        
@app.route('/')
def home():
    """Serve the main index page."""
    return render_template("index.html")

@app.route('/update', methods=['POST'])
def update():
    """Receive sensor data and calculate risk."""
    try:
        # get_json() handles the parsing safely
        data = request.get_json()
        
        if not data or 'soil' not in data or 'water' not in data:
            return jsonify({"error": "Invalid request. Missing 'soil' or 'water' parameters."}), 400

        # Cast to float to safely handle numerical operations
        soil = float(data['soil'])
        water = float(data['water'])

        # Calculate risk based on input
        risk = (soil * 0.6) + (water * 0.4)

        # Use timezone-aware or ISO formatted string for timestamps
        current_time = datetime.datetime.now().isoformat()

        # Context manager automatically commits transaction
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("INSERT INTO data (time, soil, water, risk) VALUES (?, ?, ?, ?)",
                         (current_time, soil, water, risk))

        return jsonify({
            "message": "Data recorded successfully",
            "risk": risk
        }), 201

    except ValueError:
        return jsonify({"error": "Data formatting error. Ensure soil and water are numbers."}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/data')
def get_data():
    """Retrieve the 20 most recent data recordings."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            # Row factory allows us to convert fetched rows into dictionaries cleanly
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT time, soil, water, risk FROM data ORDER BY time DESC LIMIT 20")
            rows = [dict(row) for row in cursor.fetchall()]

        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

if __name__ == "__main__":
    init_db()
    # Note: debug=True is good for development, but consider setting debug=False for production
    app.run(debug=True, port=5000)
