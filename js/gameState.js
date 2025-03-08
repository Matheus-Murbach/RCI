import { RenderSystem } from './core/renderSystem.js';
import { StateManager } from './core/stateManager.js';

export const gameState = {
    stateManager: StateManager.getInstance(),
    renderSystem: null,

    loadCharacters() {
        return this.stateManager.getCharacters();
    },

    saveCharacter(character) {
        const characters = this.stateManager.getCharacters();
        const existingIndex = characters.findIndex(c => c.name === character.name);
        
        if (existingIndex >= 0) {
            characters[existingIndex] = character;
        } else {
            characters.push(character);
        }
        
        this.stateManager.setCharacters(characters);
        return true;
    },

    updateCharacterModel(character) {
        this.stateManager.setCurrentCharacter(character);
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
