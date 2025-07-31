# In-Depth Analysis of pykociemba Algorithm Implementation

## Overview
`pykociemba` is a Python implementation of Kociemba's two-phase Rubik's Cube solving algorithm. The codebase is modular, with each file representing a key concept in the cube's structure or the solving process. The main entry point is the `solve` function in `pykociemba/__init__.py`, which uses the `Search` class to find a solution.

---

## Key Data Structures (with Examples)

### 1. FaceCube and CubieCube

- **FaceCube**: Represents the cube in facelet notation (a string of 54 characters, each representing a color on a facelet). This is the most human-readable form, e.g.:

    Example:
    ```python
    # Solved cube string (U=Up, R=Right, F=Front, D=Down, L=Left, B=Back)
    solved = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
    fc = FaceCube(solved)
    print(fc.f)  # List of color indices for each facelet
    ```

- **CubieCube**: Represents the cube by the permutation and orientation of its 8 corners and 12 edges. This is a more compact and efficient representation for computation.

    Example:
    ```python
    cc = fc.toCubieCube()  # Convert FaceCube to CubieCube
    print(cc.cp)  # Corner permutation
    print(cc.co)  # Corner orientation
    print(cc.ep)  # Edge permutation
    print(cc.eo)  # Edge orientation
    ```

    - `cp` (corner permutation): which corner cubie is in each position (0-7)
    - `co` (corner orientation): orientation of each corner (0-2)
    - `ep` (edge permutation): which edge cubie is in each position (0-11)
    - `eo` (edge orientation): orientation of each edge (0-1)


### 2. CoordCube (Coordinate Representation)

- **CoordCube**: Encodes the cube state using integer coordinates for each relevant property (twist, flip, slice, parity, etc). This allows for fast table lookups and pruning in the search algorithm.

    Example:
    ```python
    cc = fc.toCubieCube()
    coord = CoordCube(cc)
    print(coord.twist)  # Integer representing all corner orientations
    print(coord.flip)   # Integer representing all edge flips
    print(coord.slice)  # Integer for UD-slice edges
    print(coord.parity) # 0 or 1 (even/odd parity)
    ```

    - These coordinates are used as indices into large precomputed tables (move tables, pruning tables) for extremely fast state evaluation and move generation.


### 3. Pruning Tables and Move Tables

- **Move Tables**: For each possible value of a coordinate (e.g., twist, flip), and for each possible move, these tables store the resulting coordinate after the move. This allows the solver to update the cube state in O(1) time per move.

    Example:
    ```python
    # twistMove[twist][move] gives the new twist coordinate after applying 'move' to a cube with 'twist'
    new_twist = twistMove[old_twist][move]
    ```

- **Pruning Tables**: For each possible combination of coordinates, these tables store the minimum number of moves required to reach the solved state (or a key subgroup). This is used for admissible heuristics in IDA* search, allowing the solver to prune large parts of the search tree.

    Example:
    ```python
    # Slice_Flip_Prun[slice * N_FLIP + flip] gives the lower bound on moves to reach the subgroup
    min_moves = Slice_Flip_Prun[slice * N_FLIP + flip]
    ```

- **Storage**: These tables are stored as pickled files in `prunetables/` and loaded at runtime. If missing, they are generated (which can take a long time).

---

## Algorithm Flow (Step-by-Step with Example)

Suppose you want to solve a scrambled cube with the string:
```python
scramble = "DUUBULRDFRRLUDFUBRFLDBLULFDRRUBFUBRFLDFDULBUBFLRDLG"
```

1. **Input**: The facelet string (54 characters, one for each facelet).
2. **FaceCube → CubieCube**: Convert to cubie representation for efficient manipulation.
    ```python
    fc = FaceCube(scramble)
    cc = fc.toCubieCube()
    ```
3. **CubieCube → CoordCube**: Convert to coordinate representation for fast table lookups.
    ```python
    coord = CoordCube(cc)
    ```
4. **Phase 1**: Use IDA* search to reduce the cube to the "H subgroup" (all edge/corner orientations solved, UD-slice edges in place). Any move is allowed in this phase.
5. **Phase 2**: From the H subgroup, use a restricted set of moves to solve the cube completely. Only half-turns of faces (U2, D2, etc) are allowed.
6. **Search**: The `Search` class manages the search, using pruning tables to avoid unnecessary branches. The solution is returned as a string of moves, e.g.:
    ```python
    solution = solve(scramble)
    print(solution)  # e.g., F' R B R L2 F . U2 U D
    ```
    The dot (`.`) separates phase 1 and phase 2 moves.

---

## Main Classes and Their Roles (Expanded)

- **FaceCube**: Handles conversion from facelet string to cubie representation. Also provides methods to convert back to string.
- **CubieCube**: Handles cubie-level operations (permutations, orientations), multiplication of cube states, and conversion to/from FaceCube.
- **CoordCube**: Encodes cube state as coordinates for fast lookup. Provides move and pruning tables for each coordinate.
- **Search**: Implements the two-phase algorithm, manages the search process, and generates the solution string. Uses IDA* search and pruning tables for efficiency.

---

## Example: Search Class (Core of the Algorithm)

The `Search` class is the heart of the solver. It manages the two-phase search, using move and pruning tables to efficiently explore possible move sequences.

**Key methods:**
- `solution(facelets, maxDepth, timeOut, useSeparator)`: Main entry point. Converts facelets to cubie/coord representations, then runs the two-phase search.
- `solutionToString(length, depthPhase1)`: Converts the found move sequence to a human-readable string, with a dot separating the two phases.

**Example:**
```python
search = Search()
result = search.solution(scramble, 24, 1000, True)
print(result)  # e.g., F' R B R L2 F . U2 U D
```

**How the search works:**
1. Validates the input facelets.
2. Converts to cubie and coordinate representations.
3. Uses IDA* search for phase 1, guided by pruning tables.
4. When the H subgroup is reached, switches to phase 2 (restricted moves).
5. Returns the move sequence as a string.

---

## Pruning and Move Tables (In-Depth)

- **Purpose**: These tables allow the solver to instantly know, for any given state, the minimum number of moves to reach a key subgroup or the solved state. This is crucial for the efficiency of IDA* search.

- **Move Table Example:**
    ```python
    # For a given twist coordinate and move, get the new twist coordinate
    new_twist = twistMove[old_twist][move]
    ```

- **Pruning Table Example:**
    ```python
    # For a given slice and flip, get the lower bound on moves to subgroup
    min_moves = Slice_Flip_Prun[slice * N_FLIP + flip]
    if min_moves > remaining_depth:
        # Prune this branch
    ```

- **How they're built:**
    - On first run, the code generates these tables by exhaustive search and saves them as `.pkl` files in `prunetables/`.
    - On subsequent runs, they're loaded from disk for speed.

---

## Summary Table: File Roles (with Details)

| File              | Role/Content                                      |
|-------------------|--------------------------------------------------|
| __init__.py       | Entry point, exposes `solve` and imports all core modules |
| search.py         | Implements the two-phase algorithm, manages search, solution formatting |
| facecube.py       | Facelet-level representation, conversion to/from CubieCube |
| cubiecube.py      | Cubie-level representation, move/corner/edge operations |
| coordcube.py      | Coordinate-level representation, move/pruning tables, table generation |
| tools.py          | Utility functions: random scrambles, verification, helpers |
| color.py, edge.py, corner.py, facelet.py | Constants, enums, facelet/cubie indices, color mapping |

---

## Data Structures Used (with Examples)

- **Arrays/Lists**: Used for permutations, orientations, move tables, pruning tables.
    - Example: `cp = [URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB]` (corner permutation)
- **Dictionaries**: Used for color mapping and facelet lookup.
    - Example: `colors = {'U': 0, 'R': 1, ...}`
- **Pickle Files**: Used for storing/loading large tables in `prunetables/`.
    - Example: `twistMove = load_cachetable('twistMove')`

---

## Not Used/Utility Files

- `color.py`, `edge.py`, `corner.py`, `facelet.py`: Only provide constants/enums, not logic. They define indices, color mappings, and names for use in the main logic files.
- All other files are used directly or indirectly by the solver, either for core logic or as helpers/utilities.

---

## References
- Kociemba, Herbert. "Cube Explorer". http://kociemba.org/
- Code comments and docstrings in the repo.
- "The Mathematics of the Rubik's Cube" (various online sources)
- Korf, R. E. (1997). "Finding Optimal Solutions to Rubik's Cube Using Pattern Databases". AAAI.

---

This document provides a comprehensive, example-driven explanation of the `pykociemba` implementation, its algorithm, and its data structures. For further details, see the code comments and referenced literature.

---

This document summarizes the structure, algorithm, and data structures of the `pykociemba` implementation in your project.
