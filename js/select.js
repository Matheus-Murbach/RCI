import { Database } from './database/database.js';
import { authGuard } from './auth/authGuard.js';
import { gameState } from './gameState.js';
import { SpaceScene } from './spaceScene.js';
import { CameraController } from './cameraController.js';
import { Character } from './character.js'; // Adicionar esta importação

class CharacterSelector {
    constructor() {
        this.db = new Database();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.selectedCharacter = null;
        this.characters = [];
    }

    async initialize() {
        try {
            console.log('🚀 Iniciando CharacterSelector...');
            
            // Adicionar chamada do setupEventListeners
            this.setupEventListeners();
            console.log('✅ Event listeners configurados');
            
            // 1. Verificar banco de dados
            await this.checkDatabase();
            
            // 2. Verificar autenticação
            if (!this.checkAuth()) {
                return;
            }

            console.log('✅ Autenticação verificada');
            
            // 3. Carregar e mostrar personagens
            await this.loadAndDisplayCharacters();
            
            // 4. Inicializar cena 3D se houver personagens
            if (this.characters.length > 0) {
                console.log('🎮 Iniciando cena 3D...');
                await this.initializeScene();
                console.log('✅ Cena 3D inicializada');
            }
            
            console.log('✅ Inicialização completa');

        } catch (error) {
            console.error('❌ Erro fatal:', error);
            setTimeout(() => window.location.reload(), 3000);
        }
    }

    async checkDatabase() {
        try {
            console.log('🔍 Verificando conexão com banco de dados...');
            await this.db.ensureApiUrl();
            console.log('✅ Banco de dados verificado');
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar banco de dados:', error);
            throw error;
        }
    }

    checkAuth() {
        const authStatus = {
            isActive: authGuard.isUserActive(),
            userId: authGuard.getActiveUserId(),
            token: !!localStorage.getItem('userToken')
        };

        console.log('🔐 Status da autenticação:', authStatus);

        if (!authStatus.isActive || !authStatus.token) {
            console.warn('⚠️ Usuário não autenticado');
            setTimeout(() => window.location.replace('/pages/login.html'), 2000);
            return false;
        }

        return true;
    }

    async loadAndDisplayCharacters() {
        const userId = authGuard.getActiveUserId();
        if (!userId) {
            console.error('❌ ID do usuário não encontrado');
            setTimeout(() => window.location.replace('/pages/login.html'), 2000);
            return;
        }

        console.log('🔍 Carregando personagens para usuário:', userId);
        try {
            // Força uma nova busca no banco de dados
            const freshCharacters = await this.db.getCharactersByUserId(userId);
            console.log('📥 Personagens recebidos:', freshCharacters);

            if (!Array.isArray(freshCharacters)) {
                console.error('❌ Resposta inválida do banco de dados');
                this.characters = [];
            } else {
                // Atualiza a lista local com os dados mais recentes
                this.characters = [...freshCharacters];
            }

            if (this.characters.length === 0) {
                console.log('⚠️ Nenhum personagem encontrado');
                setTimeout(() => {
                    console.log('🔄 Redirecionando para criação de personagem...');
                    window.location.replace('create.html');
                }, 3000);
                return;
            }

            console.log('✅ Exibindo personagens encontrados');
            this.displayCharacters();

        } catch (error) {
            console.error('❌ Erro ao carregar personagens:', error);
            this.handleError(error);
        }
    }

    async initializeScene() {
        console.log('🎨 Configurando cena 3D...');
        
        const canvas = document.getElementById('characterPreview');
        const previewSection = document.querySelector('.preview-section');
        
        if (!canvas || !previewSection) {
            console.error('❌ Elementos da cena não encontrados:', {
                canvas: !!canvas,
                previewSection: !!previewSection
            });
            return;
        }

        // Configurar cena
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        // Configurar câmera
        const camera = new THREE.PerspectiveCamera(
            75,
            previewSection.offsetWidth / previewSection.offsetHeight,
            0.1,
            5000
        );

        // Configurar renderer
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            logarithmicDepthBuffer: true
        });

        // Configurar controlador de câmera
        const cameraController = new CameraController(camera, renderer, scene);
        
        // Criar cena espacial
        this.scene = new SpaceScene(scene, camera);

        // Configurar redimensionamento
        const handleResize = () => {
            const width = previewSection.offsetWidth;
            const height = previewSection.offsetHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height, false);
        };
        
        window.addEventListener('resize', handleResize);
        handleResize();

        // Configurar loop de animação
        const animate = () => {
            requestAnimationFrame(animate);
            if (this.scene) {
                this.scene.update();
            }
            cameraController.update();
            renderer.render(scene, camera);
        };
        animate();

        console.log('✅ Cena 3D configurada com sucesso');
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
        console.log('🎮 Selecionando personagem:', character);
        this.selectedCharacter = character;
        
        // Atualizar UI
        document.querySelectorAll('.character-option').forEach(el => 
            el.classList.toggle('selected', el.querySelector('h3').textContent === character.name)
        );

        // Atualizar preview 3D com todos os dados do personagem
        if (this.scene) {
            try {
                console.log('Dados do personagem para atualização:', character);

                // Atualizar modelo com os dados exatos do banco
                this.scene.updateCharacterModel({
                    name: character.name,
                    mainColor: character.main_color,  // Usar main_color do banco
                    skinColor: character.skin_color,  // Usar skin_color do banco
                    accentColor: character.accent_color, // Usar accent_color do banco
                    topRadius: parseFloat(character.top_radius),  // Usar top_radius do banco
                    bottomRadius: parseFloat(character.bottom_radius)  // Usar bottom_radius do banco
                });
                
            } catch (error) {
                console.error('❌ Erro ao atualizar preview 3D:', error);
            }
        } else {
            console.warn('⚠️ Cena 3D não inicializada');
        }

        // Habilitar botão de jogar
        document.getElementById('playButton').disabled = false;
    }

    setupEventListeners() {
        // Botão de novo personagem
        const newCharButton = document.getElementById('newCharacterButton');
        console.log('🔍 Botão novo personagem encontrado:', !!newCharButton);
        
        newCharButton.addEventListener('click', () => {
            console.log('🖱️ Botão novo personagem clicado');
            if (authGuard.isUserActive()) {
                console.log('🔐 Usuário autenticado, redirecionando...');
                // Usar caminho absoluto para garantir
                window.location.href = '../pages/create.html';
            } else {
                console.log('⚠️ Usuário não autenticado');
            }
        });

        // Botão de jogar
        document.getElementById('playButton').addEventListener('click', () => {
            if (this.selectedCharacter && authGuard.isUserActive()) {
                window.location.href = 'game.html';
            }
        });

        // Botão de logout
        document.getElementById('logoutButton').addEventListener('click', () => {
            authGuard.logout();
        });
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

            // Recarregar lista de personagens do servidor
            await this.loadAndDisplayCharacters();
            
            // Resetar seleção se necessário
            if (this.selectedCharacter?.id === character.id) {
                this.selectedCharacter = null;
                document.getElementById('playButton').disabled = true;
            }

            console.log('✅ Personagem deletado com sucesso');

        } catch (error) {
            console.error('❌ Erro ao deletar personagem:', error);
        }
    }

    showDeleteConfirmation(character) {
        console.log('🗑️ Solicitação de deleção para:', character.name);
        
        const confirmed = confirm(`Tem certeza que deseja deletar o personagem "${character.name}"?\nEsta ação não pode ser desfeita!`);
        
        if (confirmed) {
            this.deleteCharacter(character);
        }
    }

    handleError(error) {
        console.error('Erro:', error);
        setTimeout(() => {
            authGuard.logout();
        }, 3000);
    }
}

// Inicialização com mais logs e alerts
document.addEventListener('DOMContentLoaded', () => {
    const initialState = {
        localStorage: {
            activeUserId: localStorage.getItem('activeUserId'),
            userToken: !!localStorage.getItem('userToken'),
            currentUser: localStorage.getItem('currentUser')
        },
        url: window.location.href
    };
    
    console.log('📋 Estado inicial:', initialState);
    
    const selector = new CharacterSelector();
    selector.initialize().catch(error => {
        console.error('❌ Erro fatal:', error);
        setTimeout(() => selector.handleError(error), 2000);
    });
});
