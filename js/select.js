import { THREE } from './core/three.js';
import { Database } from './database/database.js';
import { authGuard } from './auth/authGuard.js';
import { gameState } from './gameState.js';
import { SpaceScene } from './map/spaceScene.js';
import { CameraController } from './cameraControllerLobby.js';
import { Character } from './character/character.js';
import { RenderSystem } from './core/renderSystem.js';

class CharacterSelector {
    constructor() {
        this.db = new Database();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.selectedCharacter = null;
        this.characters = [];
        this.renderSystem = RenderSystem.getInstance();
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
        if (!userId) {
            console.error('❌ ID do usuário não encontrado');
            setTimeout(() => window.location.replace('/pages/login.html'), 2000);
            return;
        }

        console.log('🔍 Carregando personagens para usuário:', userId);
        try {
            // Força uma nova busca no banco de dados
            const freshCharacters = await this.db.getCharactersByUserId(userId);
            console.log('📥 Personagens recebidos:', freshCharacters);

            if (!Array.isArray(freshCharacters)) {
                console.error('❌ Resposta inválida do banco de dados');
                this.characters = [];
            } else {
                // Atualiza a lista local com os dados mais recentes
                this.characters = [...freshCharacters];
            }

            if (this.characters.length === 0) {
                console.log('⚠️ Nenhum personagem encontrado');
                setTimeout(() => {
                    console.log('🔄 Redirecionando para criação de personagem...');
                    window.location.replace('create.html');
                }, 3000);
                return;
            }

            console.log('✅ Exibindo personagens encontrados');
            this.displayCharacters();

            // Selecionar automaticamente o primeiro personagem
            if (this.characters.length > 0) {
                console.log('🎯 Selecionando primeiro personagem automaticamente');
                this.selectCharacter(this.characters[0]);
            }

        } catch (error) {
            console.error('❌ Erro ao carregar personagens:', error);
            this.handleError(error);
        }
    }

    async initializeScene() {
        const canvas = document.getElementById('characterPreview');
        const container = canvas.parentElement;
        
        if (!canvas || !container) {
            console.error('❌ Canvas não encontrado');
            throw new Error('Canvas não encontrado');
        }

        const { scene, camera, renderer } = this.renderSystem.initialize(canvas, container);
        
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        this.spaceScene = new SpaceScene(scene, camera);
        this.cameraController = new CameraController(this.camera, this.renderer, this.scene);
        this.spaceScene.setCameraController(this.cameraController);
        this.renderSystem.setActiveScene(this.spaceScene);
        
        const orbitButton = document.getElementById('toggleOrbit');
        if (orbitButton) {
            orbitButton.classList.add('active'); // Começa ativo pois a câmera começa em modo cinematográfico
            orbitButton.addEventListener('click', () => {
                this.cameraController.toggleCinematicMode();
            });
        }

        this.renderSystem.animate();
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
        console.log('🎮 Selecionando personagem:', character);
        this.selectedCharacter = character;
        
        // Atualizar UI
        document.querySelectorAll('.character-option').forEach(el => 
            el.classList.toggle('selected', el.querySelector('h3').textContent === character.name)
        );

        // Atualizar preview 3D com todos os dados do personagem
        if (this.spaceScene) {
            try {
                console.log('Atualizando modelo 3D:', character);
                
                this.spaceScene.updateCharacterModel({
                    name: character.name,
                    mainColor: character.mainColor || character.main_color,
                    skinColor: character.skinColor || character.skin_color,
                    accentColor: character.accentColor || character.accent_color,
                    topRadius: parseFloat(character.topRadius || character.top_radius || 0.75),
                    bottomRadius: parseFloat(character.bottomRadius || character.bottom_radius || 0.75)
                });
            } catch (error) {
                console.error('Erro ao atualizar preview 3D:', error);
            }
        } else {
            console.warn('SpaceScene não está inicializada');
        }

        // Habilitar botão de jogar
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
                window.location.href = 'game.html';
            }
        });

        // Botão de logout
        document.getElementById('logoutButton').addEventListener('click', () => {
            authGuard.logout();
        });
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
