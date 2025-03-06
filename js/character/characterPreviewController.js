import { RenderSystem } from '../core/renderSystem.js';
import { SpaceScene } from '../map/spaceScene.js';
import { CameraController } from '../cameraControllerLobby.js';

export class CharacterPreviewController {
    constructor(canvas, container) {
        this.renderSystem = RenderSystem.getInstance();
        this.initialize(canvas, container);
    }

    initialize(canvas, container) {
        console.log('🎨 Inicializando preview do personagem...');
        
        // Inicializar sistema de renderização
        const { scene, camera, renderer } = this.renderSystem.initialize(canvas, container);
        this.scene = scene;
        
        // Criar cena espacial
        this.spaceScene = new SpaceScene(scene, camera);
        
        // Configurar câmera inicial
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 0, 0);
        
        // Configurar câmera
        this.cameraController = new CameraController(camera, renderer, scene);
        this.spaceScene.setCameraController(this.cameraController);
        
        // Ativar animação
        this.renderSystem.setActiveScene(this.spaceScene);
        this.renderSystem.animate();

        console.log('✅ Preview inicializado com sucesso');
    }

    updateCharacter(character) {
        if (!character) return;
        console.log('🔄 Atualizando preview do personagem:', character.name);

        // Remover modelo anterior se existir
        if (this.characterModel) {
            this.scene.remove(this.characterModel);
            this.characterModel.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }

        try {
            // Criar novo modelo 3D
            this.characterModel = character.create3DModel();
            
            if (this.characterModel) {
                // Ajustar posição do modelo
                this.characterModel.position.set(0, -0.5, 0);
                this.scene.add(this.characterModel);
                
                // Atualizar materiais
                character.update3DModel(this.characterModel);
                
                console.log('✅ Modelo do personagem atualizado:', character.name);
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar modelo do personagem:', error);
        }
    }

    dispose() {
        this.renderSystem.stopAnimation();
        this.renderSystem.dispose();
    }
}
