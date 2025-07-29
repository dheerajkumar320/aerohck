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
        # Validate cube state format
        if len(current_cube_state) != 54:
            return jsonify({'error': 'Invalid cube state length'})

        solution = pykociemba.solve(current_cube_state)
        if solution.startswith("Error"):
            return jsonify({'error': solution})
        return jsonify({'solution': solution})
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
    import os
    port = int(os.environ.get("PORT", 5000))  # Railway assigns a dynamic port
    app.run(host='0.0.0.0', port=port, debug=True)
