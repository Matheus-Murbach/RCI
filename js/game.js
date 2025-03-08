import { THREE, OrbitControls } from './core/three.js';
import { PlainScene } from './map/plainScene.js';
import { CameraController } from './cameraControllerLobby.js';
import { Character } from './character/character.js';
import { StateManager } from './core/stateManager.js';

class Game {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.plainScene = null;
        this.cameraController = null;
        this.character = null;
    }

    async initialize() {
        try {
            // Adicionar listener para o botão de retorno
            const backButton = document.getElementById('backButton');
            if (backButton) {
                backButton.addEventListener('click', () => {
                    window.location.href = 'select.html';
                });
            }
            
            console.log('🎮 Iniciando jogo...');
            
            // Verificar personagem selecionado
            const currentCharacter = this.stateManager.getCurrentCharacter();
            console.log('🎮 Personagem atual:', currentCharacter);

            if (!currentCharacter || !currentCharacter.id) {
                console.error('❌ Nenhum personagem válido selecionado');
                // Redirecionar para seleção em vez de lançar erro
                window.location.href = 'select.html';
                return;
            }
            
            this.character = new Character(currentCharacter);
            console.log('✅ Personagem carregado:', this.character.name);
            
            // Inicializar Three.js primeiro
            await this.initThree();
            
            // Inicializar cena
            console.log('🌍 Inicializando cena...');
            this.plainScene = new PlainScene(this.scene, this.camera);
            
            // Configurar controles de câmera
            console.log('🎥 Configurando câmera...');
            this.cameraController = new CameraController(this.camera, this.renderer, this.scene);
            
            // Adicionar personagem à cena
            console.log('🧍 Adicionando personagem à cena...');
            const characterModel = this.character.create3DModel();
            if (!characterModel) {
                throw new Error('Falha ao criar modelo 3D do personagem');
            }
            
            this.plainScene.updateCharacterModel(this.character);
            
            // Iniciar loop de renderização
            this.animate();
            console.log('✨ Jogo inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro fatal:', error);
            setTimeout(() => {
                window.location.href = 'select.html';
            }, 2000);
        }
    }

    async initThree() {
        try {
            // Criar cena
            this.scene = new THREE.Scene();
            
            // Configurar câmera com os mesmos parâmetros do select.js
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                5000
            );
            this.camera.position.set(0, 2, 5);
            
            // Configurar renderer com as mesmas configurações do select.js
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) throw new Error('Canvas não encontrado');
            
            this.renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                logarithmicDepthBuffer: true,
                shadowMap: {
                    enabled: true,
                    type: THREE.PCFSoftShadowMap
                }
            });
            
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            window.addEventListener('resize', () => this.handleResize());
            
            return true;
        } catch (error) {
            console.error('Erro na inicialização do Three.js:', error);
            throw error;
        }
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Atualizar controles
        if (this.cameraController) {
            this.cameraController.update();
        }
        
        // Atualizar cena
        if (this.plainScene) {
            this.plainScene.update();
        }
        
        // Renderizar
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Inicializador com tratamento de erro melhorado
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, iniciando jogo...');
    const game = new Game();
    game.initialize().catch(error => {
        console.error('💥 Erro fatal:', error);
        setTimeout(() => {
            window.location.replace('select.html');
        }, 3000);
    });
});
