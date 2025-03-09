import { StateManager } from './core/stateManager.js';
import { MapGenerator } from './map/mapGenerator.js';

class Game {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.mapGenerator = null;
    }

    async initialize() {
        try {
            // Adicionar listener para o botão de retorno
            const backButton = document.getElementById('backButton');
            if (backButton) {
                backButton.addEventListener('click', () => {
                    window.location.href = 'select.html';
                });
            }
            
            console.log('🎮 Iniciando jogo...');
            
            // Verificar personagem selecionado
            const currentCharacter = this.stateManager.getCurrentCharacter();
            console.log('🎮 Personagem atual:', currentCharacter);
            
            // Gerar mapa
            console.log('🗺️ Iniciando geração do mapa...');
            this.mapGenerator = new MapGenerator(50, 50);
            this.mapGenerator.generateMap();
            console.log('✨ Mapa gerado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar jogo:', error);
        }
    }
}

// Inicializador com tratamento de erro melhorado
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, iniciando jogo...');
    const game = new Game();
    game.initialize().catch(error => {
        console.error('💥 Erro fatal:', error);
    });
});
