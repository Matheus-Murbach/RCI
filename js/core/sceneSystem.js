import { THREE } from './three.js';
import { RenderSystem } from './renderSystem.js';
import { LightSystem } from './lightSystem.js';

export class SceneSystem {
    static instance = null;

    constructor() {
        if (SceneSystem.instance) {
            return SceneSystem.instance;
        }
        SceneSystem.instance = this;
        
        this.renderSystem = RenderSystem.getInstance();
        this.lightSystem = LightSystem.getInstance();
    }

    initializeScene(canvas, container) {
        // Inicializar sistemas base
        const { scene, camera, renderer } = this.renderSystem.initialize(canvas, container);
        
        // Configurar iluminação padrão
        this.lightSystem.setupLighting(scene);
        
        return { scene, camera, renderer };
    }

    static getInstance() {
        if (!SceneSystem.instance) {
            SceneSystem.instance = new SceneSystem();
        }
        return SceneSystem.instance;
    }
}
