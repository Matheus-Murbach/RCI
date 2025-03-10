import { THREE } from '../core/three.js';
import { SceneSystem } from '../core/sceneSystem.js';
import { RenderSystem } from '../core/renderSystem.js';

export class BaseScene {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.sceneSystem = SceneSystem.getInstance();
        this.renderSystem = RenderSystem.getInstance();
        
        if (!this.scene || !this.camera) {
            console.error('Scene ou Camera não foram fornecidos ao construtor');
        }
    }

    init() {
        // Simplificar inicialização
        this.scene.background = new THREE.Color(0x000033);
        this.scene.fog = new THREE.Fog(0x000033, 1, 50);
        return true;
    }

    update() {
        // Método base vazio que pode ser sobrescrito
        return true;
    }
}
