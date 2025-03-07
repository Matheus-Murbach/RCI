import { Database } from './database/database.js';
import { authGuard } from './auth/authGuard.js';
import { Character } from './character/character.js';
import { CharacterPreviewController } from './character/characterPreviewController.js';

class CharacterSelector {
    constructor() {
        this.db = new Database();
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
            token: !!localStorage.getItem('userToken')
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
        console.log('👤 Carregando personagens para usuário:', userId);

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                const characters = await this.db.getCharactersByUserId(userId);
                this.processCharacters(characters);
                return;
            } catch (error) {
                console.error(`❌ Tentativa ${retryCount + 1}/${maxRetries} falhou:`, error);
                retryCount++;
                
                if (retryCount === maxRetries) {
                    this.handleError(error);
                    return;
                }
                
                // Esperar antes de tentar novamente
                await new Promise(r => setTimeout(r, 1000 * retryCount));
            }
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
        console.log('🎮 Selecionando personagem:', character.name);
        this.selectedCharacter = character;
        
        // Atualizar seleção visual
        document.querySelectorAll('.character-option').forEach(el => 
            el.classList.toggle('selected', el.querySelector('h3').textContent === character.name)
        );

        // Garantir que o preview seja atualizado
        if (this.previewController) {
            console.log('🎨 Atualizando preview para:', character.name);
            this.previewController.updateCharacter(character);
        } else {
            console.warn('⚠️ PreviewController não encontrado');
        }

        document.getElementById('playButton').disabled = false;
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
            if (this.selectedCharacter && authGuard.isUserActive()) {
                // Salvar o personagem selecionado no localStorage
                localStorage.setItem('selectedCharacter', JSON.stringify(this.selectedCharacter));
                // Usar novo padrão camelCase
                localStorage.removeItem('redirectAfterLogin');
                window.location.href = 'game.html';
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
            // Garantir limpeza de todos os dados antes do logout
            localStorage.removeItem('redirectAfterLogin');
            authGuard.logout();
        }, 3000);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const initialState = {
        localStorage: {
            activeUserId: localStorage.getItem('activeUserId'),
            userToken: !!localStorage.getItem('userToken'),
            currentUser: localStorage.getItem('currentUser')
        },
        url: window.location.href
    };
    
    console.log('📋 Estado inicial:', initialState);
    
    const selector = new CharacterSelector();
    selector.initialize().catch(error => {
        console.error('❌ Erro fatal:', error);
        setTimeout(() => selector.handleError(error), 2000);
    });
});
