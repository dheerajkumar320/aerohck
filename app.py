
from flask import Flask, render_template, request, jsonify
import pykociemba
import random

app = Flask(__name__)

# Store cube state globally (in production, use proper session management)
current_cube_state = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/shuffle', methods=['POST'])
def shuffle_cube():
    global current_cube_state
    # Generate a random cube state
    current_cube_state = pykociemba.randomCube()
    return jsonify({'state': current_cube_state})

@app.route('/solve', methods=['POST'])
def solve_cube():
    global current_cube_state
    try:
        solution = pykociemba.solve(current_cube_state)
        if solution.startswith("Error"):
            return jsonify({'error': solution})
        return jsonify({'solution': solution})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/get_state', methods=['GET'])
def get_state():
    return jsonify({'state': current_cube_state})

@app.route('/set_state', methods=['POST'])
def set_state():
    global current_cube_state
    data = request.get_json()
    current_cube_state = data.get('state', current_cube_state)
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
