import { Database } from './database/database.js';
import { authGuard } from './auth/authGuard.js';
import { Character } from './character/character.js';
import { CharacterPreviewController } from './character/characterPreviewController.js';
import { StateManager } from './core/stateManager.js';

class CharacterSelector {
    constructor() {
        this.db = new Database();
        this.stateManager = StateManager.getInstance();
        this.selectedCharacter = null;
        this.characters = [];
        this.previewController = null;
    }

    async initialize() {
        try {
            console.log('🚀 Iniciando CharacterSelector...');
            
            // Verificar autenticação primeiro
            if (!this.checkAuth()) return;
            
            // Inicializar cena 3D antes de carregar personagens
            await this.initializeScene();
            
            // Carregar personagens depois que a cena estiver pronta
            await this.loadAndDisplayCharacters();
            
            // Configurar event listeners por último
            this.setupEventListeners();
            
            console.log('✅ Inicialização completa');
        } catch (error) {
            console.error('❌ Erro fatal:', error);
            this.handleError(error);
        }
    }

    async checkDatabase() {
        try {
            console.log('🔍 Verificando conexão com banco de dados...');
            await this.db.ensureApiUrl();
            console.log('✅ Banco de dados verificado');
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar banco de dados:', error);
            throw error;
        }
    }

    checkAuth() {
        const authStatus = {
            isActive: authGuard.isUserActive(),
            userId: authGuard.getActiveUserId(),
            token: !!this.stateManager.getUser().token
        };

        console.log('🔐 Status da autenticação:', authStatus);

        if (!authStatus.isActive || !authStatus.token) {
            console.warn('⚠️ Usuário não autenticado');
            setTimeout(() => window.location.replace('/pages/login.html'), 2000);
            return false;
        }

        return true;
    }

    async loadAndDisplayCharacters() {
        const userId = authGuard.getActiveUserId();
        try {
            const characters = await this.db.getCharactersByUserId(userId);
            this.stateManager.setCharacters(characters);
            this.characters = characters;
            this.displayCharacters();
            
            // Selecionar primeiro personagem automaticamente se houver
            if (characters.length > 0) {
                this.selectCharacter(characters[0]);
            }
        } catch (error) {
            console.error('Erro ao carregar personagens:', error);
            this.handleError(error);
        }
    }

    processCharacters(characters) {
        console.log('📥 Personagens recebidos:', characters);
        
        this.characters = characters.map(charData => {
            console.log('🔄 Processando:', charData.name);
            
            // ADICIONAR ESTE LOG
            console.log('🔍 faceExpression antes do construtor:', charData.faceExpression);
            
            return new Character(charData);
        });

        this.displayCharacters();

        if (this.characters.length > 0) {
            this.selectCharacter(this.characters[0]);
        }
    }

    async initializeScene() {
        try {
            const canvas = document.getElementById('characterPreview');
            const container = canvas.parentElement;
            
            if (!canvas || !container) {
                throw new Error('Canvas ou container não encontrado');
            }

            this.previewController = new CharacterPreviewController(canvas, container);
            
            // Garantir que a câmera cinematográfica esteja ativada inicialmente
            if (this.previewController.controls) {
                this.previewController.controls.enableCinematicMode();
                const orbitButton = document.getElementById('toggleOrbit');
                if (orbitButton) {
                    orbitButton.classList.add('active');
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar cena:', error);
            throw error;
        }
    }

    displayCharacters() {
        const container = document.getElementById('characterList');
        container.innerHTML = '';

        this.characters.forEach(character => {
            const element = this.createCharacterElement(character);
            container.appendChild(element);
        });
    }

    createCharacterElement(character) {
        const element = document.createElement('div');
        element.className = 'character-option';
        element.innerHTML = `
            <h3>${character.name}</h3>
            <div class="character-preview" style="background-color: ${character.mainColor}"></div>
            <button class="delete-button">
                <span class="material-icons">delete</span>
            </button>
        `;

        element.addEventListener('click', () => this.selectCharacter(character));
        element.querySelector('.delete-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDeleteConfirmation(character);
        });

        return element;
    }

    selectCharacter(character) {
        this.selectedCharacter = character;
        this.stateManager.setCurrentCharacter(character);
        
        // Atualizar UI
        document.querySelectorAll('.character-option').forEach(el => 
            el.classList.toggle('selected', el.querySelector('h3').textContent === character.name)
        );

        if (this.previewController) {
            this.previewController.updateCharacter(character);
        }

        // Habilitar botão de play
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.disabled = false;
        }

        console.log('🎮 Personagem selecionado:', character.name);
    }

    setupEventListeners() {
        // Botão de novo personagem
        const newCharButton = document.getElementById('newCharacterButton');
        console.log('🔍 Botão novo personagem encontrado:', !!newCharButton);
        
        newCharButton.addEventListener('click', () => {
            console.log('🖱️ Botão novo personagem clicado');
            if (authGuard.isUserActive()) {
                console.log('🔐 Usuário autenticado, redirecionando...');
                // Usar caminho absoluto para garantir
                window.location.href = '../pages/create.html';
            } else {
                console.log('⚠️ Usuário não autenticado');
            }
        });

        // Botão de jogar
        document.getElementById('playButton').addEventListener('click', () => {
            const currentCharacter = this.stateManager.getCurrentCharacter();
            if (currentCharacter && authGuard.isUserActive()) {
                window.location.href = 'gamemode.html'; // Alterado de game.html para gamemode.html
            } else {
                console.error('❌ Nenhum personagem selecionado ou usuário não autenticado');
            }
        });

        // Botão de logout
        document.getElementById('logoutButton').addEventListener('click', () => {
            authGuard.logout();
        });

        // Adicionar handler para o botão toggle da lista de personagens
        const toggleBtn = document.getElementById('toggleCharacterList');
        const charListSection = document.querySelector('.character-list-section');
        
        if (toggleBtn && charListSection) {
            toggleBtn.addEventListener('click', () => {
                charListSection.classList.toggle('active');
            });

        }
    }

    async deleteCharacter(character) {
        try {
            console.log('🗑️ Deletando personagem:', character);
            
            if (!character?.id) {
                throw new Error('ID do personagem não fornecido');
            }

            const result = await this.db.deleteCharacter(character);
            
            if (result.error) {
                throw new Error(result.error);
            }

            // Recarregar lista de personagens do servidor
            await this.loadAndDisplayCharacters();
            
            // Resetar seleção se necessário
            if (this.selectedCharacter?.id === character.id) {
                this.selectedCharacter = null;
                document.getElementById('playButton').disabled = true;
            }

            console.log('✅ Personagem deletado com sucesso');

        } catch (error) {
            console.error('❌ Erro ao deletar personagem:', error);
        }
    }

    showDeleteConfirmation(character) {
        console.log('🗑️ Solicitação de deleção para:', character.name);
        
        const confirmed = confirm(`Tem certeza que deseja deletar o personagem "${character.name}"?\nEsta ação não pode ser desfeita!`);
        
        if (confirmed) {
            this.deleteCharacter(character);
        }
    }

    handleError(error) {
        console.error('Erro:', error);
        setTimeout(() => {
            this.stateManager.setRedirectUrl(null);
            authGuard.logout();
        }, 3000);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const stateManager = StateManager.getInstance();
    const initialState = {
        user: stateManager.getUser(),
        url: window.location.href
    };
    
    console.log('📋 Estado inicial:', initialState);
    
    const selector = new CharacterSelector();
    selector.initialize().catch(error => {
        console.error('❌ Erro fatal:', error);
        setTimeout(() => selector.handleError(error), 2000);
    });
});
