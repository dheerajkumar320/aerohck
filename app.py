from flask import Flask, render_template, request, jsonify
import pykociemba
import time

# Import the custom tools as requested
from pykociemba.tools import random_scramble
from pykociemba.scramble_to_state import scramble_to_state

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_scramble', methods=['GET'])
def get_scramble_route():
    """Generates a random scramble using the provided tool and returns it as a string."""
    scramble_list = random_scramble()
    scramble_string = " ".join(scramble_list)
    return jsonify({'scramble': scramble_string})

@app.route('/get_state_from_scramble', methods=['POST'])
def get_state_from_scramble_route():
    """Converts a scramble string to a state string."""
    data = request.get_json()
    if not data or 'scramble' not in data:
        return jsonify({'error': 'Scramble string not provided'}), 400

    scramble_string = data['scramble']
    scramble_list = scramble_string.strip().split()

    try:
        state_string = scramble_to_state(scramble_list)
        return jsonify({'state': state_string})
    except Exception as e:
        return jsonify({'error': f'Failed to convert scramble to state: {str(e)}'})

@app.route('/solve', methods=['POST'])
def solve_cube_route():
    """
    Solves a cube based on a state string.
    """
    data = request.get_json()
    if not data or 'state' not in data:
        return jsonify({'error': 'State string not provided'}), 400

    state_string = data['state']
    
    if len(state_string) != 54:
        return jsonify({'error': 'Invalid cube state provided'})

    try:
        # Now, solve the generated state
        start_time = time.time()
        solution = pykociemba.solve(state_string, use_separator=True)
        end_time = time.time()

        if solution.startswith("Error"):
            return jsonify({'error': solution})

        solve_time_ms = (end_time - start_time) * 1000
        
        parts = solution.split(' . ')
        phase1_moves = len(parts[0].split())
        phase2_moves = len(parts[1].split()) if len(parts) > 1 else 0
        solution_length = phase1_moves + phase2_moves

        return jsonify({
            'solution': solution.replace(' . ', ' '),
            'solve_time': round(solve_time_ms, 2),
            'solution_length': solution_length,
            'phase1_moves': phase1_moves,
            'phase2_moves': phase2_moves
        })
    except Exception as e:
        return jsonify({'error': f'Solver error: {str(e)}'})

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
