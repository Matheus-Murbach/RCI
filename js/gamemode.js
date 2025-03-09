import { StateManager } from './core/stateManager.js';
import { authGuard } from './auth/authGuard.js';

class GameModeSelector {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.initialize();
    }

    initialize() {
        // Verificar autenticação
        if (!authGuard.isUserActive()) {
            console.log('Usuário não autenticado, redirecionando...');
            window.location.replace('login.html');
            return;
        }

        console.log('🎮 Inicializando seleção de modo...');
        this.setupEventListeners();
        console.log('✅ Eventos configurados');
    }

    setupEventListeners() {
        console.log('🔄 Configurando eventos...');
        
        // Botão voltar
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = 'select.html';
            });
            console.log('✅ Botão voltar configurado');
        }

        // Modo livre
        const freePlayButton = document.getElementById('freePlayMode');
        if (freePlayButton) {
            freePlayButton.addEventListener('click', () => {
                console.log('🎲 Iniciando modo livre...');
                this.startGame('free');
            });
            console.log('✅ Botão modo livre configurado');
        }
    }

    startGame(mode) {
        console.log(`🎮 Iniciando jogo no modo: ${mode}`);
        // Salvar modo selecionado no state
        this.stateManager.setGameMode(mode);
        
        // Redirecionar para o jogo
        window.location.href = 'game.html';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando seletor de modo...');
    const selector = new GameModeSelector();
});
