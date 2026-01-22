const CONFIG = {
    gridSize: 12,
    tileSize: 60,
    relicsNeeded: 3,
    turnTimeLimit: 60,
    minigameTimeLimit: 40,
    classes: [
        { id: 'atleta', name: 'Atleta', sym: '🏃', moves: 5, color: '#e74c3c', abilityDesc: 'Corrida Extra (+3 mov)' },
        { id: 'ladrao', name: 'Ladrão', sym: '🕵️', moves: 4, color: '#2ecc71', abilityDesc: 'Abrir Baú Adjacente' },
        { id: 'vidente', name: 'Vidente', sym: '👁️', moves: 4, color: '#3498db', abilityDesc: 'Revelar Baús no Mapa' },
        { id: 'engenheiro', name: 'Engenheiro', sym: '⚙️', moves: 4, color: '#f1c40f', abilityDesc: 'Sabotar Fantasma (Lento)' }
    ],
    spawnPositions: [
        { x: 0, y: 0 }, { x: 11, y: 0 }, { x: 0, y: 11 }, { x: 11, y: 11 }
    ],
    colors: {
        fog: '#000000',
        ground: '#0a0a0a',
        grid: '#1a1a1a',
        highlight: 'rgba(212, 175, 55, 0.2)'
    }
};

let State = {
    players: [],
    turn: 0,
    relics: 0,
    chests: [],
    fog: [],
    ghost: {
        x: 6, 
        y: 6, 
        active: false, 
        slow: false,
        sym: "👻",
        slowSym: "🐌"
    },
    isBusy: false,
    gameActive: false,
    level: 1,
    turnTimer: null,
    mgTimer: null,
    timeLeft: 0,
    ghostWaitTurn: false
};
