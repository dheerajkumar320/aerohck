class RubiksCube {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        const container = document.getElementById('container');
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        document.getElementById('container').appendChild(this.renderer.domElement);
        

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);

        // Setup camera controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;

        this.camera.position.set(5, 5, 5);
        this.controls.update();

        // Cube state and pieces
        this.cubeGroup = new THREE.Group();
        this.scene.add(this.cubeGroup);
        this.pieces = [];
        this.isAnimating = false;

        // Color mapping for cube faces
        this.colorMap = {
            'U': 0xffffff, // White - Up
            'R': 0xff0000, // Red - Right  
            'F': 0x00ff00, // Green - Front
            'D': 0xffff00, // Yellow - Down
            'L': 0xffa500, // Orange - Left
            'B': 0x0000ff  // Blue - Back
        };

        this.initializeCube();
        this.setupEventListeners();
        this.animate();
        
        // Initialize with backend state
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
        // Clear existing pieces
        this.pieces.forEach(piece => this.cubeGroup.remove(piece));
        this.pieces = [];

        // Create 3x3x3 cube pieces
        const pieceSize = 0.95;
        const gap = 0.05;

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                for (let z = 0; z < 3; z++) {
                    const geometry = new THREE.BoxGeometry(pieceSize, pieceSize, pieceSize);
                    const materials = this.createCubeMaterials(x, y, z);
                    const cube = new THREE.Mesh(geometry, materials);

                    cube.position.set(
                        (x - 1) * (pieceSize + gap),
                        (y - 1) * (pieceSize + gap),
                        (z - 1) * (pieceSize + gap)
                    );

                    cube.userData = { x, y, z };
                    this.pieces.push(cube);
                    this.cubeGroup.add(cube);
                }
            }
        }
    }

    createCubeMaterials(x, y, z) {
        const materials = [];

        // Right face (x = 2)
        materials.push(new THREE.MeshLambertMaterial({ 
            color: x === 2 ? this.colorMap['R'] : 0x000000 
        }));

        // Left face (x = 0)
        materials.push(new THREE.MeshLambertMaterial({ 
            color: x === 0 ? this.colorMap['L'] : 0x000000 
        }));

        // Top face (y = 2)
        materials.push(new THREE.MeshLambertMaterial({ 
            color: y === 2 ? this.colorMap['U'] : 0x000000 
        }));

        // Bottom face (y = 0)
        materials.push(new THREE.MeshLambertMaterial({ 
            color: y === 0 ? this.colorMap['D'] : 0x000000 
        }));

        // Front face (z = 2)
        materials.push(new THREE.MeshLambertMaterial({ 
            color: z === 2 ? this.colorMap['F'] : 0x000000 
        }));

        // Back face (z = 0)
        materials.push(new THREE.MeshLambertMaterial({ 
            color: z === 0 ? this.colorMap['B'] : 0x000000 
        }));

        return materials;
    }

    updateCubeFromState(stateString) {
        if (stateString.length !== 54) return;
        this.currentStateString = stateString;
        
        // Map state string to cube faces
        // State format: U(9) R(9) F(9) D(9) L(9) B(9)
        const faces = {
            U: stateString.substring(0, 9),
            R: stateString.substring(9, 18),
            F: stateString.substring(18, 27),
            D: stateString.substring(27, 36),
            L: stateString.substring(36, 45),
            B: stateString.substring(45, 54)
        };
        
        // Update piece colors based on state
        this.pieces.forEach(piece => {
            const { x, y, z } = piece.userData;
            const materials = piece.material;
            
            // Right face (x = 2) - R face
            if (x === 2) {
                const faceIndex = (2 - y) * 3 + z;
                materials[0].color.setHex(this.colorMap[faces.R[faceIndex]]);
            }
            
            // Left face (x = 0) - L face  
            if (x === 0) {
                const faceIndex = (2 - y) * 3 + (2 - z);
                materials[1].color.setHex(this.colorMap[faces.L[faceIndex]]);
            }
            
            // Top face (y = 2) - U face
            if (y === 2) {
                const faceIndex = z * 3 + x;
                materials[2].color.setHex(this.colorMap[faces.U[faceIndex]]);
            }
            
            // Bottom face (y = 0) - D face
            if (y === 0) {
                const faceIndex = (2 - z) * 3 + x;
                materials[3].color.setHex(this.colorMap[faces.D[faceIndex]]);
            }
            
            // Front face (z = 2) - F face
            if (z === 2) {
                const faceIndex = y * 3 + x;
                materials[4].color.setHex(this.colorMap[faces.F[faceIndex]]);
            }
            
            // Back face (z = 0) - B face
            if (z === 0) {
                const faceIndex = y * 3 + (2 - x);
                materials[5].color.setHex(this.colorMap[faces.B[faceIndex]]);
            }
        });
        
    }

    async shuffleCube() {
        this.isAnimating = true;
        this.updateStatus('Shuffling cube...', '#ff9800');

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
            console.error('Shuffle error:', error);
            this.updateStatus('Error shuffling cube', '#f44336');
        }

        this.isAnimating = false;
    }

    async solveCube() {
        console.log('🔍 SOLVE CUBE CALLED');
        
        // Prevent multiple simultaneous solve operations
        if (this.isAnimating) {
            console.log('🔍 Solve already in progress, ignoring call');
            return;
        }
        
        this.isAnimating = true;
        this.updateStatus('Solving cube...', '#ff9800');

        try {
            console.log('🔍 Making POST request to /solve');
            const response = await fetch('/solve', { method: 'POST' });
            console.log('🔍 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('🔍 Response data:', data);

            if (data.solution) {
                console.log('🔍 Solution received:', data.solution);
                this.updateStatus(`Solution: ${data.solution}`, '#4CAF50');
                await this.delay(1000); // Brief pause before animation
                console.log('🔍 Starting animation...');
                await this.animateSolution(data.solution);
                
                // Sync with backend after solving
                console.log('🔍 Syncing with backend...');
                await this.syncWithBackend();
            } else if (data.error) {
                console.log('🔍 Error from backend:', data.error);
                this.updateStatus(`Error: ${data.error}`, '#f44336');
            } else {
                console.log('🔍 No solution or error in response');
                this.updateStatus('No solution received', '#f44336');
            }
        } catch (error) {
            console.error('🔍 Solve error:', error);
            this.updateStatus('Error solving cube', '#f44336');
        }

        this.isAnimating = false;
        console.log('🔍 SOLVE CUBE COMPLETED');
    }

    async animateSolution(solutionString) {
        console.log('🔍 ANIMATE SOLUTION CALLED with:', solutionString);
        const moves = solutionString.trim().split(' ').filter(move => move !== '');
        console.log('🔍 Parsed moves:', moves);
        this.currentMoves = moves;
        this.updateStatus(`Animating solution: ${moves.length} moves`, '#2196F3');
        
        for (let i = 0; i < moves.length; i++) {
            if (moves[i]) {
                console.log(`🔍 Processing move ${i + 1}/${moves.length}: ${moves[i]}`);
                this.currentDebugStatus = `Move ${i + 1}/${moves.length}: ${moves[i]}`;
                
                // Apply move to backend
                try {
                    console.log(`🔍 Applying move ${moves[i]} to backend...`);
                    const response = await fetch('/apply_move', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ move: moves[i] })
                    });
                    
                    const data = await response.json();
                    console.log(`🔍 Backend response for move ${moves[i]}:`, data);
                    if (data.status === 'success' && data.new_state) {
                        console.log(`🔍 Updating cube with new state: ${data.new_state}`);
                        this.updateCubeFromState(data.new_state);
                    }
                } catch (error) {
                    console.error(`🔍 Move application error for ${moves[i]}:`, error);
                }
                
                // Just delay instead of animating to avoid conflicts
                await this.delay(300);
                this.updateStatus(`Move ${i + 1}/${moves.length}: ${moves[i]}`, '#2196F3');
            }
        }
        console.log('🔍 ANIMATE SOLUTION COMPLETED');
        this.currentDebugStatus = 'Solution animation complete!';
        this.updateStatus('Solution animation complete!', '#4CAF50');
    }

    async animateMove(move) {
        if (!move || move === '') return;
        this.currentDebugStatus = `Performing move: ${move}`;
        const face = move[0];
        const isPrime = move.includes("'");
        const isDouble = move.includes('2');
        const angle = isPrime ? Math.PI/2 : -Math.PI/2;
        const iterations = isDouble ? 2 : 1;
        for (let i = 0; i < iterations; i++) {
            await this.rotateFace(face, angle);
        }
        this.updateDebugScreen();
    }

    async rotateFace(face, angle) {
        return new Promise(resolve => {
            // Get pieces that belong to this face
            const facePieces = this.getFacePieces(face);
            
            // Create a temporary group for rotation
            const rotationGroup = new THREE.Group();
            this.scene.add(rotationGroup);
            
            // Move pieces to rotation group
            facePieces.forEach(piece => {
                this.cubeGroup.remove(piece);
                rotationGroup.add(piece);
            });
            
            // Set rotation axis
            const axis = this.getRotationAxis(face);
            
            const duration = 300;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeInOutCubic(progress);
                
                const currentAngle = angle * eased;
                rotationGroup.rotation.setFromVector3(axis.clone().multiplyScalar(currentAngle));
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Apply final rotation to pieces and move back to cube group
                    facePieces.forEach(piece => {
                        // Apply the rotation matrix to piece position
                        piece.position.applyAxisAngle(axis, angle);
                        piece.position.round(); // Snap to grid
                        
                        // Update piece rotation
                        piece.rotateOnWorldAxis(axis, angle);
                        
                        rotationGroup.remove(piece);
                        this.cubeGroup.add(piece);
                    });
                    
                    this.scene.remove(rotationGroup);
                    this.updatePieceUserData();
                    resolve();
                }
            };
            
            animate();
        });
    }

    getFacePieces(face) {
        const pieces = [];
        
        this.pieces.forEach(piece => {
            const { x, y, z } = piece.userData;
            
            switch(face) {
                case 'U': // Up face
                    if (y === 2) pieces.push(piece);
                    break;
                case 'D': // Down face
                    if (y === 0) pieces.push(piece);
                    break;
                case 'R': // Right face
                    if (x === 2) pieces.push(piece);
                    break;
                case 'L': // Left face
                    if (x === 0) pieces.push(piece);
                    break;
                case 'F': // Front face
                    if (z === 2) pieces.push(piece);
                    break;
                case 'B': // Back face
                    if (z === 0) pieces.push(piece);
                    break;
            }
        });
        
        return pieces;
    }

    getRotationAxis(face) {
        switch(face) {
            case 'U': return new THREE.Vector3(0, 1, 0);  // Y axis
            case 'D': return new THREE.Vector3(0, -1, 0); // -Y axis
            case 'R': return new THREE.Vector3(1, 0, 0);  // X axis
            case 'L': return new THREE.Vector3(-1, 0, 0); // -X axis
            case 'F': return new THREE.Vector3(0, 0, 1);  // Z axis
            case 'B': return new THREE.Vector3(0, 0, -1); // -Z axis
            default: return new THREE.Vector3(0, 1, 0);
        }
    }

    updatePieceUserData() {
        // Update piece userData to reflect new positions
        this.pieces.forEach(piece => {
            const pos = piece.position;
            piece.userData.x = Math.round(pos.x) + 1;
            piece.userData.y = Math.round(pos.y) + 1;
            piece.userData.z = Math.round(pos.z) + 1;
        });
    }

    async performMove(moveString) {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.currentMoves = this.currentMoves || [];
            this.currentMoves.push(moveString);
        this.currentDebugStatus = `Manual move: ${moveString}`;
            
            try {
                // Send move to backend
                const response = await fetch('/apply_move', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ move: moveString })
                });
                
                const data = await response.json();
                if (data.status === 'success' && data.new_state) {
                    this.updateCubeFromState(data.new_state);
                }
            } catch (error) {
                console.error('Move application error:', error);
            }
            
            await this.animateMove(moveString);
            this.updateStatus(`Executed move: ${moveString}`, '#4CAF50');
            this.isAnimating = false;
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateStatus(message, color = '#333') {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.style.color = color;
    }

    setupEventListeners() {
        // Prevent multiple event listener attachments
        if (this.eventListenersAttached) {
            console.log('🔍 Event listeners already attached, skipping...');
            return;
        }
        
        console.log('🔍 Setting up event listeners...');
        
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            if (!this.isAnimating) this.shuffleCube();
        });

        document.getElementById('solveBtn').addEventListener('click', () => {
            if (!this.isAnimating) this.solveCube();
        });


        // Add manual move controls
        document.addEventListener('keydown', (event) => {
            if (this.isAnimating) return;
            
            const key = event.key.toLowerCase();
            let move = '';
            
            switch(key) {
                case 'u': move = event.shiftKey ? "U'" : 'U'; break;
                case 'r': move = event.shiftKey ? "R'" : 'R'; break;
                case 'f': move = event.shiftKey ? "F'" : 'F'; break;
                case 'd': move = event.shiftKey ? "D'" : 'D'; break;
                case 'l': move = event.shiftKey ? "L'" : 'L'; break;
                case 'b': move = event.shiftKey ? "B'" : 'B'; break;
            }
            
            if (move) {
                event.preventDefault();
                this.performMove(move);
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        this.eventListenersAttached = true;
        console.log('🔍 Event listeners attached successfully');
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
    // Prevent multiple instances
    if (window.cubeInstance) {
        console.log('🔍 Cube instance already exists, reusing...');
        cube = window.cubeInstance;
    } else {
        console.log('🔍 Creating new cube instance...');
        cube = new RubiksCube();
        window.cubeInstance = cube;
    }
});
