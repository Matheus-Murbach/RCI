import { RenderSystem } from './core/renderSystem.js';

export const gameState = {
    currentCharacter: null,
    characters: [],
    renderSystem: null,

    loadCharacters() {
        try {
            const savedCharacters = localStorage.getItem('characters');
            this.characters = savedCharacters ? JSON.parse(savedCharacters) : [];
            return this.characters;
        } catch (error) {
            console.error('Erro ao carregar personagens:', error);
            return [];
        }
    },

    saveCharacter(character) {
        try {
            const existingIndex = this.characters.findIndex(c => c.name === character.name);
            
            if (existingIndex >= 0) {
                this.characters[existingIndex] = character;
            } else {
                this.characters.push(character);
            }
            
            localStorage.setItem('characters', JSON.stringify(this.characters));
            return true;
        } catch (error) {
            console.error('Erro ao salvar personagem:', error);
            return false;
        }
    },

    updateCharacterModel(character) {
        this.currentCharacter = character;
        // Implementação do update do modelo 3D aqui
    },

    initializeScene(canvas, container) {
        this.renderSystem = RenderSystem.getInstance();
        const { scene, camera, renderer } = this.renderSystem.initialize(canvas, container);
        
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        return true;
    },

    handleResize(container) {
        if (!this.camera || !this.renderer) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
};
