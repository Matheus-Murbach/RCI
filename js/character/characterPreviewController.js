import { RenderSystem } from '../core/renderSystem.js';
import { SpaceScene } from '../map/spaceScene.js';
import { CameraController } from '../cameraControllerLobby.js';

export class CharacterPreviewController {
    constructor(canvas, container) {
        console.log('🎨 Inicializando preview do personagem...');
        this.initialize(canvas, container);
    }

    initialize(canvas, container) {
        try {
            const renderSystem = RenderSystem.getInstance();
            const { scene, camera, renderer } = renderSystem.initialize(canvas, container);
            
            this.renderSystem = renderSystem; // Importante: guardar referência
            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            
            // Inicializar cena espacial
            this.spaceScene = new SpaceScene(this.scene, this.camera);
            
            // Setup inicial da câmera
            this.camera.position.set(0, 1, 4);
            this.camera.lookAt(0, 0, 0);
            
            // Inicializar controles de câmera
            this.controls = new CameraController(this.camera, this.renderer, this.scene);
            
            // Forçar modo cinematográfico inicial
            this.controls.enableCinematicMode();
            
            // Definir SpaceScene como cena ativa
            this.renderSystem.setActiveScene(this.spaceScene);
            this.spaceScene.setCameraController(this.controls);
            
            // Configurar botão de órbita
            this.setupOrbitButton();
            
            // Iniciar a animação
            this.renderSystem.animate();
            
            console.log('✅ Preview inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar preview:', error);
            throw error;
        }
    }

    setupOrbitButton() {
        const orbitButton = document.getElementById('toggleOrbit');
        if (orbitButton) {
            console.log('🎯 Configurando botão de órbita');
            
            // Limpar eventos antigos
            const newButton = orbitButton.cloneNode(true);
            orbitButton.parentNode.replaceChild(newButton, orbitButton);
            
            // Adicionar novo evento
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.controls) {
                    this.controls.toggleCinematicMode();
                }
            });

            // Garantir estado inicial do botão
            newButton.classList.toggle('active', this.controls.cinematicMode);
        }
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
