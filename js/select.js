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
        this.pendingDeleteCharacter = null;
    }

    async initialize() {
        try {
            console.log('🚀 Iniciando CharacterSelector...');

            if (!this.checkAuth()) return;

            await this.initializeScene();
            await this.loadAndDisplayCharacters();
            this.setupEventListeners();

            console.log('✅ Inicialização completa');
        } catch (error) {
            console.error('❌ Erro fatal:', error);
            this.handleError(error);
        }
    }

    checkAuth() {
        const isActive = authGuard.isUserActive();
        const hasToken = !!this.stateManager.getUser().token;

        if (!isActive || !hasToken) {
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

            if (characters.length > 0) {
                this.selectCharacter(characters[0]);
            }
        } catch (error) {
            console.error('Erro ao carregar personagens:', error);
            this.handleError(error);
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
        try {
            console.log('🎮 Selecionando personagem:', character.name);

            this.selectedCharacter = character;
            this.stateManager.setCurrentCharacter(character);
            this.stateManager.saveState();

            document.querySelectorAll('.character-option').forEach(el =>
                el.classList.toggle('selected', el.querySelector('h3').textContent === character.name)
            );

            if (this.previewController) {
                this.previewController.updateCharacter(character);
            }

        } catch (error) {
            console.error('❌ Erro ao selecionar personagem:', error);
            throw error;
        }
    }

    setupEventListeners() {
        const newCharButton = document.getElementById('newCharacterButton');
        if (newCharButton) {
            newCharButton.addEventListener('click', () => {
                if (authGuard.isUserActive()) {
                    window.location.href = 'create.html';
                }
            });
        }

        document.getElementById('logoutButton').addEventListener('click', () => {
            authGuard.logout();
        });

        const toggleBtn = document.getElementById('toggleCharacterList');
        const charListSection = document.querySelector('.character-list-section');

        if (toggleBtn && charListSection) {
            toggleBtn.addEventListener('click', () => {
                charListSection.classList.toggle('active');
            });
        }

        this.setupDeleteModal();
    }

    setupDeleteModal() {
        const modal = document.getElementById('deleteModal');
        const confirmBtn = document.getElementById('confirmDelete');
        const cancelBtn = document.getElementById('cancelDelete');
        const input = document.getElementById('confirmDeleteInput');

        if (!modal || !confirmBtn || !cancelBtn || !input) return;

        confirmBtn.addEventListener('click', () => {
            if (!this.pendingDeleteCharacter) return;
            if (input.value.trim() === this.pendingDeleteCharacter.name) {
                this.deleteCharacter(this.pendingDeleteCharacter);
                this.closeDeleteModal();
            } else {
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 600);
            }
        });

        cancelBtn.addEventListener('click', () => this.closeDeleteModal());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeDeleteModal();
        });
    }

    showDeleteConfirmation(character) {
        this.pendingDeleteCharacter = character;

        const modal = document.getElementById('deleteModal');
        const nameSpan = document.getElementById('charNameToDelete');
        const input = document.getElementById('confirmDeleteInput');

        if (!modal) return;

        nameSpan.textContent = character.name;
        input.value = '';
        modal.classList.remove('hidden');
        input.focus();
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.add('hidden');
        this.pendingDeleteCharacter = null;
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

            await this.loadAndDisplayCharacters();

            if (this.selectedCharacter?.id === character.id) {
                this.selectedCharacter = null;
            }

            console.log('✅ Personagem deletado com sucesso');

        } catch (error) {
            console.error('❌ Erro ao deletar personagem:', error);
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

document.addEventListener('DOMContentLoaded', () => {
    const selector = new CharacterSelector();
    selector.initialize().catch(error => {
        console.error('❌ Erro fatal:', error);
        setTimeout(() => selector.handleError(error), 2000);
    });
});
