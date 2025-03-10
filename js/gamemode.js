import { StateManager } from './core/stateManager.js';
import { authGuard } from './auth/authGuard.js';

class GameModeSelector {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.selectedMode = null;
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
                // Se estiver na seleção de tema, voltar para seleção de modo
                const themeSection = document.getElementById('themeSelection');
                if (themeSection.classList.contains('visible')) {
                    this.showModeSelection();
                } else {
                    window.location.href = 'select.html';
                }
            });
            console.log('✅ Botão voltar configurado');
        }

        // Modo livre
        const freePlayButton = document.getElementById('freePlayMode');
        if (freePlayButton) {
            freePlayButton.addEventListener('click', () => {
                console.log('🎲 Selecionado modo livre');
                this.selectedMode = 'free';
                this.showThemeSelection();
            });
            console.log('✅ Botão modo livre configurado');
        }

        // Temas
        const scifiTheme = document.getElementById('scifiTheme');
        if (scifiTheme) {
            scifiTheme.addEventListener('click', () => {
                this.startGame(this.selectedMode, 'scifi');
            });
        }
    }

    showThemeSelection() {
        // Esconder seleção de modo
        const modeOptions = document.querySelector('.gamemode-options');
        modeOptions.style.display = 'none';
        
        // Mostrar seleção de tema
        const themeSection = document.getElementById('themeSelection');
        themeSection.classList.remove('hidden');
        themeSection.classList.add('visible');
    }

    showModeSelection() {
        // Mostrar seleção de modo
        const modeOptions = document.querySelector('.gamemode-options');
        modeOptions.style.display = 'grid';
        
        // Esconder seleção de tema
        const themeSection = document.getElementById('themeSelection');
        themeSection.classList.remove('visible');
        themeSection.classList.add('hidden');
        
        this.selectedMode = null;
    }

    startGame(mode, theme) {
        console.log(`🎮 Iniciando jogo no modo: ${mode}, tema: ${theme}`);
        
        // Atualizar apenas via StateManager
        this.stateManager.setGameMode(mode);
        this.stateManager.updateSettings({
            theme: theme,
            loaded: true
        });
        
        window.location.href = 'game.html';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando seletor de modo...');
    const selector = new GameModeSelector();
});
