const UI = {
    update() {
        const p = State.players[State.turn];
        if (!p) return;

        const nameEl = document.getElementById('player-name');
        nameEl.textContent = `${p.sym} ${p.name}`;
        nameEl.style.color = p.color;

        document.getElementById('move-count').textContent = p.curM;
        document.getElementById('relic-count').textContent = `${State.relics} / ${CONFIG.relicsNeeded}`;
        
        const abilityBtn = document.getElementById('ability-btn');
        abilityBtn.disabled = p.usedAbility;
        abilityBtn.title = p.abilityDesc;
    },

    log(message) {
        const logEl = document.getElementById('event-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `> ${message}`;
        logEl.prepend(entry);
        
        if (logEl.children.length > 8) {
            logEl.removeChild(logEl.lastChild);
        }
    }
};
