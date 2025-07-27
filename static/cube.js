
class RubiksCube {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        document.getElementById('container').appendChild(this.renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
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
            'L': 0xff8000, // Orange - Left
            'B': 0x0000ff  // Blue - Back
        };

        this.initializeCube();
        this.setupEventListeners();
        this.animate();
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

            // Map 3D positions to 2D face positions
            if (x === 2) { // Right face
                const faceIndex = (2 - z) * 3 + y;
                materials[0].color.setHex(this.colorMap[faces.R[faceIndex]]);
            }
            if (x === 0) { // Left face  
                const faceIndex = z * 3 + y;
                materials[1].color.setHex(this.colorMap[faces.L[faceIndex]]);
            }
            if (y === 2) { // Top face
                const faceIndex = (2 - z) * 3 + x;
                materials[2].color.setHex(this.colorMap[faces.U[faceIndex]]);
            }
            if (y === 0) { // Bottom face
                const faceIndex = z * 3 + x;
                materials[3].color.setHex(this.colorMap[faces.D[faceIndex]]);
            }
            if (z === 2) { // Front face
                const faceIndex = (2 - y) * 3 + x;
                materials[4].color.setHex(this.colorMap[faces.F[faceIndex]]);
            }
            if (z === 0) { // Back face
                const faceIndex = (2 - y) * 3 + (2 - x);
                materials[5].color.setHex(this.colorMap[faces.B[faceIndex]]);
            }
        });
    }

    async shuffleCube() {
        if (this.isAnimating) return;
        
        this.updateStatus('Shuffling cube...', '#ff9800');
        
        try {
            const response = await fetch('/shuffle', { method: 'POST' });
            const data = await response.json();
            
            this.updateCubeFromState(data.state);
            this.updateStatus('Cube shuffled! Ready to solve.', '#4CAF50');
        } catch (error) {
            this.updateStatus('Error shuffling cube', '#f44336');
        }
    }

    async solveCube() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.updateStatus('Solving cube...', '#2196F3');
        
        try {
            const response = await fetch('/solve', { method: 'POST' });
            const data = await response.json();
            
            if (data.error) {
                this.updateStatus(`Error: ${data.error}`, '#f44336');
                this.isAnimating = false;
                return;
            }
            
            await this.animateSolution(data.solution);
            this.updateStatus('Cube solved! 🎉', '#4CAF50');
        } catch (error) {
            this.updateStatus('Error solving cube', '#f44336');
        }
        
        this.isAnimating = false;
    }

    async animateSolution(solutionString) {
        const moves = solutionString.split(' ');
        this.updateStatus(`Animating solution: ${moves.length} moves`, '#2196F3');
        
        for (let i = 0; i < moves.length; i++) {
            await this.animateMove(moves[i]);
            await this.delay(500); // Pause between moves
            
            this.updateStatus(`Move ${i + 1}/${moves.length}: ${moves[i]}`, '#2196F3');
        }
    }

    async animateMove(move) {
        // Simple rotation animation for the entire cube group
        // In a full implementation, you'd rotate specific faces
        const axis = move[0];
        const angle = move.includes("'") ? -Math.PI/2 : Math.PI/2;
        const iterations = move.includes('2') ? 2 : 1;
        
        for (let i = 0; i < iterations; i++) {
            await this.rotateCube(axis, angle);
        }
    }

    async rotateCube(axis, angle) {
        return new Promise(resolve => {
            const startRotation = this.cubeGroup.rotation.clone();
            const endRotation = startRotation.clone();
            
            switch(axis) {
                case 'U':
                case 'D':
                    endRotation.y += angle;
                    break;
                case 'R':
                case 'L':
                    endRotation.x += angle;
                    break;
                case 'F':
                case 'B':
                    endRotation.z += angle;
                    break;
            }
            
            const duration = 300;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeInOutCubic(progress);
                
                this.cubeGroup.rotation.copy(startRotation.clone().lerp(endRotation, eased));
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
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

    resetView() {
        this.camera.position.set(5, 5, 5);
        this.cubeGroup.rotation.set(0, 0, 0);
        this.controls.reset();
        this.updateStatus('View reset', '#4CAF50');
    }

    setupEventListeners() {
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            if (!this.isAnimating) this.shuffleCube();
        });
        
        document.getElementById('solveBtn').addEventListener('click', () => {
            if (!this.isAnimating) this.solveCube();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetView();
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the cube when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new RubiksCube();
});
