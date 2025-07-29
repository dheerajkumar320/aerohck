from flask import Flask, render_template, request, jsonify
import pykociemba
import random
import time
app = Flask(__name__)

# Store cube state globally (in production, use proper session management)
current_cube_state = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/shuffle', methods=['POST'])
def shuffle_cube():
    global current_cube_state
    # Generate a random scramble of 20 moves
    moves = ["U", "D", "L", "R", "F", "B"]
    modifiers = ["", "'", "2"]
    scramble_moves = " ".join([random.choice(moves) + random.choice(modifiers) for _ in range(20)])
    
    # Apply the scramble to the solved state
    try:
        # pykociemba.solve can also be used to apply moves to a state
        # We "solve" the solved state with the scramble sequence to get the shuffled state
        solved_state = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
        current_cube_state = pykociemba.solve(solved_state, scramble_moves)
        return jsonify({'state': current_cube_state, 'scramble': scramble_moves})
    except Exception as e:
        # Fallback to randomCube if the scramble application fails
        current_cube_state = pykociemba.randomCube()
        return jsonify({'state': current_cube_state, 'scramble': 'N/A (fallback)'})

@app.route('/solve', methods=['POST'])
def solve_cube():
    global current_cube_state
    try:
        if len(current_cube_state) != 54:
            return jsonify({'error': 'Invalid cube state length'})

        start_time = time.time()
        solution = pykociemba.solve(current_cube_state, use_separator=True)
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

@app.route('/get_state', methods=['GET'])
def get_state():
    return jsonify({'state': current_cube_state})

@app.route('/set_state', methods=['POST'])
def set_state():
    global current_cube_state
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        new_state = data.get('state')
        if not new_state:
            return jsonify({'error': 'No state provided'}), 400

        if len(new_state) != 54:
            return jsonify({'error': 'Invalid cube state length (must be 54 characters)'}), 400

        # Basic validation - check if contains only valid face characters
        valid_chars = set('UDRLFB')
        if not all(c in valid_chars for c in new_state):
            return jsonify({'error': 'Invalid characters in cube state (must be U,D,R,L,F,B only)'}), 400

        current_cube_state = new_state
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': f'Invalid request: {str(e)}'}), 400

@app.route('/apply_move', methods=['POST'])
def apply_move():
    global current_cube_state
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        move = data.get('move')
        if not move:
            return jsonify({'error': 'No move provided'}), 400

        # Apply the move to the current state using pykociemba
        from pykociemba.facecube import FaceCube
        from pykociemba.cubiecube import CubieCube, moveCube

        # Convert current state to CubieCube
        fc = FaceCube(current_cube_state)
        cc = fc.toCubieCube()

        # Map face letters to indices (as used in pykociemba)
        face_map = {'U': 0, 'R': 1, 'F': 2, 'D': 3, 'L': 4, 'B': 5}

        # Parse and apply the move
        if move.endswith("'"):
            # Prime move (counterclockwise) = 3 clockwise turns
            face_idx = face_map[move[0]]
            for _ in range(3):
                cc.multiply(moveCube[face_idx])
        elif move.endswith('2'):
            # Double move = 2 clockwise turns
            face_idx = face_map[move[0]]
            for _ in range(2):
                cc.multiply(moveCube[face_idx])
        else:
            # Single clockwise move
            face_idx = face_map[move[0]]
            cc.multiply(moveCube[face_idx])

        # Convert back to state string
        fc_new = cc.toFaceCube()
        current_cube_state = fc_new.to_String()

        return jsonify({'status': 'success', 'new_state': current_cube_state})
    except Exception as e:
        return jsonify({'error': f'Move application error: {str(e)}'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
