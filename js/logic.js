const GameLogic = {
    init() {
        Renderer.init();
        this.setupMenu();
        this.gameLoop();
    },

    setupMenu() {
        document.querySelectorAll('#player-select-buttons .btn').forEach(btn => {
            btn.onclick = () => {
                const count = parseInt(btn.dataset.players);
                this.startGame(count);
            };
        });

        document.getElementById('ability-btn').onclick = () => this.useAbility();
        document.getElementById('pass-turn-btn').onclick = () => this.passTurn();
    },

    startGame(playerCount) {
        State.players = [];
        for (let i = 0; i < playerCount; i++) {
            const charClass = CONFIG.classes[i];
            State.players.push({
                ...charClass,
                x: CONFIG.spawnPositions[i].x,
                y: CONFIG.spawnPositions[i].y,
                curM: charClass.moves,
                usedAbility: false
            });
        }

        this.generateLevel();
        State.gameActive = true;
        document.getElementById('start-screen').classList.add('hidden');
        UI.update();
        UI.log("A aventura começou! Encontre as 3 relíquias.");
    },

    generateLevel() {
        // Resetar Fog
        State.fog = [];
        for (let x = 0; x < CONFIG.gridSize; x++) {
            State.fog[x] = [];
            for (let y = 0; y < CONFIG.gridSize; y++) {
                State.fog[x][y] = true;
            }
        }
        
        // Resetar Baús
        State.chests = [];
        const chestCount = 8;
        const relicIndices = this.getRandomIndices(chestCount, 3);

        for (let i = 0; i < chestCount; i++) {
            let rx, ry;
            do {
                rx = Math.floor(Math.random() * CONFIG.gridSize);
                ry = Math.floor(Math.random() * CONFIG.gridSize);
            } while (
                State.chests.some(c => c.x === rx && c.y === ry) || 
                CONFIG.spawnPositions.some(p => p.x === rx && p.y === ry)
            );

            State.chests.push({
                x: rx, y: ry, active: true, has: relicIndices.includes(i)
            });
        }

        // Resetar Fantasma
        State.ghost.x = 6;
        State.ghost.y = 6;
        State.ghost.active = false;
        State.ghost.slow = false;

        this.updateFog();
    },

    getRandomIndices(total, count) {
        let indices = [];
        while(indices.length < count) {
            let r = Math.floor(Math.random() * total);
            if(!indices.includes(r)) indices.push(r);
        }
        return indices;
    },

    updateFog() {
        State.players.forEach(p => {
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    let nx = p.x + dx;
                    let ny = p.y + dy;
                    if (nx >= 0 && nx < CONFIG.gridSize && ny >= 0 && ny < CONFIG.gridSize) {
                        State.fog[nx][ny] = false;
                    }
                }
            }
        });
    },

    handleTileClick(gx, gy) {
        if (!State.gameActive || State.isBusy) return;

        const p = State.players[State.turn];
        const dist = Math.abs(p.x - gx) + Math.abs(p.y - gy);

        if (dist === 1 && p.curM > 0) {
            p.x = gx;
            p.y = gy;
            p.curM--;
            this.updateFog();
            this.checkCollisions();
            UI.update();
        }
    },

    checkCollisions() {
        const p = State.players[State.turn];
        
        // Baú
        const chest = State.chests.find(c => c.x === p.x && c.y === p.y && c.active);
        if (chest) {
            this.startMinigame(chest);
        }

        // Fantasma
        if (State.ghost.active && p.x === State.ghost.x && p.y === State.ghost.y) {
            this.gameOver(false, "O Fantasma pegou você!");
        }
    },

    startMinigame(chest, isStealth = false) {
        State.isBusy = true;
        const screen = document.getElementById('minigame-screen'), 
              content = document.getElementById('mg-content'), 
              title = document.getElementById('mg-title');
        
        screen.classList.remove('hidden');
        
        // Sorteia o tipo de minigame (1: Dado com Modificador, 2: Sequência de Cliques, 3: Reação Rápida)
        const gameType = isStealth ? 1 : (Math.random() > 0.4 ? 1 : (Math.random() > 0.5 ? 2 : 3));
        
        if (gameType === 1) {
            this.runDiceGame(chest, isStealth, content, title, screen);
        } else if (gameType === 2) {
            this.runSequenceGame(chest, content, title, screen);
        } else {
            this.runReactionGame(chest, content, title, screen);
        }
    },

    runDiceGame(chest, isStealth, content, title, screen) {
        title.textContent = isStealth ? "ROUBO SILENCIOSO" : "DESAFIO DO BAÚ";
        
        // Alvo aleatório entre 8 e 15
        let target = isStealth ? (6 + Math.floor(Math.random() * 5)) : (10 + Math.floor(Math.random() * 8));
        
        content.innerHTML = `
            <p style="margin-bottom:10px">Role o dado para abrir o baú.<br>Necessário: <b style="color:var(--gold)">${target}+</b></p>
            <div id="mod-display" style="height: 30px; font-size: 1.1rem; margin-bottom: 10px; font-weight: bold;"></div>
            <div id="dice-result" class="dice-roll">?</div>
            <button class="btn" id="roll-dice-btn">🎲 ROLAR D20</button>
        `;

        document.getElementById('roll-dice-btn').onclick = () => {
            const btn = document.getElementById('roll-dice-btn');
            btn.disabled = true;
            
            let baseRoll = Math.floor(Math.random() * 20) + 1;
            let diceEl = document.getElementById('dice-result');
            let modEl = document.getElementById('mod-display');
            let counter = 0;

            // 1. Animação do Dado
            let interval = setInterval(() => {
                diceEl.textContent = Math.floor(Math.random() * 20) + 1;
                if(++counter > 12) {
                    clearInterval(interval);
                    diceEl.textContent = baseRoll;
                    
                    // 2. Pequena pausa dramática antes do modificador
                    setTimeout(() => {
                        // Chance de 70% de ter um modificador (para não perder a graça)
                        let hasMod = Math.random() > 0.3;
                        let mod = 0;
                        
                        if (hasMod) {
                            mod = Math.floor(Math.random() * 11) - 5; // -5 a +5
                            if (mod === 0) mod = 1; // Evitar modificador zero sem graça
                            
                            let modText = mod > 0 ? `+${mod}` : `${mod}`;
                            let modColor = mod > 0 ? "#2ecc71" : "#e74c3c";
                            
                            modEl.style.color = modColor;
                            modEl.textContent = `SURPRESA: ${modText}!`;
                            
                            // Animação de "shake" no dado se for negativo
                            if (mod < 0) diceEl.style.animation = "shake 0.5s";
                        }

                        let finalRoll = baseRoll + mod;
                        
                        // 3. Revelar resultado final
                        setTimeout(() => {
                            diceEl.innerHTML = `${baseRoll}${mod !== 0 ? `<span style="font-size:1.5rem; margin-left:10px; opacity:0.7">${mod > 0 ? '+' : ''}${mod}</span>` : ''} = ${finalRoll}`;
                            diceEl.style.color = finalRoll >= target ? "#2ecc71" : "#e74c3c";
                            
                            setTimeout(() => {
                                screen.classList.add('hidden');
                                State.isBusy = false;
                                this.resolveChest(chest, finalRoll >= target);
                            }, 1800);
                        }, 800);
                    }, 600);
                }
            }, 60);
        };
    },

    runSequenceGame(chest, content, title, screen) {
        title.textContent = "DESARMAR ARMADILHA";
        content.innerHTML = `<p style="margin-bottom:20px">Clique nos botões na ordem correta!</p><div id="seq-btns" style="display:flex; gap:10px; justify-content:center"></div>`;
        
        const container = document.getElementById('seq-btns');
        const nums = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
        let current = 1;

        nums.forEach(n => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.width = '60px';
            btn.textContent = n;
            btn.onclick = () => {
                if (n === current) {
                    btn.style.background = "#2ecc71";
                    btn.disabled = true;
                    current++;
                    if (current > 4) {
                        setTimeout(() => {
                            screen.classList.add('hidden');
                            State.isBusy = false;
                            this.resolveChest(chest, true);
                        }, 500);
                    }
                } else {
                    btn.style.background = "#e74c3c";
                    setTimeout(() => {
                        screen.classList.add('hidden');
                        State.isBusy = false;
                        this.resolveChest(chest, false);
                    }, 500);
                }
            };
            container.appendChild(btn);
        });
    },

    runReactionGame(chest, content, title, screen) {
        title.textContent = "REFLEXO RÁPIDO";
        content.innerHTML = `<p style="margin-bottom:20px">Clique quando o botão ficar <b style="color:#2ecc71">VERDE</b>!</p><button id="react-btn" class="btn" style="width:200px; height:100px; font-size:1.5rem">AGUARDE...</button>`;
        
        const btn = document.getElementById('react-btn');
        let canClick = false;
        let startTime;

        const waitTime = 1000 + Math.random() * 3000;
        const timeout = setTimeout(() => {
            btn.textContent = "CLIQUE AGORA!";
            btn.style.background = "#2ecc71";
            btn.style.color = "#000";
            canClick = true;
            startTime = Date.now();
        }, waitTime);

        btn.onclick = () => {
            if (canClick) {
                const reactionTime = Date.now() - startTime;
                if (reactionTime < 700) { // 0.7 segundos para reagir
                    btn.textContent = "SUCESSO!";
                    setTimeout(() => {
                        screen.classList.add('hidden');
                        State.isBusy = false;
                        this.resolveChest(chest, true);
                    }, 800);
                } else {
                    btn.textContent = "LENTO DEMAIS!";
                    btn.style.background = "#e74c3c";
                    setTimeout(() => {
                        screen.classList.add('hidden');
                        State.isBusy = false;
                        this.resolveChest(chest, false);
                    }, 800);
                }
            } else {
                clearTimeout(timeout);
                btn.textContent = "CEDO DEMAIS!";
                btn.style.background = "#e74c3c";
                setTimeout(() => {
                    screen.classList.add('hidden');
                    State.isBusy = false;
                    this.resolveChest(chest, false);
                }, 800);
            }
        };
    },l >= target ? "#2ecc71" : "#e74c3c";
                    
                    setTimeout(() => {
                        screen.classList.add('hidden');
                        State.isBusy = false;
                        this.resolveChest(chest, roll >= target);
                    }, 1500);
                }
            }, 50);
        };
    },

    resolveChest(chest, success) {
        if (success) {
            chest.active = false;
            if (chest.has) {
                State.relics++;
                UI.log("✨ Relíquia encontrada!");
                if (State.relics >= CONFIG.relicsNeeded) {
                    UI.log("🏆 Mansão Purificada! O nível aumenta...");
                    setTimeout(() => {
                        State.relics = 0;
                        State.level++;
                        this.generateLevel();
                        UI.update();
                    }, 1500);
                }
            } else {
                UI.log("📦 O baú estava vazio...");
            }
        } else {
            UI.log("💀 Falha! O Fantasma despertou!");
            State.ghost.active = true;
        }

        if (State.players[State.turn].curM <= 0) {
            this.passTurn();
        }
        UI.update();
    },

    useAbility() {
        let p = State.players[State.turn];
        if (p.usedAbility || State.isBusy) return;

        let success = false;
        switch(p.id) {
            case 'atleta':
                p.curM += 3;
                UI.log("🏃 Atleta usou fôlego extra!");
                success = true;
                break;
            case 'vidente':
                UI.log("👁️ Vidente revelou os baús!");
                State.chests.forEach(c => { if(c.active) State.fog[c.x][c.y] = false; });
                success = true;
                break;
            case 'engenheiro':
                if (State.ghost.active) {
                    State.ghost.slow = true;
                    UI.log("⚙️ Engenheiro sabotou o Fantasma!");
                    success = true;
                } else {
                    UI.log("❌ O Fantasma ainda não apareceu!");
                }
                break;
            case 'ladrao':
                let adjChest = State.chests.find(c => 
                    c.active && (Math.abs(c.x - p.x) + Math.abs(c.y - p.y) === 1)
                );
                if (adjChest) {
                    this.startMinigame(adjChest, true);
                    success = true;
                } else {
                    UI.log("❌ Nenhum baú adjacente!");
                }
                break;
        }

        if (success) {
            p.usedAbility = true;
            UI.update();
        }
    },

    moveGhost() {
        if (!State.ghost.active) return;

        // Persegue o jogador mais próximo
        let target = null;
        let minDist = Infinity;

        State.players.forEach(p => {
            let d = Math.abs(p.x - State.ghost.x) + Math.abs(p.y - State.ghost.y);
            if (d < minDist) {
                minDist = d;
                target = p;
            }
        });

        let moves = State.ghost.slow ? 1 : 2;
        for (let i = 0; i < moves; i++) {
            if (State.ghost.x < target.x) State.ghost.x++;
            else if (State.ghost.x > target.x) State.ghost.x--;
            else if (State.ghost.y < target.y) State.ghost.y++;
            else if (State.ghost.y > target.y) State.ghost.y--;
            
            // Verificar colisão durante o movimento
            if (State.players.some(p => p.x === State.ghost.x && p.y === State.ghost.y)) {
                this.gameOver(false, "O Fantasma alcançou vocês!");
                break;
            }
        }
    },

    passTurn() {
        if (State.isBusy || !State.gameActive) return;

        let p = State.players[State.turn];
        p.curM = p.moves;
        p.usedAbility = false; // Resetar habilidade por turno ou por nível? No original era por turno.
        
        State.turn = (State.turn + 1) % State.players.length;
        
        if (State.turn === 0) {
            this.moveGhost();
        }

        UI.update();
        UI.log(`Turno de: ${State.players[State.turn].name}`);
    },

    gameOver(win, message) {
        State.gameActive = false;
        const screen = document.getElementById('game-over-screen');
        document.getElementById('go-title').textContent = win ? "VITÓRIA!" : "DERROTA";
        document.getElementById('go-message').textContent = message;
        screen.classList.remove('hidden');
    },

    gameLoop() {
        Renderer.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
};
