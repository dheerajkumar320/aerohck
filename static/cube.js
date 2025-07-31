class RubiksCube {
    // --- Move application logic ---
    // Map move string to axis and layer
    static MOVE_MAP = {
        // Standard moves (clockwise from face)
        'U': { axis: 'y', layer: 2, angle: -Math.PI / 2 },
        'D': { axis: 'y', layer: 0, angle: Math.PI / 2 },
        'R': { axis: 'x', layer: 2, angle: -Math.PI / 2 },
        'L': { axis: 'x', layer: 0, angle: Math.PI / 2 },
        'F': { axis: 'z', layer: 2, angle: -Math.PI / 2 },
        'B': { axis: 'z', layer: 0, angle: Math.PI / 2 },

        // Prime moves (counter-clockwise)
        "U'": { axis: 'y', layer: 2, angle: Math.PI / 2 },
        "D'": { axis: 'y', layer: 0, angle: -Math.PI / 2 },
        "R'": { axis: 'x', layer: 2, angle: Math.PI / 2 },
        "L'": { axis: 'x', layer: 0, angle: -Math.PI / 2 },
        "F'": { axis: 'z', layer: 2, angle: Math.PI / 2 },
        "B'": { axis: 'z', layer: 0, angle: -Math.PI / 2 },

        // Double moves
        'U2': { axis: 'y', layer: 2, angle: -Math.PI },
        'D2': { axis: 'y', layer: 0, angle: Math.PI },
        'R2': { axis: 'x', layer: 2, angle: -Math.PI },
        'L2': { axis: 'x', layer: 0, angle: Math.PI },
        'F2': { axis: 'z', layer: 2, angle: -Math.PI },
        'B2': { axis: 'z', layer: 0, angle: Math.PI },
        
        // Slice Moves (directions based on the face they move with)
        'M': { axis: 'x', layer: 1, angle: Math.PI / 2 }, // Like L
        "M'": { axis: 'x', layer: 1, angle: -Math.PI / 2 },
        'M2': { axis: 'x', layer: 1, angle: Math.PI },
        'E': { axis: 'y', layer: 1, angle: Math.PI / 2 }, // Like D
        "E'": { axis: 'y', layer: 1, angle: -Math.PI / 2 },
        'E2': { axis: 'y', layer: 1, angle: Math.PI },
        'S': { axis: 'z', layer: 1, angle: -Math.PI / 2 }, // Like F
        "S'": { axis: 'z', layer: 1, angle: Math.PI / 2 },
        'S2': { axis: 'z', layer: 1, angle: -Math.PI },
    };

    constructor() {
        this.scene = new THREE.Scene();
        const container = document.getElementById('container');
        
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

        this.camera.position.set(4, 4, 4);
        this.controls.update();

        this.cubeGroup = new THREE.Group();
        this.scene.add(this.cubeGroup);
        this.pieces = [];
        this.isAnimating = false;
        this.solutionChart = null;
        this.currentScramble = '';

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
    }

    // --- Cube Initialization ---
    initializeCube() {
        // Clear existing pieces
        while (this.cubeGroup.children.length > 0) {
            this.cubeGroup.remove(this.cubeGroup.children[0]);
        }
        this.pieces = [];
    
        const pieceSize = 1.2;
        const gap = 0.05;
    
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                for (let z = 0; z < 3; z++) {
                    if (x === 1 && y === 1 && z === 1) continue; // Skip center piece
    
                    const geometry = new THREE.BoxGeometry(pieceSize, pieceSize, pieceSize);
                    const materials = this.createCubeMaterials(x, y, z);
                    const piece = new THREE.Mesh(geometry, materials);
    
                    // Set initial position - this is the solved state position
                    piece.position.set(
                        (x - 1) * (pieceSize + gap),
                        (y - 1) * (pieceSize + gap),
                        (z - 1) * (pieceSize + gap)
                    );
    
                    // Reset rotation to identity
                    piece.rotation.set(0, 0, 0);
                    piece.quaternion.set(0, 0, 0, 1);
                    
                    // Store initial position for layer identification
                    piece.userData = { 
                        initialX: x, 
                        initialY: y, 
                        initialZ: z,
                        // Current layer positions (for visual grouping during moves)
                        currentX: x,
                        currentY: y,
                        currentZ: z
                    };
                    
                    this.pieces.push(piece);
                    this.cubeGroup.add(piece);
                }
            }
        }
    }

    createCubeMaterials(x, y, z) {
        const standardProps = { metalness: 0.3, roughness: 0.7 };
        return [
            new THREE.MeshStandardMaterial({ color: x === 2 ? this.colorMap['R'] : 0x1a1a1a, ...standardProps }), // Right
            new THREE.MeshStandardMaterial({ color: x === 0 ? this.colorMap['L'] : 0x1a1a1a, ...standardProps }), // Left
            new THREE.MeshStandardMaterial({ color: y === 2 ? this.colorMap['U'] : 0x1a1a1a, ...standardProps }), // Up
            new THREE.MeshStandardMaterial({ color: y === 0 ? this.colorMap['D'] : 0x1a1a1a, ...standardProps }), // Down
            new THREE.MeshStandardMaterial({ color: z === 2 ? this.colorMap['F'] : 0x1a1a1a, ...standardProps }), // Front
            new THREE.MeshStandardMaterial({ color: z === 0 ? this.colorMap['B'] : 0x1a1a1a, ...standardProps })  // Back
        ];
    }

    // --- UI Interaction ---
    async shuffleCube() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.updateStatus('Getting scramble...', '#ff9800');
        document.getElementById('solveTime').textContent = 'N/A';
        document.getElementById('solutionLength').textContent = 'N/A';
        document.getElementById('solutionString').style.display = 'none';
        let scrambleDiv = document.getElementById('scrambleString');
        if (scrambleDiv) {
            scrambleDiv.textContent = '';
        }
        if (this.solutionChart) {
            this.solutionChart.destroy();
            this.solutionChart = null;
        }

        // Reset cube to solved state visually
        this.initializeCube();

        try {
            const response = await fetch('/get_scramble');
            const data = await response.json();
            if (data.scramble) {
                this.currentScramble = data.scramble;
                this.updateStatus('Applying scramble...', '#2196F3');
                
                // Animate the scramble moves one by one
                const moves = data.scramble.trim().split(' ').filter(move => move);
                for (let i = 0; i < moves.length; i++) {
                    this.updateStatus(`Scramble move ${i + 1}/${moves.length}: ${moves[i]}`, '#2196F3');
                    await this.performMoveAnimation(moves[i]);
                }
                
                this.updateStatus('Cube scrambled. Ready to solve.', '#4CAF50');
            } else {
                this.updateStatus('Failed to get scramble.', '#f44336');
            }
        } catch (error) {
            console.error('Failed to get scramble:', error);
            this.updateStatus('Error getting scramble.', '#f44336');
        }
        this.isAnimating = false;
        // Print scramble moves just above the solution string
        scrambleDiv = document.getElementById('scrambleString');
        if (!scrambleDiv) {
            scrambleDiv = document.createElement('div');
            scrambleDiv.id = 'scrambleString';
            scrambleDiv.style.fontWeight = 'bold';
            scrambleDiv.style.fontSize = '1.2em';
            scrambleDiv.style.margin = '10px 0 0 0';
            scrambleDiv.style.color = '#ff9800'; // Orange color for scramble
            // Place above the solution string
            const solutionDiv = document.getElementById('solutionString');
            if (solutionDiv && solutionDiv.parentNode) {
                solutionDiv.parentNode.insertBefore(scrambleDiv, solutionDiv);
            }
        }
        scrambleDiv.textContent = `Scramble: ${this.currentScramble}`;
    }

    async solveCube() {
        if (this.isAnimating || !this.currentScramble) {
            this.updateStatus('Scramble the cube first!', '#ff9800');
            return;
        }
        this.isAnimating = true;
        this.updateStatus('Getting cube state...', '#ff9800');

        try {
            // Step 1: Get the state string from the scramble
            const stateResponse = await fetch('/get_state_from_scramble', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scramble: this.currentScramble })
            });

            const stateData = await stateResponse.json();
            if (stateData.error) {
                this.updateStatus(`Error getting state: ${stateData.error}`, '#f44336');
                this.isAnimating = false;
                return;
            }

            this.updateStatus('Solving cube...', '#2196F3');

            // Step 2: Send the state string to the solver
            const solveResponse = await fetch('/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: stateData.state })
            });

            const solveData = await solveResponse.json();
            const solutionDiv = document.getElementById('solutionString');

            if (solveData.solution) {
                document.getElementById('solveTime').textContent = `${solveData.solve_time} ms`;
                document.getElementById('solutionLength').textContent = `${solveData.solution_length} moves`;
                this.renderSolutionChart(solveData.phase1_moves, solveData.phase2_moves);
                this.updateStatus(`Solution Found: ${solveData.solution}`, '#4CAF50');

                // Color phase 1 and phase 2 moves differently
                const moves = solveData.solution.trim().split(' ').filter(move => move);
                const phase1 = solveData.phase1_moves || 0;
                const phase2 = solveData.phase2_moves || 0;
                let html = '';
                for (let i = 0; i < moves.length; i++) {
                    if (i < phase1) {
                        html += `<span style=\"color:#e53935;font-weight:bold;\">${moves[i]}</span> `; // Nice red
                    } else {
                        html += `<span style=\"color:#2196F3;font-weight:bold;\">${moves[i]}</span> `;
                    }
                }
                solutionDiv.innerHTML = `Solution: ${html.trim()}`;
                solutionDiv.style.display = 'block';

                await this.animateSolution(solveData.solution);
                this.currentScramble = '';
            } else {
                this.updateStatus(solveData.error || 'Error solving cube', '#f44336');
                solutionDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Error during solve process:', error);
            this.updateStatus('Error connecting to server', '#f44336');
            document.getElementById('solutionString').style.display = 'none';
        }
        this.isAnimating = false;
    }

    // --- Animation ---
    async animateSolution(solutionString) {
        const moves = solutionString.trim().split(' ').filter(move => move);
        for (let i = 0; i < moves.length; i++) {
            this.updateStatus(`Solution move ${i + 1}/${moves.length}: ${moves[i]}`, '#2196F3');
            await this.performMoveAnimation(moves[i]);
        }
        this.updateStatus('Solution Complete!', '#4CAF50');
    }

    async performMoveAnimation(moveString) {
        const move = RubiksCube.MOVE_MAP[moveString];
        if (!move) return;

        const { axis, layer, angle } = move;
        
        // Select pieces based on their current layer position
        const piecesToMove = this.pieces.filter(piece => {
            if (axis === 'x') return piece.userData.currentX === layer;
            if (axis === 'y') return piece.userData.currentY === layer;
            if (axis === 'z') return piece.userData.currentZ === layer;
        });

        const animationDuration = 200; // ms
        let startTime = null;

        // Store initial positions and rotations
        const initialStates = piecesToMove.map(piece => ({
            piece,
            position: piece.position.clone(),
            quaternion: piece.quaternion.clone()
        }));

        return new Promise(resolve => {
            const animateRotation = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / animationDuration, 1);
                const currentAngle = angle * progress;

                // Create rotation matrix for current frame
                const rotationMatrix = new THREE.Matrix4();
                if (axis === 'x') rotationMatrix.makeRotationX(currentAngle);
                if (axis === 'y') rotationMatrix.makeRotationY(currentAngle);
                if (axis === 'z') rotationMatrix.makeRotationZ(currentAngle);

                // Apply rotation to each piece
                initialStates.forEach(({ piece, position, quaternion }) => {
                    // Apply rotation around the cube center
                    const newPosition = position.clone();
                    newPosition.applyMatrix4(rotationMatrix);
                    piece.position.copy(newPosition);

                    // Apply rotation to the piece's orientation
                    const rotationQuaternion = new THREE.Quaternion();
                    rotationQuaternion.setFromRotationMatrix(rotationMatrix);
                    piece.quaternion.copy(quaternion).premultiply(rotationQuaternion);
                });

                if (progress < 1) {
                    requestAnimationFrame(animateRotation);
                } else {
                    // Update the current layer positions after the move
                    this.updateCurrentLayerPositions(piecesToMove, axis, angle);
                    resolve();
                }
            };
            requestAnimationFrame(animateRotation);
        });
    }

    // Update the current layer positions for visual layer selection
    updateCurrentLayerPositions(pieces, axis, angle) {
        const turns = Math.round(angle / (Math.PI / 2));
        const normalizedTurns = ((turns % 4) + 4) % 4;

        pieces.forEach(piece => {
            const current = piece.userData;
            for (let i = 0; i < normalizedTurns; i++) {
                if (axis === 'x') {
                    // Rotate in YZ plane: (y, z) -> (2-z, y)
                    const tempY = current.currentY;
                    current.currentY = 2 - current.currentZ;
                    current.currentZ = tempY;
                } else if (axis === 'y') {
                    // Rotate in XZ plane: (x, z) -> (z, 2-x)
                    const tempX = current.currentX;
                    current.currentX = current.currentZ;
                    current.currentZ = 2 - tempX;
                } else if (axis === 'z') {
                    // Rotate in XY plane: (x, y) -> (2-y, x)
                    const tempX = current.currentX;
                    current.currentX = 2 - current.currentY;
                    current.currentY = tempX;
                }
            }
        });
    }
    
    // --- UI and Rendering ---
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
                    { label: 'Phase 1 Moves', data: [phase1Moves], backgroundColor: 'rgba(229,57,53,0.8)', borderColor: '#e53935', borderWidth: 2 },
                    { label: 'Phase 2 Moves', data: [phase2Moves], backgroundColor: 'rgba(37, 117, 252, 0.7)', borderColor: '#2196F3', borderWidth: 2 }
                ]
            },
            options: {
                indexAxis: 'y',
                scales: { x: { stacked: true, ticks: { color: 'white' } }, y: { stacked: true, ticks: { color: 'white' } } },
                plugins: { legend: { labels: { color: 'white' } } }
            }
        });
    }
    
// ...existing code...

    setupEventListeners() {
        if (this.eventListenersAttached) return;

        this.controls.addEventListener('start', () => { this.controls.autoRotate = false; });
        this.controls.addEventListener('end', () => {
            setTimeout(() => { if (!this.isAnimating) this.controls.autoRotate = true; }, 3000);
        });

        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffleCube());
        document.getElementById('solveBtn').addEventListener('click', () => this.solveCube());

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
window.addEventListener('DOMContentLoaded', () => {
    if (!window.cubeInstance) {
        window.cubeInstance = new RubiksCube();
    }
});
