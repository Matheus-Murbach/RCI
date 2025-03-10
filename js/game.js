import { StateManager } from './core/stateManager.js';
import { RenderSystem } from './core/renderSystem.js';
import { PlainScene } from './map/plainScene.js';
import { Character } from './character/character.js';
import { CharacterController } from './character/characterController.js';
import { THREE } from './core/three.js';

class Game {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.renderSystem = RenderSystem.getInstance();
        this.character = null;
        this.characterController = null;
        this.mainScene = null;
    }

    async initialize() {
        try {
            console.group('🎮 Inicialização do Jogo');

            // 0. Garantir que THREE está carregado
            await this.ensureThreeJsLoaded();

            // 1. Setup básico
            console.log('1. Configurando componentes básicos...');
            const { character, canvas } = this.setupBasicComponents();
            console.log('✅ Componentes básicos ok', { character: character?.id, canvas: !!canvas });

            // 2. Inicializar sistema de renderização
            console.log('2. Inicializando sistema de renderização...');
            const renderData = await this.initializeRenderSystem(canvas);
            console.log('✅ Renderer inicializado', { 
                scene: !!renderData?.scene,
                camera: !!renderData?.camera,
                renderer: !!renderData?.renderer
            });
            
            // 3. Criar e configurar cena
            console.log('3. Configurando cena do jogo...');
            await this.setupGameScene(renderData, character);

            console.log('✅ Jogo inicializado com sucesso');
            console.groupEnd();
            return true;

        } catch (error) {
            console.error('❌ Erro crítico:', error.message);
            console.error('Stack:', error.stack);
            console.groupEnd();
            alert('Erro ao inicializar jogo: ' + error.message);
            window.location.href = '/pages/select.html';
            return false;
        }
    }

    async ensureThreeJsLoaded() {
        // Aguardar um momento para garantir que THREE seja carregado
        if (!window.THREE) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!window.THREE) {
                throw new Error('THREE.js não está carregado corretamente');
            }
        }
        console.log('✅ THREE.js carregado', { version: window.THREE.REVISION });
    }

    setupBasicComponents() {
        const currentCharacter = this.stateManager.getCurrentCharacter();
        const canvas = document.getElementById('gameCanvas');

        if (!currentCharacter?.id || !canvas) {
            throw new Error('Componentes básicos não encontrados');
        }

        return { 
            character: new Character(currentCharacter, false),
            canvas: canvas
        };
    }

    async initializeRenderSystem(canvas) {
        const container = canvas.parentElement;
        const renderData = this.renderSystem.initialize(canvas, container);
        
        if (!renderData?.scene || !renderData?.camera) {
            throw new Error('Falha na inicialização do renderer');
        }

        return renderData;
    }

    async setupGameScene(renderData, character) {
        if (!renderData?.scene || !renderData?.camera) {
            throw new Error('Dados de renderização inválidos');
        }

        if (!character?.id) {
            throw new Error('Personagem inválido');
        }

        try {
            console.group('🎬 Configuração da Cena');
            
            // Criar e inicializar cena
            console.log('1. Criando cena principal...');
            this.mainScene = new PlainScene(renderData.scene, renderData.camera);
            
            console.log('2. Inicializando cena...');
            const sceneInitialized = await this.mainScene.init();

            if (!sceneInitialized) {
                throw new Error('Falha ao inicializar cena');
            }

            // Adicionar personagem
            console.log('3. Adicionando personagem à cena...');
            const characterAdded = await this.mainScene.updateCharacterModel(character);

            if (!characterAdded) {
                console.warn('⚠️ Personagem não foi adicionado corretamente');
            }

            // Adicionar controlador do personagem
            if (this.mainScene.characterModel) {
                this.characterController = new CharacterController(
                    this.mainScene.characterModel,
                    renderData.camera
                );
            }

            // Modificar loop de animação
            this.renderSystem.setAnimationCallback(() => {
                if (this.characterController) {
                    this.characterController.update();
                }
                this.mainScene.update();
            });

            // Iniciar renderização
            console.log('4. Configurando renderização...');
            this.renderSystem.setActiveScene(this.mainScene);
            this.renderSystem.animate();

            console.log('✅ Cena configurada com sucesso');
            console.groupEnd();

        } catch (error) {
            console.error('❌ Erro ao configurar cena:', error.message);
            console.error('Stack:', error.stack);
            console.groupEnd();
            throw error;
        }
    }
}

// Mudar para usar DOMContentLoaded ao invés de load
document.addEventListener('DOMContentLoaded', async () => {
    // Aguardar um momento para garantir que os módulos sejam carregados
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('🚀 Iniciando jogo...');
    try {
        const game = new Game();
        await game.initialize();
    } catch (error) {
        console.error('Erro fatal na inicialização:', error);
    }
});
