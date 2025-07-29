class RubiksCube {
    // --- Move application logic ---
    // Map move string to axis and layer
    static MOVE_MAP = {
        'U': { axis: 'y', layer: 2, angle: Math.PI / 2 },
        "U'": { axis: 'y', layer: 2, angle: -Math.PI / 2 },
        'U2': { axis: 'y', layer: 2, angle: Math.PI },
        'D': { axis: 'y', layer: 0, angle: Math.PI / 2 },
        "D'": { axis: 'y', layer: 0, angle: -Math.PI / 2 },
        'D2': { axis: 'y', layer: 0, angle: Math.PI },
        'R': { axis: 'x', layer: 2, angle: Math.PI / 2 },
        "R'": { axis: 'x', layer: 2, angle: -Math.PI / 2 },
        'R2': { axis: 'x', layer: 2, angle: Math.PI },
        'L': { axis: 'x', layer: 0, angle: Math.PI / 2 },
        "L'": { axis: 'x', layer: 0, angle: -Math.PI / 2 },
        'L2': { axis: 'x', layer: 0, angle: Math.PI },
        'F': { axis: 'z', layer: 2, angle: Math.PI / 2 },
        "F'": { axis: 'z', layer: 2, angle: -Math.PI / 2 },
        'F2': { axis: 'z', layer: 2, angle: Math.PI },
        'B': { axis: 'z', layer: 0, angle: Math.PI / 2 },
        "B'": { axis: 'z', layer: 0, angle: -Math.PI / 2 },
        'B2': { axis: 'z', layer: 0, angle: Math.PI },
    };

    // Apply a single move to the cube (instant, not animated)
    applyMove(moveString) {
        const move = RubiksCube.MOVE_MAP[moveString];
        if (!move) return;
        const { axis, layer, angle } = move;
        // Find pieces in the layer and rotate them
        this.pieces.forEach(piece => {
            const { x, y, z } = piece.userData;
            let match = false;
            if (axis === 'x' && x === layer) match = true;
            if (axis === 'y' && y === layer) match = true;
            if (axis === 'z' && z === layer) match = true;
            if (match) {
                // Apply rotation to piece position
                this.rotatePiece(piece, axis, angle);
            }
        });
        // Update userData for all pieces to reflect new logical positions
        this.updatePiecePositions(axis, layer, angle);
        // Optionally, update the cube's facelet colors if you track state
        // this.updateCubeFromState(this.currentStateString);
    }

    // Rotate a piece's position in 3D space (visual only)
    rotatePiece(piece, axis, angle) {
        const pos = piece.position;
        let { x, y, z } = pos;
        if (axis === 'x') {
            const y1 = y * Math.cos(angle) - z * Math.sin(angle);
            const z1 = y * Math.sin(angle) + z * Math.cos(angle);
            piece.position.y = y1;
            piece.position.z = z1;
        } else if (axis === 'y') {
            const x1 = x * Math.cos(angle) + z * Math.sin(angle);
            const z1 = -x * Math.sin(angle) + z * Math.cos(angle);
            piece.position.x = x1;
            piece.position.z = z1;
        } else if (axis === 'z') {
            const x1 = x * Math.cos(angle) - y * Math.sin(angle);
            const y1 = x * Math.sin(angle) + y * Math.cos(angle);
            piece.position.x = x1;
            piece.position.y = y1;
        }
        // Optionally, rotate the mesh itself for visual effect
        // piece.rotation[axis] += angle;
    }

    // Update userData for all pieces after a move (to keep logical positions correct)
    updatePiecePositions(axis, layer, angle) {
        // This is a placeholder. For a real cube, you need to permute userData (x,y,z) for affected pieces.
        // For a full implementation, you would update the logical state here.
        // This is non-trivial and would require a mapping of piece indices.
    }

    // Apply a sequence of moves (array of move strings)
    applyMoves(moveList) {
        moveList.forEach(move => this.applyMove(move));
    }
    constructor() {
        this.scene = new THREE.Scene();
        const container = document.getElementById('container');
        
        // **FIX 1: Use container's dimensions for camera aspect ratio**
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
        this.controls.enableZoom = false;

        this.camera.position.set(4,4, 4);
        this.controls.update();

        this.cubeGroup = new THREE.Group();
        this.scene.add(this.cubeGroup);
        this.pieces = [];
        this.isAnimating = false;
        this.solutionChart = null;

        this.colorMap = {
            'U': 0xffffff, // White - Up
            'R': 0xed1c24, // Red - Right  
            'F': 0x009b48, // Green - Front
            'D': 0xffd500, // Yellow - Down
            'L': 0xff5800, // Orange - Left
            'B': 0x0051ba  // Blue - Back
        };

        this.initializeCube();
        this.setupEventListeners();
        this.animate();
        this.syncWithBackend();
    }

    async syncWithBackend() {
        try {
            const response = await fetch('/get_state');
            const data = await response.json();
            if (data.state) {
                this.updateCubeFromState(data.state);
                this.updateStatus('Connected to backend', '#4CAF50');
            }
        } catch (error) {
            console.error('Failed to sync with backend:', error);
            this.updateStatus('Backend sync failed', '#f44336');
        }
    }

    initializeCube() {
        this.pieces.forEach(piece => this.cubeGroup.remove(piece));
        this.pieces = [];

        const pieceSize = 1.2;
        const gap = 0.05;

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                for (let z = 0; z < 3; z++) {
                    const geometry = new THREE.BoxGeometry(pieceSize, pieceSize, pieceSize);
                    const materials = this.createCubeMaterials(x, y, z);
                    const cube = new THREE.Mesh(geometry, materials);
                    cube.position.set((x - 1) * (pieceSize + gap), (y - 1) * (pieceSize + gap), (z - 1) * (pieceSize + gap));
                    cube.userData = { x, y, z };
                    this.pieces.push(cube);
                    this.cubeGroup.add(cube);
                }
            }
        }
    }

    createCubeMaterials(x, y, z) {
        const standardProps = { metalness: 0.3, roughness: 0.7 };
        return [
            new THREE.MeshStandardMaterial({ color: x === 2 ? this.colorMap['R'] : 0x000000, ...standardProps }), // Right
            new THREE.MeshStandardMaterial({ color: x === 0 ? this.colorMap['L'] : 0x000000, ...standardProps }), // Left
            new THREE.MeshStandardMaterial({ color: y === 2 ? this.colorMap['U'] : 0x000000, ...standardProps }), // Up
            new THREE.MeshStandardMaterial({ color: y === 0 ? this.colorMap['D'] : 0x000000, ...standardProps }), // Down
            new THREE.MeshStandardMaterial({ color: z === 2 ? this.colorMap['F'] : 0x000000, ...standardProps }), // Front
            new THREE.MeshStandardMaterial({ color: z === 0 ? this.colorMap['B'] : 0x000000, ...standardProps })  // Back
        ];
    }

    updateCubeFromState(stateString) {
        if (stateString.length !== 54) return;
        this.currentStateString = stateString;
        
        const faces = {
            U: stateString.substring(0, 9), R: stateString.substring(9, 18),
            F: stateString.substring(18, 27), D: stateString.substring(27, 36),
            L: stateString.substring(36, 45), B: stateString.substring(45, 54)
        };
        
        this.pieces.forEach(piece => {
            const { x, y, z } = piece.userData;
            const materials = piece.material;
            if (x === 2) materials[0].color.setHex(this.colorMap[faces.R[(2 - y) * 3 + z]]);
            if (x === 0) materials[1].color.setHex(this.colorMap[faces.L[(2 - y) * 3 + (2 - z)]]);
            if (y === 2) materials[2].color.setHex(this.colorMap[faces.U[z * 3 + x]]);
            if (y === 0) materials[3].color.setHex(this.colorMap[faces.D[(2 - z) * 3 + x]]);
            if (z === 2) materials[4].color.setHex(this.colorMap[faces.F[y * 3 + x]]);
            if (z === 0) materials[5].color.setHex(this.colorMap[faces.B[y * 3 + (2 - x)]]);
        });
    }

    async shuffleCube() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.updateStatus('Shuffling cube...', '#ff9800');
        document.getElementById('solveTime').textContent = 'N/A';
        document.getElementById('solutionLength').textContent = 'N/A';
        if (this.solutionChart) {
            this.solutionChart.destroy();
            this.solutionChart = null;
        }
        try {
            const response = await fetch('/shuffle', { method: 'POST' });
            const data = await response.json();
            if (data.error) {
                this.updateStatus(`Error: ${data.error}`, '#f44336');
            } else if (data.state) {
                this.updateCubeFromState(data.state);
                this.updateStatus('Cube shuffled!', '#4CAF50');
            }
        } catch (error) {
            this.updateStatus('Error shuffling cube', '#f44336');
        }
        this.isAnimating = false;
    }

    async solveCube() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.updateStatus('Solving cube...', '#ff9800');
        try {
            const response = await fetch('/solve', { method: 'POST' });
            const data = await response.json();
            const solutionDiv = document.getElementById('solutionString');
            if (data.solution) {
                document.getElementById('solveTime').textContent = `${data.solve_time} ms`;
                document.getElementById('solutionLength').textContent = `${data.solution_length} moves`;
                this.renderSolutionChart(data.phase1_moves, data.phase2_moves);
                this.updateStatus(`Solution Found: ${data.solution}`, '#4CAF50');
                solutionDiv.textContent = `Solution: ${data.solution}`;
                solutionDiv.style.display = 'block';
                await this.animateSolution(data.solution);
                await this.syncWithBackend();
            } else {
                this.updateStatus(data.error || 'Error solving cube', '#f44336');
                solutionDiv.style.display = 'none';
            }
        } catch (error) {
            this.updateStatus('Error connecting to solver', '#f44336');
            document.getElementById('solutionString').style.display = 'none';
        }
        this.isAnimating = false;
    }

    async animateSolution(solutionString) {
        const moves = solutionString.trim().split(' ').filter(move => move);
        for (let i = 0; i < moves.length; i++) {
            this.updateStatus(`Move ${i + 1}/${moves.length}: ${moves[i]}`, '#2196F3');
            await this.performMoveAnimation(moves[i]);
        }
        this.updateStatus('Solution Complete!', '#4CAF50');
    }

    async performMoveAnimation(moveString) {
        // This function would contain the rotation logic.
        // For simplicity in this fix, we'll just update state from the backend.
        try {
            const response = await fetch('/apply_move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ move: moveString })
            });
            const data = await response.json();
            if (data.status === 'success' && data.new_state) {
                this.updateCubeFromState(data.new_state);
            }
            await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for animation
        } catch (error) {
            console.error(`Move application error for ${moveString}:`, error);
        }
    }
    
    updateStatus(message, color = '#fff') {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.style.color = color;
    }

    renderSolutionChart(phase1Moves, phase2Moves) {
        const ctx = document.getElementById('solutionChart').getContext('2d');
        if (this.solutionChart) {
            this.solutionChart.destroy();
        }
        this.solutionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Solution'],
                datasets: [
                    {
                        label: 'Phase 1 Moves',
                        data: [phase1Moves],
                        backgroundColor: 'rgba(255, 142, 83, 0.7)',
                        borderColor: 'rgba(255, 142, 83, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Phase 2 Moves',
                        data: [phase2Moves],
                        backgroundColor: 'rgba(37, 117, 252, 0.7)',
                        borderColor: 'rgba(37, 117, 252, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    x: {
                        stacked: true,
                        ticks: { color: 'white' }
                    },
                    y: {
                        stacked: true,
                        ticks: { color: 'white' }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        });
    }

    setupEventListeners() {
        if (this.eventListenersAttached) return;

        this.controls.addEventListener('start', () => {
            this.controls.autoRotate = false;
        });
        
        this.controls.addEventListener('end', () => {
            // Optionally re-enable auto-rotation after a delay
            setTimeout(() => {
                if (!this.isAnimating) { // Only resume if no other animation is running
                    this.controls.autoRotate = true;
                }
            }, 3000); // 3-second delay before resuming
        });

        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffleCube());
        document.getElementById('solveBtn').addEventListener('click', () => this.solveCube());

        // **FIX 2: Use ResizeObserver for robust resizing**
        const container = document.getElementById('container');
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                this.renderer.setSize(width, height);
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
            }
        });

        resizeObserver.observe(container);
        
        this.eventListenersAttached = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the cube when the page loads
let cube;
window.addEventListener('DOMContentLoaded', () => {
    if (!window.cubeInstance) {
        window.cubeInstance = new RubiksCube();
    }
});
