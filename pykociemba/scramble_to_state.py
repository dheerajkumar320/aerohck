from .cubiecube import CubieCube, moveCube

# Map move strings to indices (U, U', U2, R, R', R2, etc.)
MOVE_MAP = {
    'U': 0,  'U2': 1,  "U'": 2,
    'R': 3,  'R2': 4,  "R'": 5,
    'F': 6,  'F2': 7,  "F'": 8,
    'D': 9,  'D2': 10, "D'": 11,
    'L': 12, 'L2': 13, "L'": 14,
    'B': 15, 'B2': 16, "B'": 17,
}

def scramble_to_state(scramble_moves):
    """
    Given a list of scramble moves (e.g. ['U', "R'", 'F2', ...]),
    return the facelet string (e.g. 'UUUUUUUUURRRRRRRRR...') after applying the scramble.
    """
    cube = CubieCube()
    for move in scramble_moves:
        idx = MOVE_MAP.get(move)
        if idx is None:
            raise ValueError(f"Invalid move: {move}")
        cube.cornerMultiply(moveCube[idx])
        cube.edgeMultiply(moveCube[idx])
    return cube.toFaceCube().to_String()
