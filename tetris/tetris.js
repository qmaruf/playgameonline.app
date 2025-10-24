class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        this.CELL_SIZE = 40;

        this.board = this.createBoard();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.isPaused = false;

        this.dropTime = 0;
        this.dropInterval = 1000;

        this.currentPiece = null;
        this.nextPiece = null;

        // Animation states
        this.isAnimating = false;
        this.animatingLines = [];
        this.animationTime = 0;
        this.animationDuration = 300; // ms

        this.colors = [
            '#1a1a2e', // Empty - Dark blue-gray
            '#ff6b6b', // Red - Z (softer red)
            '#4ecdc4', // Green - S (teal)
            '#45b7d1', // Blue - J (sky blue)
            '#f9ca24', // Yellow - O (warm yellow)
            '#a55eea', // Magenta - T (purple)
            '#26d0ce', // Cyan - I (bright teal)
            '#fd9644'  // Orange - L (warm orange)
        ];

        this.tetrominoes = {
            'I': {
                shape: [
                    [0,0,0,0],
                    [6,6,6,6],
                    [0,0,0,0],
                    [0,0,0,0]
                ],
                color: 6
            },
            'O': {
                shape: [
                    [4,4],
                    [4,4]
                ],
                color: 4
            },
            'T': {
                shape: [
                    [0,5,0],
                    [5,5,5],
                    [0,0,0]
                ],
                color: 5
            },
            'S': {
                shape: [
                    [0,2,2],
                    [2,2,0],
                    [0,0,0]
                ],
                color: 2
            },
            'Z': {
                shape: [
                    [1,1,0],
                    [0,1,1],
                    [0,0,0]
                ],
                color: 1
            },
            'J': {
                shape: [
                    [3,0,0],
                    [3,3,3],
                    [0,0,0]
                ],
                color: 3
            },
            'L': {
                shape: [
                    [0,0,7],
                    [7,7,7],
                    [0,0,0]
                ],
                color: 7
            }
        };

        this.init();
    }

    createBoard() {
        const board = [];
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            board[row] = new Array(this.BOARD_WIDTH).fill(0);
        }
        return board;
    }

    init() {
        this.setupControls();
        this.spawnPiece();
        this.spawnNextPiece();
        this.updateDisplay();
        this.gameLoop();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.isPaused) {
                if (e.code === 'KeyP') {
                    this.togglePause();
                }
                return;
            }

            switch(e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.softDrop();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.rotatePiece();
                    break;
                case 'Space':
                    e.preventDefault();
                    this.hardDrop();
                    break;
                case 'KeyP':
                    e.preventDefault();
                    this.togglePause();
                    break;
            }
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });
    }

    spawnPiece() {
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
        } else {
            this.currentPiece = this.getRandomPiece();
        }
        this.currentPiece.x = Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
        this.currentPiece.y = 0;

        if (this.isCollision(this.currentPiece, 0, 0)) {
            this.endGame();
        }
    }

    spawnNextPiece() {
        this.nextPiece = this.getRandomPiece();
        this.drawNextPiece();
    }

    getRandomPiece() {
        const pieces = Object.keys(this.tetrominoes);
        const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
        const tetromino = this.tetrominoes[randomPiece];

        return {
            shape: tetromino.shape.map(row => [...row]),
            color: tetromino.color,
            x: 0,
            y: 0
        };
    }

    movePiece(dx, dy) {
        if (!this.isCollision(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            return true;
        }
        return false;
    }

    rotatePiece() {
        const rotated = this.rotate(this.currentPiece.shape);
        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;

        if (this.isCollision(this.currentPiece, 0, 0)) {
            this.currentPiece.shape = originalShape;
        }
    }

    rotate(matrix) {
        const N = matrix.length;
        const rotated = Array(N).fill().map(() => Array(N).fill(0));

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                rotated[j][N - 1 - i] = matrix[i][j];
            }
        }
        return rotated;
    }

    softDrop() {
        if (this.movePiece(0, 1)) {
            this.score += 1;
        }
    }

    hardDrop() {
        let dropDistance = 0;
        while (this.movePiece(0, 1)) {
            dropDistance++;
        }
        this.score += dropDistance * 2;
        this.placePiece();
    }

    isCollision(piece, dx, dy) {
        const newX = piece.x + dx;
        const newY = piece.y + dy;

        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] !== 0) {
                    const boardX = newX + x;
                    const boardY = newY + y;

                    if (boardX < 0 || boardX >= this.BOARD_WIDTH ||
                        boardY >= this.BOARD_HEIGHT ||
                        (boardY >= 0 && this.board[boardY][boardX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    placePiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x] !== 0) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }

        this.checkAndClearLines();
    }

    checkAndClearLines() {
        const linesToClear = [];

        // Find all lines that need to be cleared
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            if (this.board[y].every(cell => cell !== 0)) {
                linesToClear.push(y);
            }
        }

        if (linesToClear.length > 0) {
            this.startLineClearAnimation(linesToClear);
        } else {
            this.spawnPiece();
            this.spawnNextPiece();
        }
    }

    startLineClearAnimation(lines) {
        this.isAnimating = true;
        this.animatingLines = lines;
        this.animationTime = 0;

        // Don't spawn new pieces during animation
        setTimeout(() => {
            this.clearLines(lines);
            this.isAnimating = false;
            this.animatingLines = [];
            this.spawnPiece();
            this.spawnNextPiece();
        }, this.animationDuration);
    }

    clearLines(linesToClear) {
        // Remove the lines and add new empty lines at top
        for (let i = linesToClear.length - 1; i >= 0; i--) {
            this.board.splice(linesToClear[i], 1);
            this.board.unshift(new Array(this.BOARD_WIDTH).fill(0));
        }

        this.updateScore(linesToClear.length);
        this.lines += linesToClear.length;
        this.updateLevel();
    }

    updateScore(linesCleared) {
        const basePoints = [0, 100, 300, 500, 800];
        this.score += basePoints[linesCleared] * this.level;
    }

    updateLevel() {
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 100);
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
    }

    endGame() {
        this.gameOver = true;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;
        document.getElementById('game-over').style.display = 'flex';
    }

    restart() {
        this.board = this.createBoard();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.isPaused = false;
        this.dropTime = 0;
        this.dropInterval = 1000;
        this.isAnimating = false;
        this.animatingLines = [];
        this.animationTime = 0;

        document.getElementById('game-over').style.display = 'none';
        this.spawnPiece();
        this.spawnNextPiece();
        this.updateDisplay();
    }

    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    drawBoard() {
        // Create gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(0.5, '#34495e');
        gradient.addColorStop(1, '#2c3e50');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (this.board[y][x] !== 0) {
                    let color = this.colors[this.board[y][x]];

                    // Apply smooth fade + glow animation to clearing lines
                    if (this.isAnimating && this.animatingLines.includes(y)) {
                        const progress = this.animationTime / this.animationDuration;

                        // Smooth fade out (1.0 to 0.0)
                        const alpha = 1.0 - progress;

                        // Convert hex to rgba for opacity
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
                        color = `rgba(${r}, ${g}, ${b}, ${alpha})`;

                        // Draw the cell with fading color
                        this.drawCell(x, y, color);

                        // Add golden glow effect
                        const glowIntensity = alpha * 0.8; // Glow fades with the cell
                        this.drawGlowEffect(x, y, glowIntensity);
                    } else {
                        this.drawCell(x, y, color);
                    }
                }
            }
        }

        this.drawGrid();
    }

    drawCurrentPiece() {
        if (!this.currentPiece) return;

        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x] !== 0) {
                    this.drawCell(
                        this.currentPiece.x + x,
                        this.currentPiece.y + y,
                        this.colors[this.currentPiece.color]
                    );
                }
            }
        }
    }

    drawCell(x, y, color) {
        const pixelX = x * this.CELL_SIZE;
        const pixelY = y * this.CELL_SIZE;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, this.CELL_SIZE, this.CELL_SIZE);

        this.ctx.strokeStyle = '#2d3436';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pixelX, pixelY, this.CELL_SIZE, this.CELL_SIZE);
    }

    drawGlowEffect(x, y, intensity) {
        if (intensity <= 0) return;

        const pixelX = x * this.CELL_SIZE;
        const pixelY = y * this.CELL_SIZE;

        // Create radial gradient for glow
        const gradient = this.ctx.createRadialGradient(
            pixelX + this.CELL_SIZE / 2, pixelY + this.CELL_SIZE / 2, 0,
            pixelX + this.CELL_SIZE / 2, pixelY + this.CELL_SIZE / 2, this.CELL_SIZE * 0.8
        );

        gradient.addColorStop(0, `rgba(255, 215, 0, ${intensity * 0.6})`); // Golden center
        gradient.addColorStop(0.5, `rgba(255, 215, 0, ${intensity * 0.3})`); // Fade
        gradient.addColorStop(1, `rgba(255, 215, 0, 0)`); // Transparent edge

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            pixelX - this.CELL_SIZE * 0.2,
            pixelY - this.CELL_SIZE * 0.2,
            this.CELL_SIZE * 1.4,
            this.CELL_SIZE * 1.4
        );
    }

    drawGrid() {
        this.ctx.strokeStyle = '#2d3436';
        this.ctx.lineWidth = 2;

        // Only draw grid lines within the actual game board area
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.CELL_SIZE, 0);
            this.ctx.lineTo(x * this.CELL_SIZE, this.BOARD_HEIGHT * this.CELL_SIZE);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.CELL_SIZE);
            this.ctx.lineTo(this.BOARD_WIDTH * this.CELL_SIZE, y * this.CELL_SIZE);
            this.ctx.stroke();
        }
    }

    drawNextPiece() {
        if (!this.nextPiece) return;

        // Create gradient background for next piece canvas
        const gradient = this.nextCtx.createLinearGradient(0, 0, 0, this.nextCanvas.height);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#34495e');
        this.nextCtx.fillStyle = gradient;
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        const cellSize = 20;
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * cellSize) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * cellSize) / 2;

        for (let y = 0; y < this.nextPiece.shape.length; y++) {
            for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
                if (this.nextPiece.shape[y][x] !== 0) {
                    const pixelX = offsetX + x * cellSize;
                    const pixelY = offsetY + y * cellSize;

                    this.nextCtx.fillStyle = this.colors[this.nextPiece.color];
                    this.nextCtx.fillRect(pixelX, pixelY, cellSize, cellSize);

                    this.nextCtx.strokeStyle = '#2d3436';
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.strokeRect(pixelX, pixelY, cellSize, cellSize);
                }
            }
        }
    }

    gameLoop() {
        if (!this.gameOver && !this.isPaused) {
            this.update();
        }

        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.isAnimating) {
            this.animationTime += 16;
            return;
        }

        this.dropTime += 16;

        if (this.dropTime >= this.dropInterval) {
            if (!this.movePiece(0, 1)) {
                this.placePiece();
            }
            this.dropTime = 0;
        }

        this.updateDisplay();
    }

    render() {
        this.drawBoard();
        this.drawCurrentPiece();
    }
}

const game = new Tetris();