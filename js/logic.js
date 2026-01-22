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
        document.getElementById('item-btn').onclick = () => this.useItem();
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
        this.startTurnTimer();
    },

    generateLevel() {
        State.fog = [];
        for (let x = 0; x < CONFIG.gridSize; x++) {
            State.fog[x] = [];
            for (let y = 0; y < CONFIG.gridSize; y++) {
                State.fog[x][y] = true;
            }
        }
        
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

        State.ghost.x = 6;
        State.ghost.y = 6;
        State.ghost.active = false;
        State.ghost.slow = false;
        State.ghostWaitTurn = false;

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

    startTurnTimer() {
        if (State.turnTimer) clearInterval(State.turnTimer);
        State.timeLeft = CONFIG.turnTimeLimit;
        this.updateTimerUI();
        
        State.turnTimer = setInterval(() => {
            if (!State.isBusy && State.gameActive) {
                State.timeLeft--;
                this.updateTimerUI();
                if (State.timeLeft <= 0) {
                    UI.log("⏰ Tempo esgotado!");
                    this.passTurn();
                }
            }
        }, 1000);
    },

    startMinigameTimer(callback) {
        if (State.mgTimer) clearInterval(State.mgTimer);
        let mgTime = CONFIG.minigameTimeLimit;
        
        const timerDisplay = document.createElement('div');
        timerDisplay.id = "mg-timer";
        timerDisplay.style.cssText = "font-size: 1.5rem; color: #e74c3c; margin-bottom: 10px; font-weight: bold;";
        timerDisplay.textContent = `Tempo: ${mgTime}s`;
        document.getElementById('mg-content').prepend(timerDisplay);

        State.mgTimer = setInterval(() => {
            mgTime--;
            timerDisplay.textContent = `Tempo: ${mgTime}s`;
            if (mgTime <= 0) {
                clearInterval(State.mgTimer);
                UI.log("⏰ Tempo do minigame esgotado!");
                callback(false);
            }
        }, 1000);
    },

    updateTimerUI() {
        const el = document.getElementById('timer-display');
        if (el) {
            el.textContent = `${State.timeLeft}s`;
            el.style.color = State.timeLeft <= 10 ? "#ff0000" : "#e74c3c";
        }
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
        const chest = State.chests.find(c => c.x === p.x && c.y === p.y && c.active);
        if (chest) this.startMinigame(chest);
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
        
        // Sorteia entre os 6 tipos de minigames (removido Escolhido pelo Destino)
        const gameTypes = [1, 2, 3, 4, 5, 7];
        const gameType = isStealth ? 1 : gameTypes[Math.floor(Math.random() * gameTypes.length)];
        
        const finish = (success) => {
            if (State.mgTimer) clearInterval(State.mgTimer);
            setTimeout(() => {
                screen.classList.add('hidden');
                State.isBusy = false;
                this.resolveChest(chest, success);
            }, 1500);
        };

        this.startMinigameTimer(finish);

        switch(gameType) {
            case 1: this.runDiceGame(chest, isStealth, content, title, finish); break;
            case 2: this.runSequenceGame(content, title, finish); break;
            case 3: this.runReactionGame(content, title, finish); break;
            case 4: this.runCalyxGame(content, title, finish); break;
            case 5: this.runRuneMemoryGame(content, title, finish); break;
            // case 6 removido
            case 7: this.runHeartbeatGame(content, title, finish); break;
        }
    },

    runDiceGame(chest, isStealth, content, title, finish) {
        title.textContent = isStealth ? "ROUBO SILENCIOSO" : "DESAFIO DO BAÚ";
        let target = isStealth ? (6 + Math.floor(Math.random() * 5)) : (10 + Math.floor(Math.random() * 8));
        
        const gameDiv = document.createElement('div');
        gameDiv.innerHTML = `
            <p style="margin-bottom:10px">Role o dado para abrir o baú.<br>Necessário: <b style="color:var(--gold)">${target}+</b></p>
            <div id="mod-display" style="height: 30px; font-size: 1.1rem; margin-bottom: 10px; font-weight: bold;"></div>
            <div id="dice-result" class="dice-roll">?</div>
            <button class="btn" id="roll-dice-btn">🎲 ROLAR D20</button>
        `;
        content.appendChild(gameDiv);

        document.getElementById('roll-dice-btn').onclick = () => {
            document.getElementById('roll-dice-btn').disabled = true;
            let baseRoll = Math.floor(Math.random() * 20) + 1;
            let diceEl = document.getElementById('dice-result');
            let modEl = document.getElementById('mod-display');
            let counter = 0;

            let interval = setInterval(() => {
                diceEl.textContent = Math.floor(Math.random() * 20) + 1;
                if(++counter > 12) {
                    clearInterval(interval);
                    diceEl.textContent = baseRoll;
                    setTimeout(() => {
                        let hasMod = Math.random() > 0.3;
                        let mod = 0;
                        if (hasMod) {
                            mod = Math.floor(Math.random() * 11) - 5;
                            if (mod === 0) mod = 1;
                            modEl.style.color = mod > 0 ? "#2ecc71" : "#e74c3c";
                            modEl.textContent = `MODIFICADOR: ${mod > 0 ? '+' : ''}${mod}!`;
                            if (mod < 0) diceEl.style.animation = "shake 0.5s";
                        }
                        let finalRoll = baseRoll + mod;
                        setTimeout(() => {
                            diceEl.textContent = finalRoll;
                            diceEl.style.color = finalRoll >= target ? "#2ecc71" : "#e74c3c";
                            finish(finalRoll >= target);
                        }, 800);
                    }, 600);
                }
            }, 60);
        };
    },

    runSequenceGame(content, title, finish) {
        title.textContent = "DESARMAR ARMADILHA";
        const gameDiv = document.createElement('div');
        gameDiv.innerHTML = `<p style="margin-bottom:20px">Clique na ordem correta!</p><div id="seq-btns" style="display:flex; gap:10px; justify-content:center"></div>`;
        content.appendChild(gameDiv);
        const container = document.getElementById('seq-btns');
        const nums = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
        let current = 1;
        nums.forEach(n => {
            const btn = document.createElement('button');
            btn.className = 'btn'; btn.style.width = '60px'; btn.textContent = n;
            btn.onclick = () => {
                if (n === current) {
                    btn.style.background = "#2ecc71"; btn.disabled = true; current++;
                    if (current > 4) finish(true);
                } else {
                    btn.style.background = "#e74c3c"; finish(false);
                }
            };
            container.appendChild(btn);
        });
    },

    runReactionGame(content, title, finish) {
        title.textContent = "REFLEXO RÁPIDO";
        const gameDiv = document.createElement('div');
        gameDiv.innerHTML = `<p style="margin-bottom:20px">Clique quando ficar <b style="color:#2ecc71">VERDE</b>!</p><button id="react-btn" class="btn" style="width:200px; height:100px; font-size:1.5rem">AGUARDE...</button>`;
        content.appendChild(gameDiv);
        const btn = document.getElementById('react-btn');
        let canClick = false, startTime;
        const timeout = setTimeout(() => {
            btn.textContent = "CLIQUE!"; btn.style.background = "#2ecc71"; btn.style.color = "#000";
            canClick = true; startTime = Date.now();
        }, 1000 + Math.random() * 3000);
        btn.onclick = () => {
            if (canClick) {
                const reactionTime = Date.now() - startTime;
                if (reactionTime < 700) { btn.textContent = "SUCESSO!"; finish(true); }
                else { btn.textContent = "LENTO!"; btn.style.background = "#e74c3c"; finish(false); }
            } else {
                clearTimeout(timeout); btn.textContent = "CEDO!"; btn.style.background = "#e74c3c"; finish(false);
            }
        };
    },

    runCalyxGame(content, title, finish) {
        title.textContent = "BANQUETE DAS SOMBRAS";
        const gameDiv = document.createElement('div');
        gameDiv.innerHTML = `<p style="margin-bottom:20px">Escolha um cálice. Cuidado com a maldição!</p><div id="calyx-btns" style="display:flex; gap:20px; justify-content:center; font-size:3rem"></div>`;
        content.appendChild(gameDiv);
        const container = document.getElementById('calyx-btns');
        const types = ['relic', 'empty', 'curse'].sort(() => Math.random() - 0.5);
        
        // Pista rápida
        setTimeout(() => {
            const curseIdx = types.indexOf('curse');
            const curseBtn = container.children[curseIdx];
            curseBtn.style.textShadow = "0 0 20px #8b0000";
            setTimeout(() => curseBtn.style.textShadow = "none", 400);
        }, 800);

        types.forEach((type, i) => {
            const btn = document.createElement('div');
            btn.style.cursor = 'pointer'; btn.textContent = "🍷";
            btn.onclick = () => {
                if (type === 'relic') { btn.textContent = "✨"; finish(true); }
                else if (type === 'empty') { btn.textContent = "💨"; finish(true); }
                else { 
                    btn.textContent = "💀"; UI.log("💀 Maldição! O Fantasma se aproxima!");
                    this.moveGhostTowardsPlayer();
                    finish(false); 
                }
            };
            container.appendChild(btn);
        });
    },

    moveGhostTowardsPlayer() {
        if (!State.ghost.active) return;
        const p = State.players[State.turn];
        if (State.ghost.x < p.x) State.ghost.x++; else if (State.ghost.x > p.x) State.ghost.x--;
        if (State.ghost.y < p.y) State.ghost.y++; else if (State.ghost.y > p.y) State.ghost.y--;
    },

    runRuneMemoryGame(content, title, finish) {
        title.textContent = "FECHADURA DE ALMAS";
        const runes = ['🔮', '📜', '🕯️', '💀'];
        const sequence = [];
        for(let i=0; i<3; i++) sequence.push(runes[Math.floor(Math.random()*runes.length)]);
        
        const gameDiv = document.createElement('div');
        gameDiv.innerHTML = `<p id="rune-msg" style="margin-bottom:20px">Memorize a sequência!</p><div id="rune-display" style="font-size:3rem; margin-bottom:20px; height:60px"></div><div id="rune-btns" class="hidden" style="display:flex; gap:10px; justify-content:center"></div>`;
        content.appendChild(gameDiv);
        
        const display = document.getElementById('rune-display');
        let step = 0;
        const showNext = () => {
            if(step < sequence.length) {
                display.textContent = sequence[step];
                setTimeout(() => { display.textContent = ""; step++; setTimeout(showNext, 200); }, 800);
            } else {
                document.getElementById('rune-msg').textContent = "Repita a sequência!";
                document.getElementById('rune-btns').classList.remove('hidden');
            }
        };
        setTimeout(showNext, 500);

        const btnContainer = document.getElementById('rune-btns');
        let userStep = 0;
        runes.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'btn'; btn.style.fontSize = '1.5rem'; btn.textContent = r;
            btn.onclick = () => {
                if(r === sequence[userStep]) {
                    userStep++;
                    if(userStep === sequence.length) { display.textContent = "✔️"; finish(true); }
                } else { display.textContent = "❌"; finish(false); }
            };
            btnContainer.appendChild(btn);
        });
    },



    runHeartbeatGame(content, title, finish) {
        title.textContent = "FÔLEGO CURTO";
        const gameDiv = document.createElement('div');
        gameDiv.innerHTML = `<p style="margin-bottom:15px">Mantenha a barra na zona <b style="color:#2ecc71">VERDE</b>!</p>
            <div style="width:100%; height:30px; background:#333; position:relative; border-radius:15px; overflow:hidden">
                <div id="safe-zone" style="position:absolute; width:30%; height:100%; background:rgba(46, 204, 113, 0.4); left:35%"></div>
                <div id="heart-bar" style="position:absolute; width:10px; height:100%; background:#fff; left:50%"></div>
            </div>
            <p style="margin-top:15px; font-size:0.9rem">Pressione ESPAÇO ou CLIQUE para mover</p>`;
        content.appendChild(gameDiv);
        
        const bar = document.getElementById('heart-bar'), zone = document.getElementById('safe-zone');
        let pos = 50, vel = 0, zonePos = 35, timeIn = 0;
        
        const loop = setInterval(() => {
            vel += (Math.random() - 0.5) * 2;
            pos += vel; vel *= 0.95;
            if(pos < 0) pos = 0; if(pos > 95) pos = 95;
            bar.style.left = pos + "%";
            
            zonePos += (Math.random() - 0.5) * 4;
            if(zonePos < 0) zonePos = 0; if(zonePos > 70) zonePos = 70;
            zone.style.left = zonePos + "%";

            if(pos >= zonePos && pos <= zonePos + 30) {
                timeIn += 0.02;
                if(timeIn >= 2) { clearInterval(loop); finish(true); }
            }
        }, 20);

        const push = () => { vel += pos < 50 ? 3 : -3; };
        window.addEventListener('keydown', (e) => { if(e.code === 'Space') push(); });
        gameDiv.onclick = push;
    },

    resolveChest(chest, success) {
        if (success) {
            chest.active = false;
            if (chest.has) {
                State.relics++; UI.log("✨ Relíquia encontrada!");
                if (State.relics >= CONFIG.relicsNeeded) {
                    UI.log("🏆 Mansão Purificada! O nível aumenta...");
                    setTimeout(() => { State.relics = 0; State.level++; this.generateLevel(); UI.update(); }, 1500);
                }
            } else {
                // Chance de encontrar item se não for relíquia
                if (Math.random() > 0.4) {
                    this.giveRandomItem();
                } else {
                    UI.log("📦 O baú estava vazio...");
                }
            }
        } else { 
            // Amuleto de Proteção (Segunda Chance)
            const p = State.players[State.turn];
            if (p.item && p.item.id === 'amulet') {
                UI.log("🧿 Amuleto quebrou e te protegeu!");
                p.item = null;
            } else {
                UI.log("💀 Falha! O Fantasma despertou!"); 
                State.ghost.active = true; 
                State.ghostWaitTurn = true;
            }
        }
        if (State.players[State.turn].curM <= 0) this.passTurn();
        UI.update();
    },

    giveRandomItem() {
        const items = [
            { id: 'candle', name: 'Vela Sagrada', sym: '🕯️', desc: 'Revela área 3x3' },
            { id: 'potion', name: 'Poção de Névoa', sym: '🧪', desc: 'Invisível por 1 turno' },
            { id: 'salt', name: 'Armadilha de Sal', sym: '🪤', desc: 'Paralisa Fantasma' },
            { id: 'amulet', name: 'Amuleto', sym: '🧿', desc: 'Proteção passiva' }
        ];
        const item = items[Math.floor(Math.random() * items.length)];
        const p = State.players[State.turn];
        if (!p.item) {
            p.item = item;
            UI.log(`🎒 Encontrou: ${item.name}!`);
        } else {
            UI.log("📦 Baú tinha um item, mas seu inventário está cheio!");
        }
    },

    useItem() {
        const p = State.players[State.turn];
        if (!p.item || State.isBusy) return;

        switch(p.item.id) {
            case 'candle':
                UI.log("🕯️ A luz da vela dissipa as sombras!");
                for(let dx=-1; dx<=1; dx++) {
                    for(let dy=-1; dy<=1; dy++) {
                        let nx = p.x + dx, ny = p.y + dy;
                        if(nx>=0 && nx<CONFIG.gridSize && ny>=0 && ny<CONFIG.gridSize) State.fog[nx][ny] = false;
                    }
                }
                p.item = null;
                break;
            case 'potion':
                UI.log("🧪 Você desapareceu na névoa!");
                p.isInvisible = true;
                p.item = null;
                break;
            case 'salt':
                UI.log("🪤 Armadilha de sal colocada!");
                State.saltTrap = { x: p.x, y: p.y };
                p.item = null;
                break;
            case 'amulet':
                UI.log("🧿 O Amuleto é passivo, protege contra falhas!");
                return; // Não gasta o item clicando
        }
        UI.update();
    },

    useAbility() {
        let p = State.players[State.turn];
        if (p.usedAbility || State.isBusy) return;
        let success = false;
        switch(p.id) {
            case 'atleta': p.curM += 3; UI.log("🏃 Atleta usou fôlego extra!"); success = true; break;
            case 'vidente': UI.log("👁️ Vidente revelou os baús!"); State.chests.forEach(c => { if(c.active) State.fog[c.x][c.y] = false; }); success = true; break;
            case 'engenheiro': if (State.ghost.active) { State.ghost.slow = true; UI.log("⚙️ Engenheiro sabotou o Fantasma!"); success = true; } else UI.log("❌ O Fantasma ainda não apareceu!"); break;
            case 'ladrao':
                let adjChest = State.chests.find(c => c.active && (Math.abs(c.x - p.x) + Math.abs(c.y - p.y) === 1));
                if (adjChest) { this.startMinigame(adjChest, true); success = true; } else UI.log("❌ Nenhum baú adjacente!");
                break;
        }
        if (success) { p.usedAbility = true; UI.update(); }
    },

    moveGhost() {
        if (!State.ghost.active) return;
        if (State.ghostWaitTurn) {
            State.ghostWaitTurn = false;
            UI.log("👻 O Fantasma está se materializando...");
            return;
        }

        // Armadilha de Sal
        if (State.saltTrap && State.ghost.x === State.saltTrap.x && State.ghost.y === State.saltTrap.y) {
            UI.log("👻 O Fantasma ficou preso no sal!");
            State.saltTrap = null;
            return;
        }

        let target = null, minDist = Infinity;
        State.players.forEach(p => {
            if (p.isInvisible) return; // Ignora jogadores invisíveis
            let d = Math.abs(p.x - State.ghost.x) + Math.abs(p.y - State.ghost.y);
            if (d < minDist) { minDist = d; target = p; }
        });

        if (!target) {
            UI.log("👻 O Fantasma não vê ninguém...");
            return;
        }

        let moves = State.ghost.slow ? 1 : 3;
        for (let i = 0; i < moves; i++) {
            if (State.ghost.x < target.x) State.ghost.x++; else if (State.ghost.x > target.x) State.ghost.x--;
            else if (State.ghost.y < target.y) State.ghost.y++; else if (State.ghost.y > target.y) State.ghost.y--;
            
            // Só mata se o jogador não estiver invisível
            const hitPlayer = State.players.find(p => p.x === State.ghost.x && p.y === State.ghost.y && !p.isInvisible);
            if (hitPlayer) {
                this.gameOver(false, "O Fantasma alcançou vocês!");
                break;
            }
        }
    },

    passTurn() {
        if (State.isBusy || !State.gameActive) return;
        let p = State.players[State.turn];
        p.curM = p.moves; p.usedAbility = false;
        p.isInvisible = false; // Perde invisibilidade ao passar o turno
        
        State.turn = (State.turn + 1) % State.players.length;
        if (State.turn === 0) this.moveGhost();
        this.startTurnTimer();
        UI.update(); UI.log(`Turno de: ${State.players[State.turn].name}`);
    },

    gameOver(win, message) {
        State.gameActive = false;
        if (State.turnTimer) clearInterval(State.turnTimer);
        if (State.mgTimer) clearInterval(State.mgTimer);
        const screen = document.getElementById('game-over-screen');
        document.getElementById('go-title').textContent = win ? "VITÓRIA!" : "DERROTA";
        document.getElementById('go-message').textContent = message;
        screen.classList.remove('hidden');
    },

    gameLoop() { Renderer.draw(); requestAnimationFrame(() => this.gameLoop()); }
};

window.onload = () => GameLogic.init();
