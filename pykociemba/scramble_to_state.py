from .cubiecube import CubieCube, moveCube

def scramble_to_state(scramble_moves):
    """
    Given a list of scramble moves (e.g. ['U', "R'", 'F2', ...]),
    return the facelet string (e.g. 'UUUUUUUUURRRRRRRRR...') after applying the scramble.
    """
    cube = CubieCube()
    
    # Map face names to their index in moveCube
    face_map = {'U': 0, 'R': 1, 'F': 2, 'D': 3, 'L': 4, 'B': 5}

    for move_str in scramble_moves:
        if not move_str:
            continue
            
        face_char = move_str[0]
        move_idx = face_map.get(face_char)

        if move_idx is None:
            # Skip moves that are not standard face turns (e.g., M, E, S)
            # Or raise an error if they should be supported
            continue

        move = moveCube[move_idx]
        
        if len(move_str) == 1: # Standard move (e.g., 'U')
            cube.multiply(move)
        elif move_str[1] == "'": # Prime move (e.g., "U'")
            # Apply the move 3 times for a prime
            cube.multiply(move)
            cube.multiply(move)
            cube.multiply(move)
        elif move_str[1] == '2': # Double move (e.g., 'U2')
            cube.multiply(move)
            cube.multiply(move)
            
    return cube.toFaceCube().to_String()
