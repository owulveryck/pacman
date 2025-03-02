document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const scoreElement = document.getElementById('score');
    const soundToggle = document.getElementById('soundToggle');
    
    // Mobile control buttons
    const upButton = document.getElementById('upButton');
    const downButton = document.getElementById('downButton');
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');
    
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Adjust canvas size for mobile if needed
    function resizeCanvas() {
        if (isMobile) {
            // Get the container width for responsive sizing
            const containerWidth = canvas.parentElement.clientWidth * 0.95;
            
            // Maintain aspect ratio of the original game (448×496)
            const aspectRatio = 496/448;
            
            const newWidth = Math.min(containerWidth, window.innerWidth * 0.95);
            const newHeight = newWidth * aspectRatio;
            
            // Set canvas display size (CSS)
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
        }
    }
    
    // Initial resize and add event listener for orientation changes
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
    
    // Using Web Audio API for sound effects
    
    // Use these simple audio beeps instead of MP3 files
    function playSound(soundName) {
        if (soundToggle.checked) {
            // Create audio context if it doesn't exist
            if (!window.audioContext) {
                try {
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    window.audioContext = new AudioContext();
                } catch (e) {
                    console.log('Web Audio API not supported');
                    return;
                }
            }
            
            // Make different sounds based on the sound name
            let oscillator = window.audioContext.createOscillator();
            let gainNode = window.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(window.audioContext.destination);
            
            // Different sound parameters for different actions
            switch(soundName) {
                case 'wakawaka':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(800, window.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(600, window.audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.2, window.audioContext.currentTime);
                    oscillator.start();
                    oscillator.stop(window.audioContext.currentTime + 0.15);
                    break;
                case 'eatGhost':
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(300, window.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(600, window.audioContext.currentTime + 0.1);
                    oscillator.frequency.setValueAtTime(900, window.audioContext.currentTime + 0.2);
                    gainNode.gain.setValueAtTime(0.3, window.audioContext.currentTime);
                    oscillator.start();
                    oscillator.stop(window.audioContext.currentTime + 0.3);
                    break;
                case 'death':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.setValueAtTime(800, window.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(700, window.audioContext.currentTime + 0.1);
                    oscillator.frequency.setValueAtTime(600, window.audioContext.currentTime + 0.2);
                    oscillator.frequency.setValueAtTime(500, window.audioContext.currentTime + 0.3);
                    oscillator.frequency.setValueAtTime(400, window.audioContext.currentTime + 0.4);
                    oscillator.frequency.setValueAtTime(300, window.audioContext.currentTime + 0.5);
                    gainNode.gain.setValueAtTime(0.3, window.audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, window.audioContext.currentTime + 0.5);
                    oscillator.start();
                    oscillator.stop(window.audioContext.currentTime + 0.7);
                    break;
                case 'powerPellet':
                    oscillator.type = 'triangle';
                    oscillator.frequency.setValueAtTime(800, window.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(1000, window.audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.3, window.audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, window.audioContext.currentTime + 0.3);
                    oscillator.start();
                    oscillator.stop(window.audioContext.currentTime + 0.4);
                    break;
                case 'start':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(400, window.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(600, window.audioContext.currentTime + 0.2);
                    oscillator.frequency.setValueAtTime(800, window.audioContext.currentTime + 0.4);
                    gainNode.gain.setValueAtTime(0.3, window.audioContext.currentTime);
                    oscillator.start();
                    oscillator.stop(window.audioContext.currentTime + 0.6);
                    break;
            }
        }
    }
    
    // Wakawaka sound timing
    let wakawakaSound = false;
    let lastDotEaten = 0;
    
    // Game constants
    const CELL_SIZE = 16;
    const ROWS = 31;
    const COLS = 28;
    const PACMAN_RADIUS = CELL_SIZE / 2;

    // Game variables
    let score = 0;
    let gameRunning = false;
    let animationId;
    
    // Ghost properties with staggered release times
    const ghosts = [
        {
            x: 13.5 * CELL_SIZE, // Centered in the ghost house
            y: 11 * CELL_SIZE,   // Start at the ghost house exit
            color: 'red',
            originalColor: 'red',
            speed: 1.8, // Fastest ghost
            direction: 'left',
            lastDirection: 'left',
            vulnerable: false,
            radius: CELL_SIZE / 2,
            returnToOriginalColor() {
                this.color = this.originalColor;
            },
            description: 'Blinky - Directly targets Pacman',
            movementMode: 'chase', // Modes: chase, scatter, frightened
            releaseTime: 0, // Immediate release (frames)
            released: false
        },
        {
            x: 13.5 * CELL_SIZE,
            y: 14 * CELL_SIZE,
            color: 'pink',
            originalColor: 'pink',
            speed: 1.7,
            direction: 'up',
            lastDirection: 'up',
            vulnerable: false,
            radius: CELL_SIZE / 2,
            returnToOriginalColor() {
                this.color = this.originalColor;
            },
            description: 'Pinky - Tries to ambush Pacman',
            movementMode: 'chase',
            releaseTime: 120, // 2 seconds at 60fps
            released: false
        },
        {
            x: 12 * CELL_SIZE,
            y: 14 * CELL_SIZE,
            color: 'cyan',
            originalColor: 'cyan',
            speed: 1.65,
            direction: 'up',
            lastDirection: 'up',
            vulnerable: false,
            radius: CELL_SIZE / 2,
            returnToOriginalColor() {
                this.color = this.originalColor;
            },
            description: 'Inky - Unpredictable movement based on Blinky and Pacman',
            movementMode: 'chase',
            releaseTime: 240, // 4 seconds
            released: false
        },
        {
            x: 15 * CELL_SIZE,
            y: 14 * CELL_SIZE,
            color: 'orange',
            originalColor: 'orange',
            speed: 1.6,
            direction: 'up',
            lastDirection: 'up',
            vulnerable: false,
            radius: CELL_SIZE / 2,
            returnToOriginalColor() {
                this.color = this.originalColor;
            },
            description: 'Clyde - Shy, stays away when close, pursues when far',
            movementMode: 'chase',
            releaseTime: 360, // 6 seconds
            released: false
        }
    ];

    // Define maze layout - 0: empty, 1: wall, 2: dot, 3: power pellet
    const maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1],
        [1,3,1,0,0,1,2,1,0,0,1,2,1,1,2,1,0,0,1,2,1,0,0,1,2,1,3,1],
        [1,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1,2,1],
        [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1,2,1],
        [1,2,2,2,2,2,2,1,1,2,2,2,1,1,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,2,1,1,1,1,0,1,1,0,1,1,1,1,2,1,1,1,1,1,1,1,1],
        [0,0,0,0,0,1,2,1,1,1,1,0,1,1,0,1,1,1,1,2,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,2,1,1,0,1,1,0,0,1,1,0,1,1,2,1,0,0,0,0,0,0,0],
        [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1,1,1],
        [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0,0,0],
        [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1,1,1],
        [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0,0,0],
        [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1],
        [1,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1],
        [1,3,2,2,1,1,2,2,2,2,2,2,0,0,2,2,2,2,2,2,1,1,2,2,2,2,3,1],
        [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1,1,1],
        [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1,1,1],
        [1,2,2,2,2,2,2,1,1,2,2,2,1,1,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1],
        [1,2,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    
    // Pacman properties
    const pacman = {
        x: 14 * CELL_SIZE,
        y: 23 * CELL_SIZE,
        radius: PACMAN_RADIUS,
        speed: 2,
        direction: 'right',
        nextDirection: null,
        mouthOpen: 0.2,
        mouthChange: 0.02,
        mouthMax: 0.2
    };
    
    // Controls
    const keys = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false
    };
    
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = true;
            
            if (e.key === 'ArrowUp') pacman.nextDirection = 'up';
            if (e.key === 'ArrowDown') pacman.nextDirection = 'down';
            if (e.key === 'ArrowLeft') pacman.nextDirection = 'left';
            if (e.key === 'ArrowRight') pacman.nextDirection = 'right';
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = false;
        }
    });
    
    // Touch controls for mobile
    // Handle button presses for the D-pad
    function addTouchHandlers(button, direction) {
        // Touch events
        button.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling when touching the button
            pacman.nextDirection = direction;
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent scrolling
        });
        
        // Mouse events for testing on desktop
        button.addEventListener('mousedown', () => {
            pacman.nextDirection = direction;
        });
        
        // Add click handler for mobile devices that might interpret taps as clicks
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default behavior
            pacman.nextDirection = direction;
        });
    }
    
    // Show mobile controls programmatically if we detect a mobile device
    if (isMobile) {
        document.querySelector('.mobile-controls').style.display = 'block';
    }
    
    // Add touch handlers to the direction buttons
    addTouchHandlers(upButton, 'up');
    addTouchHandlers(downButton, 'down');
    addTouchHandlers(leftButton, 'left');
    addTouchHandlers(rightButton, 'right');
    
    // Add swipe controls on the game canvas itself
    let touchStartX = 0;
    let touchStartY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling when swiping on the canvas
    });
    
    canvas.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        // Calculate the distance and direction of the swipe
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        // Determine if the swipe was horizontal or vertical
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 20) {
                pacman.nextDirection = 'right';
            } else if (dx < -20) {
                pacman.nextDirection = 'left';
            }
        } else {
            // Vertical swipe
            if (dy > 20) {
                pacman.nextDirection = 'down';
            } else if (dy < -20) {
                pacman.nextDirection = 'up';
            }
        }
    });
    
    // Draw functions
    function drawMaze() {
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cell = maze[row][col];
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                
                if (cell === 1) {
                    // Wall
                    ctx.fillStyle = '#0000FF';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                } else if (cell === 2) {
                    // Dot
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (cell === 3) {
                    // Power pellet
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    function drawPacman() {
        const { x, y, radius, direction, mouthOpen } = pacman;
        
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        
        let startAngle, endAngle;
        
        switch (direction) {
            case 'right':
                startAngle = mouthOpen * Math.PI;
                endAngle = (2 - mouthOpen) * Math.PI;
                break;
            case 'left':
                startAngle = (1 + mouthOpen) * Math.PI;
                endAngle = (3 - mouthOpen) * Math.PI;
                break;
            case 'up':
                startAngle = (1.5 + mouthOpen) * Math.PI;
                endAngle = (3.5 - mouthOpen) * Math.PI;
                break;
            case 'down':
                startAngle = (0.5 + mouthOpen) * Math.PI;
                endAngle = (2.5 - mouthOpen) * Math.PI;
                break;
        }
        
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.lineTo(x, y);
        ctx.fill();
    }
    
    function updatePacman() {
        // Animate mouth
        pacman.mouthOpen += pacman.mouthChange;
        if (pacman.mouthOpen > pacman.mouthMax || pacman.mouthOpen < 0) {
            pacman.mouthChange = -pacman.mouthChange;
        }
        
        // Try to change direction
        if (pacman.nextDirection) {
            const nextMove = checkNextMove(pacman.nextDirection);
            if (nextMove) {
                pacman.direction = pacman.nextDirection;
                pacman.nextDirection = null;
            }
        }
        
        // Move pacman
        move();
        
        // Check for dots
        checkDotCollision();
    }
    
    function checkNextMove(direction) {
        const { x, y, radius, speed } = pacman;
        
        // Calculate cell position
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);
        
        // Check if we can move in that direction
        switch (direction) {
            case 'up':
                return maze[row - 1] && maze[row - 1][col] !== 1;
            case 'down':
                return maze[row + 1] && maze[row + 1][col] !== 1;
            case 'left':
                return maze[row][col - 1] !== 1;
            case 'right':
                return maze[row][col + 1] !== 1;
        }
        
        return false;
    }
    
    function move() {
        const { x, y, speed, direction } = pacman;
        
        // Calculate cell position
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);
        
        // Align Pacman to the center of the lane when changing directions
        const centerX = col * CELL_SIZE + CELL_SIZE / 2;
        const centerY = row * CELL_SIZE + CELL_SIZE / 2;
        
        // Move in current direction if possible
        switch (direction) {
            case 'up':
                if (row > 0 && maze[row - 1][col] !== 1) {
                    // Align horizontally when moving vertically
                    if (Math.abs(x - centerX) < speed) {
                        pacman.x = centerX;
                    } else if (x < centerX) {
                        pacman.x += Math.min(speed * 0.5, centerX - x);
                    } else if (x > centerX) {
                        pacman.x -= Math.min(speed * 0.5, x - centerX);
                    }
                    
                    pacman.y -= speed;
                }
                break;
            case 'down':
                if (row < ROWS - 1 && maze[row + 1][col] !== 1) {
                    // Align horizontally when moving vertically
                    if (Math.abs(x - centerX) < speed) {
                        pacman.x = centerX;
                    } else if (x < centerX) {
                        pacman.x += Math.min(speed * 0.5, centerX - x);
                    } else if (x > centerX) {
                        pacman.x -= Math.min(speed * 0.5, x - centerX);
                    }
                    
                    pacman.y += speed;
                }
                break;
            case 'left':
                if (col > 0 && maze[row][col - 1] !== 1) {
                    // Align vertically when moving horizontally
                    if (Math.abs(y - centerY) < speed) {
                        pacman.y = centerY;
                    } else if (y < centerY) {
                        pacman.y += Math.min(speed * 0.5, centerY - y);
                    } else if (y > centerY) {
                        pacman.y -= Math.min(speed * 0.5, y - centerY);
                    }
                    
                    pacman.x -= speed;
                }
                // Wrap around through tunnel
                if (pacman.x < 0) {
                    pacman.x = COLS * CELL_SIZE;
                }
                break;
            case 'right':
                if (col < COLS - 1 && maze[row][col + 1] !== 1) {
                    // Align vertically when moving horizontally
                    if (Math.abs(y - centerY) < speed) {
                        pacman.y = centerY;
                    } else if (y < centerY) {
                        pacman.y += Math.min(speed * 0.5, centerY - y);
                    } else if (y > centerY) {
                        pacman.y -= Math.min(speed * 0.5, y - centerY);
                    }
                    
                    pacman.x += speed;
                }
                // Wrap around through tunnel
                if (pacman.x > COLS * CELL_SIZE) {
                    pacman.x = 0;
                }
                break;
        }
    }
    
    function checkDotCollision() {
        const col = Math.floor(pacman.x / CELL_SIZE);
        const row = Math.floor(pacman.y / CELL_SIZE);
        
        // Check if pacman is centered enough in the cell
        const centerX = col * CELL_SIZE + CELL_SIZE / 2;
        const centerY = row * CELL_SIZE + CELL_SIZE / 2;
        
        const distance = Math.sqrt(
            Math.pow(pacman.x - centerX, 2) + Math.pow(pacman.y - centerY, 2)
        );
        
        // Increasing the collision radius to make it easier to eat dots
        if (distance < CELL_SIZE / 2) {
            if (maze[row][col] === 2) {
                // Eat dot
                maze[row][col] = 0;
                score += 10;
                updateScore();
                
                // Play wakawaka sound, alternating between true/false for sound variety
                if (Date.now() - lastDotEaten > 150) { // Don't play too frequently
                    wakawakaSound = !wakawakaSound;
                    playSound('wakawaka');
                    lastDotEaten = Date.now();
                }
            } else if (maze[row][col] === 3) {
                // Eat power pellet
                maze[row][col] = 0;
                score += 50;
                updateScore();
                // Make ghosts vulnerable
                makeGhostsVulnerable();
                
                // Play power pellet sound
                playSound('powerPellet');
            }
        }
    }
    
    function makeGhostsVulnerable() {
        // Make ghosts vulnerable for 10 seconds
        for (let ghost of ghosts) {
            ghost.vulnerable = true;
            ghost.color = 'blue';
            ghost.movementMode = 'frightened';
            
            // Flash before returning to normal
            setTimeout(() => {
                if (ghost.vulnerable) {
                    // Start flashing blue/white to indicate power-up ending
                    ghost.flashInterval = setInterval(() => {
                        ghost.color = ghost.color === 'blue' ? 'white' : 'blue';
                    }, 250);
                }
            }, 7000);
        }
        
        // Return to normal after 10 seconds
        setTimeout(() => {
            for (let ghost of ghosts) {
                ghost.vulnerable = false;
                ghost.movementMode = 'chase';
                ghost.returnToOriginalColor();
                
                // Clear flashing interval if it exists
                if (ghost.flashInterval) {
                    clearInterval(ghost.flashInterval);
                    ghost.flashInterval = null;
                }
            }
        }, 10000);
    }
    
    function updateScore() {
        scoreElement.textContent = score;
    }
    
    function drawGhost(ghost) {
        const { x, y, color, radius } = ghost;
        
        // Draw ghost body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, Math.PI, 0, false);
        ctx.lineTo(x + radius, y + radius);
        
        // Draw the zigzag bottom
        const segments = 3;
        const segmentWidth = 2 * radius / segments;
        
        for (let i = 0; i < segments; i++) {
            const startX = x + radius - (i * segmentWidth);
            const endX = startX - segmentWidth / 2;
            const finalX = startX - segmentWidth;
            
            ctx.lineTo(endX, y + radius - 2);
            ctx.lineTo(finalX, y + radius);
        }
        
        ctx.lineTo(x - radius, y);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x - radius/2.5, y - radius/5, radius/3, 0, Math.PI * 2);
        ctx.arc(x + radius/2.5, y - radius/5, radius/3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw pupils
        ctx.fillStyle = "black";
        
        // Position pupils based on ghost direction
        let leftPupilX = x - radius/2.5;
        let rightPupilX = x + radius/2.5;
        let leftPupilY = y - radius/5;
        let rightPupilY = y - radius/5;
        
        switch(ghost.direction) {
            case 'left':
                leftPupilX -= radius/6;
                rightPupilX -= radius/6;
                break;
            case 'right':
                leftPupilX += radius/6;
                rightPupilX += radius/6;
                break;
            case 'up':
                leftPupilY -= radius/6;
                rightPupilY -= radius/6;
                break;
            case 'down':
                leftPupilY += radius/6;
                rightPupilY += radius/6;
                break;
        }
        
        ctx.beginPath();
        ctx.arc(leftPupilX, leftPupilY, radius/6, 0, Math.PI * 2);
        ctx.arc(rightPupilX, rightPupilY, radius/6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Frame counter for ghost release timing
    let frameCount = 0;
    
    function updateGhosts() {
        frameCount++;
        
        for (let ghost of ghosts) {
            // Check if it's time to release this ghost
            if (!ghost.released && frameCount >= ghost.releaseTime) {
                ghost.released = true;
                
                // Position ghost at the exit point if not already released
                if (ghost.originalColor !== 'red') { // Red starts at exit
                    ghost.x = 13.5 * CELL_SIZE;
                    ghost.y = 11 * CELL_SIZE;
                    ghost.direction = 'left';
                    ghost.lastDirection = 'left';
                }
            }
            
            // Only move ghosts that have been released
            if (ghost.released) {
                moveGhost(ghost);
                checkGhostCollision(ghost);
            } else {
                // If not released, perform a simple animation inside the ghost house
                animateGhostInHouse(ghost);
            }
        }
    }
    
    function animateGhostInHouse(ghost) {
        // Simple up and down movement inside the ghost house
        if (ghost.direction === 'up') {
            ghost.y -= 0.5;
            if (ghost.y < 13.5 * CELL_SIZE) {
                ghost.direction = 'down';
            }
        } else {
            ghost.y += 0.5;
            if (ghost.y > 14.5 * CELL_SIZE) {
                ghost.direction = 'up';
            }
        }
    }
    
    // Track which nodes to avoid for each ghost (to prevent oscillating)
    const avoidNodes = {
        'red': new Set(),
        'pink': new Set(),
        'cyan': new Set(),
        'orange': new Set()
    };
    
    // Get the node key for a cell
    function getNodeKey(row, col) {
        return `${row},${col}`;
    }
    
    // Check if a position is a valid cell in the maze
    function isValidCell(row, col) {
        return row >= 0 && row < ROWS && col >= 0 && col < COLS && maze[row][col] !== 1;
    }
    
    // Calculate Manhattan distance
    function manhattanDistance(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) + Math.abs(c1 - c2);
    }
    
    // Find path using A* algorithm for more intelligent ghost movement
    function findPath(ghost, startRow, startCol, targetRow, targetCol) {
        // If target is a wall, find the nearest valid cell
        if (targetRow < 0 || targetRow >= ROWS || targetCol < 0 || targetCol >= COLS || maze[targetRow][targetCol] === 1) {
            let nearestRow = targetRow;
            let nearestCol = targetCol;
            let minDistance = Infinity;
            
            // Search for nearest valid cell
            for (let r = Math.max(0, targetRow - 3); r <= Math.min(ROWS - 1, targetRow + 3); r++) {
                for (let c = Math.max(0, targetCol - 3); c <= Math.min(COLS - 1, targetCol + 3); c++) {
                    if (maze[r][c] !== 1) {
                        const dist = Math.sqrt(Math.pow(targetRow - r, 2) + Math.pow(targetCol - c, 2));
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestRow = r;
                            nearestCol = c;
                        }
                    }
                }
            }
            
            targetRow = nearestRow;
            targetCol = nearestCol;
        }
        
        // Implementation of A* algorithm
        const openSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = getNodeKey(startRow, startCol);
        const targetKey = getNodeKey(targetRow, targetCol);
        
        openSet.add(startKey);
        gScore.set(startKey, 0);
        fScore.set(startKey, manhattanDistance(startRow, startCol, targetRow, targetCol));
        
        // Get the color key for ghost's avoid nodes
        const colorKey = ghost.originalColor || ghost.color;
        const ghostAvoidNodes = avoidNodes[colorKey] || new Set();
        
        while (openSet.size > 0) {
            // Find node with lowest fScore
            let currentKey = null;
            let lowestFScore = Infinity;
            
            for (const key of openSet) {
                if (fScore.get(key) < lowestFScore) {
                    lowestFScore = fScore.get(key);
                    currentKey = key;
                }
            }
            
            if (currentKey === targetKey) {
                // Reconstruct path
                const path = [];
                let current = currentKey;
                
                while (current) {
                    const [row, col] = current.split(',').map(Number);
                    path.unshift({ row, col });
                    current = cameFrom.get(current);
                }
                
                // If path has at least 2 nodes, return the direction to the next node
                if (path.length >= 2) {
                    const nextNode = path[1];
                    if (nextNode.row < startRow) return 'up';
                    if (nextNode.row > startRow) return 'down';
                    if (nextNode.col < startCol) return 'left';
                    if (nextNode.col > startCol) return 'right';
                }
                
                // Fallback if path is incomplete or only has start node
                return null;
            }
            
            openSet.delete(currentKey);
            const [currentRow, currentCol] = currentKey.split(',').map(Number);
            
            // Check all neighbors
            const neighbors = [
                { row: currentRow - 1, col: currentCol, dir: 'up' },
                { row: currentRow + 1, col: currentCol, dir: 'down' },
                { row: currentRow, col: currentCol - 1, dir: 'left' },
                { row: currentRow, col: currentCol + 1, dir: 'right' }
            ];
            
            for (const neighbor of neighbors) {
                const { row, col } = neighbor;
                
                // Skip invalid cells and walls
                if (!isValidCell(row, col)) continue;
                
                const neighborKey = getNodeKey(row, col);
                
                // Add penalty for recently visited nodes to prevent oscillation
                let penalty = 0;
                if (ghostAvoidNodes.has(neighborKey)) {
                    penalty = 5; // Make recently visited nodes less desirable
                }
                
                // Calculate tentative gScore
                const tentativeGScore = gScore.get(currentKey) + 1 + penalty;
                
                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    // This path is better
                    cameFrom.set(neighborKey, currentKey);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + manhattanDistance(row, col, targetRow, targetCol));
                    
                    if (!openSet.has(neighborKey)) {
                        openSet.add(neighborKey);
                    }
                }
            }
        }
        
        // No path found
        return null;
    }
    
    function moveGhost(ghost) {
        // Calculate cell position
        const col = Math.floor(ghost.x / CELL_SIZE);
        const row = Math.floor(ghost.y / CELL_SIZE);
        
        // Check if at center of cell to make a decision
        const centerX = col * CELL_SIZE + CELL_SIZE / 2;
        const centerY = row * CELL_SIZE + CELL_SIZE / 2;
        const nearCenter = Math.abs(ghost.x - centerX) < 2 && Math.abs(ghost.y - centerY) < 2;
        
        // Always ensure ghost is at exact center when changing direction to avoid getting stuck
        if (nearCenter) {
            // Snap to center to avoid getting stuck
            ghost.x = centerX;
            ghost.y = centerY;
            
            // Mark this node as recently visited
            const colorKey = ghost.originalColor || ghost.color;
            const nodeKey = getNodeKey(row, col);
            
            if (!avoidNodes[colorKey]) {
                avoidNodes[colorKey] = new Set();
            }
            
            avoidNodes[colorKey].add(nodeKey);
            
            // Limit the size of avoid nodes set to prevent memory issues
            if (avoidNodes[colorKey].size > 20) {
                const iterator = avoidNodes[colorKey].values();
                avoidNodes[colorKey].delete(iterator.next().value);
            }
            
            // Decide target position based on ghost's personality
            let targetRow, targetCol;
            
            if (ghost.vulnerable) {
                // When vulnerable, calculate a position away from Pacman
                const pacmanRow = Math.floor(pacman.y / CELL_SIZE);
                const pacmanCol = Math.floor(pacman.x / CELL_SIZE);
                
                // Find the furthest corner from Pacman
                const corners = [
                    { row: 1, col: 1 },
                    { row: 1, col: COLS - 2 },
                    { row: ROWS - 2, col: 1 },
                    { row: ROWS - 2, col: COLS - 2 }
                ];
                
                let furthestCorner = corners[0];
                let maxDistance = -Infinity;
                
                for (const corner of corners) {
                    const distance = Math.sqrt(
                        Math.pow(pacmanRow - corner.row, 2) + Math.pow(pacmanCol - corner.col, 2)
                    );
                    
                    if (distance > maxDistance) {
                        maxDistance = distance;
                        furthestCorner = corner;
                    }
                }
                
                // Add some randomness to vulnerable ghost movement
                if (Math.random() < 0.3) {
                    // Random movement occasionally
                    const randomDirections = ['up', 'down', 'left', 'right'];
                    let validDirections = [];
                    
                    if (isValidCell(row - 1, col)) validDirections.push('up');
                    if (isValidCell(row + 1, col)) validDirections.push('down');
                    if (isValidCell(row, col - 1)) validDirections.push('left');
                    if (isValidCell(row, col + 1)) validDirections.push('right');
                    
                    if (validDirections.length > 0) {
                        ghost.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                    }
                } else {
                    // Head toward the furthest corner
                    targetRow = furthestCorner.row;
                    targetCol = furthestCorner.col;
                    
                    const newDirection = findPath(ghost, row, col, targetRow, targetCol);
                    if (newDirection) {
                        ghost.direction = newDirection;
                    }
                }
            } else {
                // Not vulnerable - use specific ghost strategies
                const pacmanRow = Math.floor(pacman.y / CELL_SIZE);
                const pacmanCol = Math.floor(pacman.x / CELL_SIZE);
                
                // Each ghost has a different targeting strategy
                // Add randomness to ghost targeting to create variety in their movements
                const randomOffset = () => Math.floor(Math.random() * 5) - 2; // Random value between -2 and 2
                
                if (ghost.originalColor === 'red') {
                    // Red ghost (Blinky) - directly targets Pacman's exact position, very aggressive
                    targetRow = pacmanRow;
                    targetCol = pacmanCol;
                    
                    // Use A* to find path to target
                    const newDirection = findPath(ghost, row, col, targetRow, targetCol);
                    if (newDirection) {
                        ghost.direction = newDirection;
                    } else {
                        // If A* fails, try basic direction choice
                        const validDirections = [];
                        if (isValidCell(row-1, col)) validDirections.push('up');
                        if (isValidCell(row+1, col)) validDirections.push('down');
                        if (isValidCell(row, col-1)) validDirections.push('left');
                        if (isValidCell(row, col+1)) validDirections.push('right');
                        
                        // Choose direction that gets closest to Pacman
                        let bestDirection = null;
                        let bestDistance = Infinity;
                        
                        for (const dir of validDirections) {
                            let newRow = row;
                            let newCol = col;
                            
                            if (dir === 'up') newRow--;
                            else if (dir === 'down') newRow++;
                            else if (dir === 'left') newCol--;
                            else if (dir === 'right') newCol++;
                            
                            const distance = Math.abs(pacmanRow - newRow) + Math.abs(pacmanCol - newCol);
                            if (distance < bestDistance) {
                                bestDistance = distance;
                                bestDirection = dir;
                            }
                        }
                        
                        if (bestDirection) {
                            ghost.direction = bestDirection;
                        } else if (validDirections.length > 0) {
                            ghost.direction = validDirections[0];
                        }
                    }
                }
                else if (ghost.originalColor === 'pink') {
                    // Pink ghost (Pinky) - targets 4 spaces ahead of Pacman
                    let offset = 4;
                    
                    // Calculate target position based on Pacman's direction
                    if (pacman.direction === 'up') {
                        targetRow = Math.max(0, pacmanRow - offset);
                        targetCol = pacmanCol;
                    } else if (pacman.direction === 'down') {
                        targetRow = Math.min(ROWS - 1, pacmanRow + offset);
                        targetCol = pacmanCol;
                    } else if (pacman.direction === 'left') {
                        targetRow = pacmanRow;
                        targetCol = Math.max(0, pacmanCol - offset);
                    } else if (pacman.direction === 'right') {
                        targetRow = pacmanRow;
                        targetCol = Math.min(COLS - 1, pacmanCol + offset);
                    }
                    
                    // Use A* to find path to target
                    const newDirection = findPath(ghost, row, col, targetRow, targetCol);
                    if (newDirection) {
                        ghost.direction = newDirection;
                    } else {
                        // If A* fails, try direct path to target
                        const validDirections = [];
                        if (isValidCell(row-1, col)) validDirections.push('up');
                        if (isValidCell(row+1, col)) validDirections.push('down');
                        if (isValidCell(row, col-1)) validDirections.push('left');
                        if (isValidCell(row, col+1)) validDirections.push('right');
                        
                        // Choose direction that gets closest to target position
                        let bestDirection = null;
                        let bestDistance = Infinity;
                        
                        for (const dir of validDirections) {
                            let newRow = row;
                            let newCol = col;
                            
                            if (dir === 'up') newRow--;
                            else if (dir === 'down') newRow++;
                            else if (dir === 'left') newCol--;
                            else if (dir === 'right') newCol++;
                            
                            const distance = Math.abs(targetRow - newRow) + Math.abs(targetCol - newCol);
                            if (distance < bestDistance) {
                                bestDistance = distance;
                                bestDirection = dir;
                            }
                        }
                        
                        if (bestDirection) {
                            ghost.direction = bestDirection;
                        } else if (validDirections.length > 0) {
                            ghost.direction = validDirections[0];
                        }
                    }
                }
                else if (ghost.originalColor === 'cyan') {
                    // Cyan ghost (Inky) - targeting based on both red ghost and Pacman
                    const redGhost = ghosts.find(g => g.originalColor === 'red');
                    
                    if (redGhost) {
                        const redRow = Math.floor(redGhost.y / CELL_SIZE);
                        const redCol = Math.floor(redGhost.x / CELL_SIZE);
                        
                        // Get position 2 tiles ahead of Pacman (pivot point)
                        let pivotRow = pacmanRow;
                        let pivotCol = pacmanCol;
                        
                        if (pacman.direction === 'up') {
                            pivotRow = Math.max(0, pacmanRow - 2);
                        } else if (pacman.direction === 'down') {
                            pivotRow = Math.min(ROWS - 1, pacmanRow + 2);
                        } else if (pacman.direction === 'left') {
                            pivotCol = Math.max(0, pacmanCol - 2);
                        } else if (pacman.direction === 'right') {
                            pivotCol = Math.min(COLS - 1, pacmanCol + 2);
                        }
                        
                        // Calculate vector from Red ghost to pivot point
                        const vectorRow = pivotRow - redRow;
                        const vectorCol = pivotCol - redCol;
                        
                        // Double the vector to get Inky's target
                        targetRow = Math.max(0, Math.min(ROWS - 1, pivotRow + vectorRow));
                        targetCol = Math.max(0, Math.min(COLS - 1, pivotCol + vectorCol));
                    } else {
                        // Without Red ghost, just target Pacman
                        targetRow = pacmanRow;
                        targetCol = pacmanCol;
                    }
                    
                    // Try to use A* for path finding
                    const newDirection = findPath(ghost, row, col, targetRow, targetCol);
                    if (newDirection) {
                        ghost.direction = newDirection;
                    } else {
                        // If A* fails, use basic targeting
                        const validDirections = [];
                        if (isValidCell(row-1, col)) validDirections.push('up');
                        if (isValidCell(row+1, col)) validDirections.push('down');
                        if (isValidCell(row, col-1)) validDirections.push('left');
                        if (isValidCell(row, col+1)) validDirections.push('right');
                        
                        // Choose direction that gets closest to target
                        let bestDirection = null;
                        let bestDistance = Infinity;
                        
                        for (const dir of validDirections) {
                            let newRow = row;
                            let newCol = col;
                            
                            if (dir === 'up') newRow--;
                            else if (dir === 'down') newRow++;
                            else if (dir === 'left') newCol--;
                            else if (dir === 'right') newCol++;
                            
                            const distance = Math.abs(targetRow - newRow) + Math.abs(targetCol - newCol);
                            if (distance < bestDistance) {
                                bestDistance = distance;
                                bestDirection = dir;
                            }
                        }
                        
                        if (bestDirection) {
                            ghost.direction = bestDirection;
                        } else if (validDirections.length > 0) {
                            ghost.direction = validDirections[0];
                        }
                    }
                }
                else if (ghost.originalColor === 'orange') {
                    // Orange ghost (Clyde) - targets Pacman when far, but moves away when close
                    const distanceToPacman = Math.sqrt(
                        Math.pow(pacmanRow - row, 2) + Math.pow(pacmanCol - col, 2)
                    );
                    
                    // Fixed threshold for more predictable behavior
                    const shyThreshold = 8;
                    
                    if (distanceToPacman <= shyThreshold) {
                        // When close, head to bottom-left corner
                        targetRow = ROWS - 2;
                        targetCol = 1;
                    } else {
                        // When far, directly chase Pacman
                        targetRow = pacmanRow;
                        targetCol = pacmanCol;
                    }
                    
                    // Use A* to find path to target
                    const newDirection = findPath(ghost, row, col, targetRow, targetCol);
                    if (newDirection) {
                        ghost.direction = newDirection;
                    } else {
                        // If A* fails, use basic targeting
                        const validDirections = [];
                        if (isValidCell(row-1, col)) validDirections.push('up');
                        if (isValidCell(row+1, col)) validDirections.push('down');
                        if (isValidCell(row, col-1)) validDirections.push('left');
                        if (isValidCell(row, col+1)) validDirections.push('right');
                        
                        // Choose direction that gets closest to target
                        let bestDirection = null;
                        let bestDistance = Infinity;
                        
                        for (const dir of validDirections) {
                            let newRow = row;
                            let newCol = col;
                            
                            if (dir === 'up') newRow--;
                            else if (dir === 'down') newRow++;
                            else if (dir === 'left') newCol--;
                            else if (dir === 'right') newCol++;
                            
                            const distance = Math.abs(targetRow - newRow) + Math.abs(targetCol - newCol);
                            if (distance < bestDistance) {
                                bestDistance = distance;
                                bestDirection = dir;
                            }
                        }
                        
                        if (bestDirection) {
                            ghost.direction = bestDirection;
                        } else if (validDirections.length > 0) {
                            ghost.direction = validDirections[0];
                        }
                    }
                }
            }
            
            // Update ghost's last direction
            ghost.lastDirection = ghost.direction;
        }
        
        // Move ghost in the current direction
        const speed = ghost.vulnerable ? ghost.speed * 0.6 : ghost.speed;
        
        // Move in the current direction
        switch (ghost.direction) {
            case 'up':
                if (row > 0 && maze[row - 1][col] !== 1) {
                    ghost.y -= speed;
                } else {
                    // If blocked, find a new direction
                    findNewDirection(ghost);
                }
                break;
            case 'down':
                if (row < ROWS - 1 && maze[row + 1][col] !== 1) {
                    ghost.y += speed;
                } else {
                    findNewDirection(ghost);
                }
                break;
            case 'left':
                if (col > 0 && maze[row][col - 1] !== 1) {
                    ghost.x -= speed;
                } else {
                    findNewDirection(ghost);
                }
                // Wrap around through tunnel
                if (ghost.x < 0) {
                    ghost.x = COLS * CELL_SIZE;
                }
                break;
            case 'right':
                if (col < COLS - 1 && maze[row][col + 1] !== 1) {
                    ghost.x += speed;
                } else {
                    findNewDirection(ghost);
                }
                // Wrap around through tunnel
                if (ghost.x > COLS * CELL_SIZE) {
                    ghost.x = 0;
                }
                break;
        }
    }
    
    function runAwayFromPacman(ghost, row, col, possibleDirections) {
        const pacmanRow = Math.floor(pacman.y / CELL_SIZE);
        const pacmanCol = Math.floor(pacman.x / CELL_SIZE);
        
        let bestDirection = null;
        let maxDistance = -Infinity;
        
        for (const dir of possibleDirections) {
            let newRow = row;
            let newCol = col;
            
            if (dir === 'up') newRow--;
            else if (dir === 'down') newRow++;
            else if (dir === 'left') newCol--;
            else if (dir === 'right') newCol++;
            
            const distance = Math.sqrt(
                Math.pow(pacmanRow - newRow, 2) + Math.pow(pacmanCol - newCol, 2)
            );
            
            if (distance > maxDistance) {
                maxDistance = distance;
                bestDirection = dir;
            }
        }
        
        // 90% chance to run away when vulnerable
        if (Math.random() < 0.9 && bestDirection) {
            ghost.direction = bestDirection;
        } else {
            ghost.direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
        }
    }
    
    function findNewDirection(ghost) {
        const col = Math.floor(ghost.x / CELL_SIZE);
        const row = Math.floor(ghost.y / CELL_SIZE);
        
        const possibleDirections = [];
        
        // Find all possible directions
        if (row > 0 && maze[row - 1][col] !== 1 && ghost.direction !== 'down') {
            possibleDirections.push('up');
        }
        if (row < ROWS - 1 && maze[row + 1][col] !== 1 && ghost.direction !== 'up') {
            possibleDirections.push('down');
        }
        if (col > 0 && maze[row][col - 1] !== 1 && ghost.direction !== 'right') {
            possibleDirections.push('left');
        }
        if (col < COLS - 1 && maze[row][col + 1] !== 1 && ghost.direction !== 'left') {
            possibleDirections.push('right');
        }
        
        if (possibleDirections.length > 0) {
            ghost.direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
            ghost.lastDirection = ghost.direction;
        }
    }
    
    function checkGhostCollision(ghost) {
        const distance = Math.sqrt(
            Math.pow(pacman.x - ghost.x, 2) + Math.pow(pacman.y - ghost.y, 2)
        );
        
        if (distance < pacman.radius + ghost.radius) {
            if (ghost.vulnerable) {
                // Eat ghost
                resetGhost(ghost);
                score += 200;
                updateScore();
                
                // Play eat ghost sound
                playSound('eatGhost');
            } else {
                // Game over
                gameOver();
            }
        }
    }
    
    function resetGhost(ghost) {
        // Reset to ghost house position based on ghost type
        if (ghost.originalColor === 'red') {
            ghost.x = 13.5 * CELL_SIZE;
            ghost.y = 11 * CELL_SIZE;
            ghost.direction = 'left';
        } else if (ghost.originalColor === 'pink') {
            ghost.x = 13.5 * CELL_SIZE;
            ghost.y = 14 * CELL_SIZE;
            ghost.direction = 'up';
        } else if (ghost.originalColor === 'cyan') {
            ghost.x = 12 * CELL_SIZE;
            ghost.y = 14 * CELL_SIZE;
            ghost.direction = 'up';
        } else if (ghost.originalColor === 'orange') {
            ghost.x = 15 * CELL_SIZE;
            ghost.y = 14 * CELL_SIZE;
            ghost.direction = 'up';
        }
        
        ghost.lastDirection = ghost.direction;
        ghost.vulnerable = false;
        ghost.returnToOriginalColor();
        
        // If the ghost was already released, keep it released
        // This ensures ghosts don't get permanently trapped in the ghost house
        if (!ghost.released) {
            ghost.released = false;
        } else {
            // Give a short delay before re-releasing a ghost that was eaten
            setTimeout(() => {
                ghost.x = 13.5 * CELL_SIZE;
                ghost.y = 11 * CELL_SIZE;
                ghost.direction = 'left';
            }, 1000);
        }
    }
    
    function gameOver() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        startButton.textContent = 'Restart';
        
        // Play death sound
        playSound('death');
        
        // Display game over message
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'red';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
    }
    
    function gameLoop() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw maze and game elements
        drawMaze();
        updatePacman();
        drawPacman();
        
        // Update and draw ghosts
        updateGhosts();
        for (let ghost of ghosts) {
            drawGhost(ghost);
        }
        
        // Continue animation loop if game is running
        if (gameRunning) {
            animationId = requestAnimationFrame(gameLoop);
        }
    }
    
    function startGame() {
        if (!gameRunning) {
            // Reset game state if restart
            if (startButton.textContent === 'Restart') {
                resetGame();
            }
            
            // Play start sound
            playSound('start');
            
            gameRunning = true;
            startButton.textContent = 'Pause';
            gameLoop();
            
            // If on mobile, try to request fullscreen for better experience
            if (isMobile && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => {
                    // Silently ignore fullscreen errors
                    console.log("Fullscreen request failed:", err);
                });
            }
        } else {
            gameRunning = false;
            startButton.textContent = 'Resume';
            cancelAnimationFrame(animationId);
        }
    }
    
    function resetGame() {
        // Reset score
        score = 0;
        updateScore();
        
        // Reset frame counter for ghost release
        frameCount = 0;
        
        // Reset pacman
        pacman.x = 14 * CELL_SIZE;
        pacman.y = 23 * CELL_SIZE;
        pacman.direction = 'right';
        pacman.nextDirection = null;
        
        // Reset ghosts to proper starting positions
        ghosts[0].x = 13.5 * CELL_SIZE;  // Red - start at exit
        ghosts[0].y = 11 * CELL_SIZE;
        ghosts[0].direction = 'left';
        ghosts[0].lastDirection = 'left';
        ghosts[0].vulnerable = false;
        ghosts[0].released = false;
        ghosts[0].returnToOriginalColor();
        
        ghosts[1].x = 13.5 * CELL_SIZE;  // Pink - start in ghost house
        ghosts[1].y = 14 * CELL_SIZE;
        ghosts[1].direction = 'up';
        ghosts[1].lastDirection = 'up';
        ghosts[1].vulnerable = false;
        ghosts[1].released = false;
        ghosts[1].returnToOriginalColor();
        
        ghosts[2].x = 12 * CELL_SIZE;  // Cyan - left side of ghost house
        ghosts[2].y = 14 * CELL_SIZE;
        ghosts[2].direction = 'up';
        ghosts[2].lastDirection = 'up';
        ghosts[2].vulnerable = false;
        ghosts[2].released = false;
        ghosts[2].returnToOriginalColor();
        
        ghosts[3].x = 15 * CELL_SIZE;  // Orange - right side of ghost house
        ghosts[3].y = 14 * CELL_SIZE;
        ghosts[3].direction = 'up';
        ghosts[3].lastDirection = 'up';
        ghosts[3].vulnerable = false;
        ghosts[3].released = false;
        ghosts[3].returnToOriginalColor();
        
        // Reset maze - restore all dots and power pellets
        const originalMaze = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1],
            [1,3,1,0,0,1,2,1,0,0,1,2,1,1,2,1,0,0,1,2,1,0,0,1,2,1,3,1],
            [1,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1,2,1],
            [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1,2,1],
            [1,2,2,2,2,2,2,1,1,2,2,2,1,1,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,2,1,1,1,1,0,1,1,0,1,1,1,1,2,1,1,1,1,1,1,1,1],
            [0,0,0,0,0,1,2,1,1,1,1,0,1,1,0,1,1,1,1,2,1,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,2,1,1,0,1,1,0,0,1,1,0,1,1,2,1,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1,1,1],
            [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1,1,1],
            [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1],
            [1,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1],
            [1,3,2,2,1,1,2,2,2,2,2,2,0,0,2,2,2,2,2,2,1,1,2,2,2,2,3,1],
            [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1,1,1],
            [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1,1,1],
            [1,2,2,2,2,2,2,1,1,2,2,2,1,1,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1],
            [1,2,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        
        // Deep copy the original maze to reset
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                maze[row][col] = originalMaze[row][col];
            }
        }
    }
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    
    // Initial draw
    drawMaze();
    drawPacman();
});