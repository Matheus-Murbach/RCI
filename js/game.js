import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PlainScene } from './map/plainScene.js';
import { CameraController } from './cameraControllerLobby.js';
import { Character } from './character.js';

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.plainScene = null;
        this.cameraController = null;
        this.character = null;
    }

    async initialize() {
        try {
            console.log('🎮 Iniciando jogo...');
            
            // Verificar e carregar dados do personagem
            const savedCharacter = localStorage.getItem('selectedCharacter');
            if (!savedCharacter) {
                throw new Error('Nenhum personagem selecionado');
            }
            
            const characterData = JSON.parse(savedCharacter);
            console.log('📝 Dados do personagem:', characterData);
            
            // Criar instância do personagem com os dados carregados
            this.character = new Character(characterData);
            console.log('✅ Personagem criado:', this.character);
            
            // Inicializar Three.js
            this.initThree();
            
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
            throw error; // Propagar erro para tratamento global
        }
    }

    initThree() {
        try {
            // Criar cena
            this.scene = new THREE.Scene();
            console.log('Scene created:', this.scene);
            
            // Configurar câmera
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                2000
            );
            this.camera.position.set(0, 5, 10);
            
            // Configurar renderer
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) throw new Error('Canvas não encontrado');
            
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            
            // Adicionar evento de redimensionamento
            window.addEventListener('resize', () => this.handleResize());
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
        this.cameraController.update();
        
        // Atualizar cena
        this.plainScene.update();
        
        // Renderizar
        this.renderer.render(this.scene, this.camera);
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
