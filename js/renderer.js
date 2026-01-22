const Renderer = {
    canvas: null,
    ctx: null,

    init() {
        this.canvas = document.getElementById('boardCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.gridSize * CONFIG.tileSize;
        this.canvas.height = CONFIG.gridSize * CONFIG.tileSize;
        
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const gx = Math.floor((e.clientX - rect.left) / CONFIG.tileSize);
            const gy = Math.floor((e.clientY - rect.top) / CONFIG.tileSize);
            GameLogic.handleTileClick(gx, gy);
        });
    },

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const { gridSize, tileSize } = CONFIG;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Grid e Fog
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const px = x * tileSize;
                const py = y * tileSize;

                if (State.fog[x][y]) {
                    ctx.fillStyle = CONFIG.colors.fog;
                    ctx.fillRect(px, py, tileSize, tileSize);
                } else {
                    ctx.fillStyle = CONFIG.colors.ground;
                    ctx.fillRect(px, py, tileSize, tileSize);

                    const chest = State.chests.find(c => c.x === x && c.y === y && c.active);
                    if (chest) {
                        this.drawEmoji("📦", x, y, 28, 42);
                    }
                }

                ctx.strokeStyle = CONFIG.colors.grid;
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, tileSize, tileSize);
            }
        }

        // 2. Fantasma
        if (State.ghost.active) {
            const ghostEmoji = State.ghost.slow ? State.ghost.slowSym : State.ghost.sym;
            this.drawEmoji(ghostEmoji, State.ghost.x, State.ghost.y, 32, 45);
            
            // Aura do fantasma
            const gx = State.ghost.x * tileSize + tileSize/2;
            const gy = State.ghost.y * tileSize + tileSize/2;
            const grad = ctx.createRadialGradient(gx, gy, 5, gx, gy, tileSize * 1.5);
            grad.addColorStop(0, 'rgba(139, 0, 0, 0.2)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(State.ghost.x * tileSize - tileSize, State.ghost.y * tileSize - tileSize, tileSize * 3, tileSize * 3);
        }

        // 3. Jogadores
        State.players.forEach((p, idx) => {
            this.drawEmoji(p.sym, p.x, p.y, 32, 45);
            
            // Indicador de turno
            if (idx === State.turn) {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.strokeRect(p.x * tileSize + 2, p.y * tileSize + 2, tileSize - 4, tileSize - 4);
            }
        });
    },

    drawEmoji(emoji, x, y, size, yOffset) {
        this.ctx.font = `${size}px serif`;
        this.ctx.textAlign = "center";
        this.ctx.fillText(emoji, x * CONFIG.tileSize + CONFIG.tileSize / 2, y * CONFIG.tileSize + yOffset);
    }
};
