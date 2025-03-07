import { THREE } from './core/three.js';
import { Character, CHARACTER_CONFIG } from './character/character.js';
import { authGuard } from './auth/authGuard.js';
import { Database } from './database/database.js';
import { SpaceScene } from './map/spaceScene.js';
import { RenderSystem } from './core/renderSystem.js';
import { CameraController } from './cameraControllerLobby.js';

class CharacterCreator {
    constructor() {
        this.db = new Database();
        this.character3D = null;
        // Criar personagem em modo de criação (usando valores padrão)
        this.currentCharacter = new Character(CHARACTER_CONFIG.defaults, true);
        this.renderSystem = RenderSystem.getInstance();
        this.isDragging = false;
        
        // Usar valores do CHARACTER_CONFIG.defaults
        this.mainColor = CHARACTER_CONFIG.defaults.mainColor;
        this.skinColor = CHARACTER_CONFIG.defaults.skinColor;
        this.accentColor = CHARACTER_CONFIG.defaults.accentColor;
        this.topRadius = CHARACTER_CONFIG.defaults.topRadius;
        this.bottomRadius = CHARACTER_CONFIG.defaults.bottomRadius;
        this.faceExpression = CHARACTER_CONFIG.defaults.faceExpression;

        this.resetCharacterForm();
    }

    async initialize() {
        try {
            console.log('Iniciando tela de criação...');

            // 1. Verificar autenticação
            if (!authGuard.isUserActive()) {
                console.log('Usuário não autenticado, redirecionando para login');
                localStorage.setItem('redirectAfterLogin', '/pages/create.html');
                window.location.replace('/pages/login.html');
                return;
            }

            const userId = authGuard.getActiveUserId();
            console.log('Usuário autenticado:', userId);

            // 2. Inicializar preview 3D
            this.initScene();

            // 3. Inicializar personagem
            this.initCharacter();
            this.resetCharacterForm();

            // 4. Configurar eventos
            this.setupEventListeners();

            console.log('Inicialização concluída com sucesso');

        } catch (error) {
            console.error('Erro detalhado na inicialização:', {
                message: error.message,
                stack: error.stack
            });
            this.handleError(error);
        }
    }

    initScene() {
        console.log('Inicializando cena...');
        const canvas = document.getElementById('characterPreview');
        const previewSection = document.querySelector('.preview-section');
        
        if (!canvas || !previewSection) {
            throw new Error('Canvas ou container não encontrados');
        }

        const { scene, camera, renderer } = this.renderSystem.initialize(canvas, previewSection);
        
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Criando a luz SpotLight com configurações melhoradas
        const spotlight = new THREE.SpotLight(0xffffff, 5);
        spotlight.position.set(5, 5, 5);
        spotlight.angle = Math.PI / 10;
        spotlight.distance = 3;

        // Adicionar target para o spotlight apontar para o personagem
        const targetObject = new THREE.Object3D();
        targetObject.position.set(0, 0, 0);
        this.scene.add(targetObject);
        spotlight.target = targetObject;
        
        // Ativar sombras no renderer
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.scene.add(spotlight);

        // Adicionar luz ambiente suave para complementar
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Resto da inicialização da cena
        this.spaceScene = new SpaceScene(scene, camera);
        
        // Configurar controles de câmera
        this.cameraController = new CameraController(camera, renderer, scene);
        this.spaceScene.setCameraController(this.cameraController);
        this.renderSystem.setActiveScene(this.spaceScene);
        
        // Forçar modo cinematográfico inicial
        this.cameraController.enableCinematicMode();

        // Configurar botão de órbita
        const orbitButton = document.getElementById('toggleOrbit');
        if (orbitButton) {
            console.log('🎯 Configurando botão de órbita');
            
            // Limpar eventos antigos
            const newButton = orbitButton.cloneNode(true);
            orbitButton.parentNode.replaceChild(newButton, orbitButton);
            
            // Adicionar novo evento
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.cameraController) {
                    this.cameraController.toggleCinematicMode();
                }
            });

            // Garantir estado inicial do botão
            newButton.classList.toggle('active', this.cameraController.cinematicMode);
        }

        // Iniciar animação
        this.renderSystem.animate();
        
        console.log('Cena inicializada com sucesso');
    }

    async initCharacter() {
        console.log('Inicializando personagem...');
        
        try {
            this.character3D = await this.currentCharacter.create3DModel();

            if (this.character3D && this.scene) {
                // Ajustar posição inicial do personagem
                this.character3D.position.set(0, -0.5, 0);
                this.scene.add(this.character3D);

                // Forçar atualização inicial do modelo
                this.currentCharacter.update3DModel(this.character3D);
                console.log('Personagem inicializado com valores:', {
                    mainColor: this.currentCharacter.mainColor,
                    skinColor: this.currentCharacter.skinColor,
                    accentColor: this.currentCharacter.accentColor,
                    topRadius: this.currentCharacter.topRadius,
                    bottomRadius: this.currentCharacter.bottomRadius
                });
            }
        } catch (error) {
            console.error('Erro ao criar personagem:', error);
            throw new Error('Falha ao criar modelo 3D do personagem');
        }
    }

    setupResizeHandler(previewSection) {
        const handleResize = () => {
            const width = previewSection.offsetWidth;
            const height = previewSection.offsetHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height, false);
        };

        window.addEventListener('resize', handleResize);
        handleResize();
    }

    animate() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.spaceScene.update();
            this.cameraController.update();
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    setupEventListeners() {
        // Menu mobile toggle
        const menuToggle = document.getElementById('menuToggle');
        const controlsSection = document.querySelector('.controls-section');
        
        if (menuToggle && controlsSection) {
            menuToggle.addEventListener('click', () => {
                controlsSection.classList.toggle('active');
                menuToggle.classList.toggle('active');
            });

            // Fechar menu ao clicar fora
            document.addEventListener('click', (e) => {
                if (!controlsSection.contains(e.target) && 
                    !menuToggle.contains(e.target) && 
                    controlsSection.classList.contains('active')) {
                    controlsSection.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
            });
        }

        // Adicionar suporte para touch no controle de raio
        const slider = document.getElementById('radiusSlider2D');
        if (slider) {
            slider.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isDragging = true;
                const touch = e.touches[0];
                this.updateRadiusFromPosition(touch.clientX, touch.clientY);
            }, { passive: false });

            document.addEventListener('touchmove', (e) => {
                if (this.isDragging) {
                    e.preventDefault();
                    const touch = e.touches[0];
                    this.updateRadiusFromPosition(touch.clientX, touch.clientY);
                }
            }, { passive: false });

            document.addEventListener('touchend', () => {
                this.isDragging = false;
            });
        }

        // Botão Salvar
        document.getElementById('saveCharacter').addEventListener('click', async () => {
            if (!this.validateForm()) return;
            await this.saveCharacter();
        });

        // Botão Voltar
        document.getElementById('backButton').addEventListener('click', () => {
            window.location.href = 'select.html';
        });

        // Botão Logout
        document.getElementById('logoutButton').addEventListener('click', () => {
            authGuard.logout();
            window.location.href = 'login.html';
        });

        // Botão Toggle Orbit
        document.getElementById('toggleOrbit').addEventListener('click', () => {
            if (this.cameraController) {
                this.cameraController.toggleCinematicMode();
            }
        });

        // Inputs de cor
        ['mainColor', 'skinColor', 'accentColor'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.updateColor(id, e.target.value);
            });
        });

        // Verificar cliques fora do controle de raio
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.radius-control')) {
                this.isDragging = false;
            }
        });

        // Atualizar manipulador do botão de órbita
        const orbitButton = document.getElementById('toggleOrbit');
        if (orbitButton) {
            // Garantir que o botão comece com o estado correto
            orbitButton.classList.add('active');
            
            orbitButton.addEventListener('click', () => {
                if (this.cameraController) {
                    this.cameraController.toggleCinematicMode();
                    // O estado do botão agora é gerenciado dentro do CameraController
                }
            });
        }

        // Handler unificado para expressão facial
        document.getElementById('faceExpression').addEventListener('input', (e) => {
            console.log('🎭 [CREATE] Input facial detectado:', e.target.value);
            if (this.currentCharacter) {
                this.currentCharacter.faceExpression = e.target.value;
                console.log('🎭 [CREATE] Expressão atualizada no character:', this.currentCharacter.faceExpression);
                this.currentCharacter.update3DModel(this.character3D);
            }
        });

        // Adicionar setup do controle de raio
        this.setupRadiusControl();
    }

    validateForm() {
        const name = document.getElementById('charName').value.trim();
        const face = document.getElementById('faceExpression').value.trim();
        const mainColor = document.getElementById('mainColor').value;
        const skinColor = document.getElementById('skinColor').value;
        const accentColor = document.getElementById('accentColor').value;

        if (!name) {
            alert('Por favor, digite um nome para o personagem');
            return false;
        }

        if (!face) {
            alert('Por favor, defina os caracteres do rosto');
            return false;
        }

        // Validar formato das cores
        const colorRegex = /^#[0-9A-F]{6}$/i;
        if (!colorRegex.test(mainColor) || !colorRegex.test(skinColor) || !colorRegex.test(accentColor)) {
            alert('Por favor, selecione cores válidas para o personagem');
            return false;
        }

        // Validar raios
        if (this.topRadius < 0.25 || this.topRadius > 1.0 || 
            this.bottomRadius < 0.25 || this.bottomRadius > 1.0) {
            alert('Os valores dos raios devem estar entre 0.25 e 1.0');
            return false;
        }

        if (!authGuard.isUserActive()) {
            console.error('Sessão expirada');
            alert('Sua sessão expirou. Por favor, faça login novamente.');
            authGuard.logout();
            return false;
        }

        return true;
    }

    async saveCharacter() {
        try {
            console.log('🎭 [CREATE] Iniciando salvamento, expressão atual:', 
                document.getElementById('faceExpression').value);
            const userId = authGuard.getActiveUserId();
            if (!userId) throw new Error('ID do usuário não encontrado');

            const characterData = {
                userId: userId,
                name: document.getElementById('charName').value.trim(),
                faceExpression: document.getElementById('faceExpression').value.trim(),
                mainColor: document.getElementById('mainColor').value || CHARACTER_CONFIG.defaults.mainColor,
                skinColor: document.getElementById('skinColor').value || CHARACTER_CONFIG.defaults.skinColor,
                accentColor: document.getElementById('accentColor').value || CHARACTER_CONFIG.defaults.accentColor,
                topRadius: this.topRadius || CHARACTER_CONFIG.defaults.topRadius,
                bottomRadius: this.bottomRadius || CHARACTER_CONFIG.defaults.bottomRadius,
                equipment: CHARACTER_CONFIG.defaults.equipment || {}
            };

            // Validar dados antes de enviar
            Object.entries(characterData).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    throw new Error(`Campo ${key} não pode ser vazio`);
                }
            });

            console.log('📤 Dados validados para envio:', characterData);
            console.log('🎭 [CREATE] Dados preparados para envio:', characterData);
            
            const result = await this.db.saveCharacter(characterData);

            if (result.success) {
                alert('Personagem salvo com sucesso!');
                window.location.href = 'select.html';
            } else {
                throw new Error(result.message || 'Erro ao salvar personagem');
            }

        } catch (error) {
            console.error('❌ [CREATE] Erro ao salvar:', error);
            alert(`Erro ao salvar: ${error.message}`);
        }
    }

    handleError(error) {
        console.error('Erro:', error);
        alert('Ocorreu um erro. Voltando para o menu...');
        window.location.replace('/pages/select.html');
    }

    updateColor(colorType, value) {
        this.currentCharacter.updateColors(
            colorType === 'mainColor' ? value : null,
            colorType === 'skinColor' ? value : null,
            colorType === 'accentColor' ? value : null
        );
    }

    setupRadiusControl() {
        const slider = document.getElementById('radiusSlider2D');
        const handle = document.getElementById('radiusHandle');
        
        if (!slider || !handle) {
            console.error('Elementos do controle de raio não encontrados');
            return;
        }

        const updateRadius = (clientX, clientY) => {
            const rect = slider.getBoundingClientRect();
            
            // Calcular posições normalizadas (0 a 1)
            let x = (clientX - rect.left) / rect.width;
            let y = (clientY - rect.top) / rect.height;
            
            // Limitar valores entre 0 e 1
            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));
            
            // Atualizar posição do handle
            handle.style.left = `${x * 100}%`;
            handle.style.top = `${y * 100}%`;
            
            // Calcular e atualizar raios
            this.topRadius = 0.25 + (x * 0.75); // 0.25 a 1.0
            this.bottomRadius = 0.25 + ((1 - y) * 0.75); // 0.25 a 1.0
            
            if (this.currentCharacter) {
                this.currentCharacter.topRadius = this.topRadius;
                this.currentCharacter.bottomRadius = this.bottomRadius;
            }
            
            // Atualizar valores exibidos
            document.getElementById('topRadiusValue').textContent = this.topRadius.toFixed(2);
            document.getElementById('bottomRadiusValue').textContent = this.bottomRadius.toFixed(2);
            
            // Atualizar geometria
            this.updateCharacterShape();
        };

        // Mouse events
        slider.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            updateRadius(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                updateRadius(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Touch events
        slider.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            updateRadius(e.touches[0].clientX, e.touches[0].clientY);
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                updateRadius(e.touches[0].clientX, e.touches[0].clientY);
            }
        });

        document.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    updateCharacterShape() {
        if (!this.currentCharacter) return;
        this.currentCharacter.updateShape(this.topRadius, this.bottomRadius);
    }

    resetCharacterForm() {
        // Usar valores do CHARACTER_CONFIG.defaults para reset
        document.getElementById('faceExpression').value = CHARACTER_CONFIG.defaults.faceExpression;
        document.getElementById('mainColor').value = CHARACTER_CONFIG.defaults.mainColor;
        document.getElementById('skinColor').value = CHARACTER_CONFIG.defaults.skinColor;
        document.getElementById('accentColor').value = CHARACTER_CONFIG.defaults.accentColor;

        this.mainColor = CHARACTER_CONFIG.defaults.mainColor;
        this.skinColor = CHARACTER_CONFIG.defaults.skinColor;
        this.accentColor = CHARACTER_CONFIG.defaults.accentColor;
        this.topRadius = CHARACTER_CONFIG.defaults.topRadius;
        this.bottomRadius = CHARACTER_CONFIG.defaults.bottomRadius;

        // Atualizar posição do handle para o centro
        const handle = document.getElementById('radiusHandle');
        if (handle) {
            handle.style.left = '50%';
            handle.style.top = '50%';
        }

        // Atualizar valores exibidos com verificação de null
        const topRadiusValue = document.getElementById('topRadiusValue');
        const bottomRadiusValue = document.getElementById('bottomRadiusValue');
        
        if (topRadiusValue) {
            topRadiusValue.textContent = this.topRadius.toFixed(2);
        }
        if (bottomRadiusValue) {
            bottomRadiusValue.textContent = this.bottomRadius.toFixed(2);
        }

        // Atualizar geometria do personagem
        this.updateCharacterShape();
    }

    updateMaterials() {
        if (this.character3D) {
            // Atualizar material do corpo
            const bodyMaterial = this.character3D.children[0].material;
            bodyMaterial.roughness = 0.8;
            bodyMaterial.metalness = 0.2;
            bodyMaterial.envMapIntensity = 1;
            
            // Atualizar material da cabeça
            const headMaterial = this.character3D.children[1].material;
            headMaterial.roughness = 0.7;
            headMaterial.metalness = 0.1;
            headMaterial.envMapIntensity = 1;
        }
    }

    resetCharacterCreation() {
        // Atualizar método para usar this.currentCharacter
        document.getElementById('mainColor').value = this.currentCharacter.mainColor;
        document.getElementById('skinColor').value = this.currentCharacter.skinColor;
        document.getElementById('accentColor').value = this.currentCharacter.accentColor;
        document.getElementById('charName').value = '';
        
        this.currentCharacter.topRadius = CHARACTER_CONFIG.topRadius;
        this.currentCharacter.bottomRadius = CHARACTER_CONFIG.bottomRadius;
        
        const handle = document.getElementById('radiusHandle');
        const normalizedPosition = ((0.75 - 0.5) / (1.0 - 0.5)) * 100;
        handle.style.left = `${normalizedPosition}%`;
        handle.style.top = `${normalizedPosition}%`;
        
        document.getElementById('topRadiusValue').textContent = this.currentCharacter.topRadius.toFixed(2);
        document.getElementById('bottomRadiusValue').textContent = this.currentCharacter.bottomRadius.toFixed(2);
        
        if (this.character3D) {
            this.currentCharacter.update3DModel(this.character3D);
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação...');
    const creator = new CharacterCreator();
    creator.initialize().catch(error => {
        console.error('Erro fatal:', error);
        alert('Erro ao inicializar aplicação. Voltando para o menu...');
        window.location.replace('/pages/select.html');
    });
});
