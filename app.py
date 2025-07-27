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
    print(f"DEBUG: Shuffled cube state: {current_cube_state}")
    return jsonify({'state': current_cube_state})

@app.route('/solve', methods=['POST'])
def solve_cube():
    global current_cube_state
    try:
        print(f"DEBUG: Attempting to solve cube state: {current_cube_state}")
        
        # Validate cube state format
        if len(current_cube_state) != 54:
            print(f"DEBUG: Invalid cube state length: {len(current_cube_state)}")
            return jsonify({'error': 'Invalid cube state length'})

        solution = pykociemba.solve(current_cube_state)
        print(f"DEBUG: Solution from solver: {solution}")
        
        if solution.startswith("Error"):
            return jsonify({'error': solution})
        return jsonify({'solution': solution})
    except Exception as e:
        print(f"DEBUG: Solver exception: {str(e)}")
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

        print(f"DEBUG: Applying move '{move}' to cube state: {current_cube_state}")

        # Apply the move to the current state using pykociemba
        from pykociemba.facecube import FaceCube
        from pykociemba.cubiecube import CubieCube, moveCube

        # Convert current state to CubieCube
        fc = FaceCube(current_cube_state)
        cc = fc.toCubieCube()
        
        # Verify the cube is valid before applying move
        verify_result = cc.verify()
        print(f"DEBUG: Cube verification before move: {verify_result}")

        # Map face letters to indices (as used in pykociemba)
        face_map = {'U': 0, 'R': 1, 'F': 2, 'D': 3, 'L': 4, 'B': 5}

        # Parse and apply the move
        if move.endswith("'"):
            # Prime move (counterclockwise) = 3 clockwise turns
            face_idx = face_map[move[0]]
            print(f"DEBUG: Applying prime move {move} (face index {face_idx}, 3 turns)")
            for _ in range(3):
                cc.multiply(moveCube[face_idx])
        elif move.endswith('2'):
            # Double move = 2 clockwise turns
            face_idx = face_map[move[0]]
            print(f"DEBUG: Applying double move {move} (face index {face_idx}, 2 turns)")
            for _ in range(2):
                cc.multiply(moveCube[face_idx])
        else:
            # Single clockwise move
            face_idx = face_map[move[0]]
            print(f"DEBUG: Applying single move {move} (face index {face_idx}, 1 turn)")
            cc.multiply(moveCube[face_idx])

        # Verify the cube is still valid after applying move
        verify_result_after = cc.verify()
        print(f"DEBUG: Cube verification after move: {verify_result_after}")

        # Convert back to state string
        fc_new = cc.toFaceCube()
        new_state = fc_new.to_String()
        print(f"DEBUG: New cube state after move: {new_state}")
        
        current_cube_state = new_state

        return jsonify({'status': 'success', 'new_state': current_cube_state})
    except Exception as e:
        print(f"DEBUG: Move application exception: {str(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Move application error: {str(e)}'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)