import { THREE } from './core/three.js';
import { Character, DEFAULT_CHARACTER } from './character/character.js';
import { authGuard } from './auth/authGuard.js';
import { Database } from './database/database.js';
import { SpaceScene } from './map/spaceScene.js';
import { RenderSystem } from './core/renderSystem.js';
import { CameraController } from './cameraControllerLobby.js';

class CharacterCreator {
    constructor() {
        this.db = new Database();
        this.character3D = null;
        this.currentCharacter = new Character({
            main_color: DEFAULT_CHARACTER.mainColor,
            skin_color: DEFAULT_CHARACTER.skinColor,
            accent_color: DEFAULT_CHARACTER.accentColor,
            top_radius: DEFAULT_CHARACTER.topRadius,
            bottom_radius: DEFAULT_CHARACTER.bottomRadius,
            face_expression: DEFAULT_CHARACTER.faceExpression,
            equipment_data: DEFAULT_CHARACTER.equipment
        });
        this.renderSystem = RenderSystem.getInstance();
        this.isDragging = false;
        
        // Usar valores do DEFAULT_CHARACTER
        this.mainColor = DEFAULT_CHARACTER.mainColor;
        this.skinColor = DEFAULT_CHARACTER.skinColor;
        this.accentColor = DEFAULT_CHARACTER.accentColor;
        this.topRadius = DEFAULT_CHARACTER.topRadius;
        this.bottomRadius = DEFAULT_CHARACTER.bottomRadius;
        this.faceExpression = DEFAULT_CHARACTER.faceExpression;

        this.resetCharacterForm();
    }

    async initialize() {
        try {
            console.log('Iniciando tela de criação...');

            // 1. Verificar autenticação
            if (!authGuard.isUserActive()) {
                console.log('Usuário não autenticado, redirecionando para login');
                localStorage.setItem('redirect_after_login', '/pages/create.html');
                window.location.replace('/pages/login.html');
                return;
            }

            const userId = authGuard.getActiveUserId();
            console.log('Usuário autenticado:', userId);

            // 2. Inicializar preview 3D
            this.initScene();

            // 3. Inicializar personagem
            this.initCharacter();

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
        
        // Garantir que o modo cinematográfico esteja ativado inicialmente
        this.cameraController.cinematicMode = true;
        
        // Configurar evento do botão de órbita com estado correto
        const orbitButton = document.getElementById('toggleOrbit');
        if (orbitButton) {
            orbitButton.classList.add('active');
            orbitButton.addEventListener('click', () => {
                this.cameraController.toggleCinematicMode();
                orbitButton.classList.toggle('active');
            });
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

        // Adicionar handlers para botões de olhos
        const eyeButtons = document.querySelectorAll('.eye-option');
        eyeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Remover classe active de todos os botões
                eyeButtons.forEach(btn => btn.classList.remove('active'));
                // Adicionar classe active ao botão clicado
                button.classList.add('active');
                
                // Atualizar olhos do personagem
                const eyeType = button.dataset.eyeType;
                this.currentCharacter.updateEyes(eyeType);
            });
        });

        // Adicionar handler para expressão facial
        document.getElementById('faceExpression').addEventListener('input', (e) => {
            const expression = e.target.value;
            if (this.currentCharacter) {
                this.currentCharacter.updateFaceExpression(expression);
            }
        });

        // Adicionar handlers para presets de expressões
        document.querySelectorAll('.face-preset').forEach(button => {
            button.addEventListener('click', () => {
                const expression = button.dataset.face;
                document.getElementById('faceExpression').value = expression;
                if (this.currentCharacter) {
                    this.currentCharacter.updateFaceExpression(expression);
                }
            });
        });

        // Simplificar handler da expressão facial
        const faceInput = document.getElementById('faceExpression');
        faceInput.addEventListener('input', (e) => {
            if (this.currentCharacter) {
                this.currentCharacter.faceExpression = e.target.value;
                this.currentCharacter.update3DModel(this.character3D);
            }
        });

        // Remover eventos duplicados de faceExpression
        // Remover referências a updateFaceExpression
        // Manter apenas o código acima para expressão facial

        // Remover handlers antigos e substituir por uma versão simplificada
        // Handler unificado para expressão facial
        document.getElementById('faceExpression').addEventListener('input', (e) => {
            if (this.currentCharacter) {
                this.currentCharacter.faceExpression = e.target.value;
                this.currentCharacter.update3DModel(this.character3D);
            }
        });

        // Handlers para presets de expressões
        document.querySelectorAll('.face-preset').forEach(button => {
            button.addEventListener('click', () => {
                const expression = button.dataset.face;
                const faceInput = document.getElementById('faceExpression');
                faceInput.value = expression;
                if (this.currentCharacter) {
                    this.currentCharacter.faceExpression = expression;
                    this.currentCharacter.update3DModel(this.character3D);
                }
            });
        });

        // Remover outros handlers duplicados de faceExpression

        // Adicionar setup do controle de raio
        this.setupRadiusControl();
    }

    validateForm() {
        const name = document.getElementById('charName').value.trim();
        if (!name) {
            alert('Por favor, digite um nome para o personagem');
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
            const userId = authGuard.getActiveUserId();
            if (!userId) {
                throw new Error('ID do usuário não encontrado');
            }

            // Atualizar nome do personagem atual
            const name = document.getElementById('charName').value.trim();
            this.currentCharacter.name = name;
            this.currentCharacter.userId = userId;

            // Enviar dados atuais do personagem
            const characterData = {
                userId: userId,
                name: this.currentCharacter.name,
                mainColor: this.currentCharacter.mainColor,
                skinColor: this.currentCharacter.skinColor,
                accentColor: this.currentCharacter.accentColor,
                topRadius: this.currentCharacter.topRadius,
                bottomRadius: this.currentCharacter.bottomRadius,
                equipment: this.currentCharacter.equipment,
                faceExpression: this.currentCharacter.faceExpression
            };

            console.log('Salvando personagem com dados atualizados:', characterData);
            const result = await this.db.saveCharacter(characterData);

            if (!result.success) {
                throw new Error(result.error || 'Falha ao salvar personagem');
            }

            console.log('Personagem salvo com sucesso:', result.character);
            alert('Personagem salvo com sucesso!');
            window.location.href = 'select.html';

        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(`Erro ao salvar o personagem: ${error.message}`);
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
            this.topRadius = 0.5 + (x * 0.5); // 0.5 a 1.0
            this.bottomRadius = 0.5 + ((1 - y) * 0.5); // 0.5 a 1.0
            
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
        // Usar valores do DEFAULT_CHARACTER para reset
        this.mainColor = DEFAULT_CHARACTER.mainColor;
        this.skinColor = DEFAULT_CHARACTER.skinColor;
        this.accentColor = DEFAULT_CHARACTER.accentColor;
        this.topRadius = DEFAULT_CHARACTER.topRadius;
        this.bottomRadius = DEFAULT_CHARACTER.bottomRadius;

        // Atualizar posição do handle para o centro
        const handle = document.getElementById('radiusHandle');
        handle.style.left = '50%';
        handle.style.top = '50%';

        // Atualizar valores exibidos
        document.getElementById('topRadiusValue').textContent = this.topRadius.toFixed(2);
        document.getElementById('bottomRadiusValue').textContent = this.bottomRadius.toFixed(2);

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

function createCharacter3D(options = {}) {
    const group = new THREE.Group();
    
    // Corpo com material melhorado
    const bodyGeometry = new THREE.CylinderGeometry(
        options.topRadius || 0.75,
        options.bottomRadius || 0.75,
        2,
        32
    );
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: options.mainColor || '#FF0000',
        roughness: 0.3,          // Menor rugosidade para mais brilho
        metalness: 0.4,          // Aumentar metalicidade
        envMapIntensity: 1.2,    // Aumentar intensidade de reflexão
        flatShading: false       // Suavizar superfície
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    // Cabeça com material melhorado
    const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: options.skinColor || '#FFA07A',
        roughness: 0.2,          // Menor rugosidade para mais brilho
        metalness: 0.3,          // Metalicidade moderada
        envMapIntensity: 1.2,    // Aumentar intensidade de reflexão
        flatShading: false,      // Suavizar superfície
        transparent: true,      // Adicionar suporte à transparência
        alphaTest: 0.5,        // Ajustar teste alpha para melhor renderização
        combine: THREE.MultiplyOperation  // Garantir que a cor base seja multiplicada com a textura
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1;
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);
    
    // Definir posição Y inicial correta
    group.position.set(0, -9.6, 0);
    
    return group;
}

function resetCharacterCreation() {
    // Reset das cores
    document.getElementById('mainColor').value = mainColor;
    document.getElementById('skinColor').value = skinColor;
    document.getElementById('accentColor').value = accentColor;
    document.getElementById('charName').value = '';
    
    // Reset dos raios para o valor padrão (0.75)
    topRadius = 0.75;
    bottomRadius = 0.75;
    
    // Posicionar handle na posição inicial
    const handle = document.getElementById('radiusHandle');
    const normalizedPosition = ((0.75 - 0.5) / (1.0 - 0.5)) * 100;
    handle.style.left = `${normalizedPosition}%`;
    handle.style.top = `${normalizedPosition}%`;
    
    // Atualizar valores exibidos
    document.getElementById('topRadiusValue').textContent = topRadius.toFixed(2);
    document.getElementById('bottomRadiusValue').textContent = bottomRadius.toFixed(2);
    
    // Atualizar preview 3D
    if (character3D) {
        const body = character3D.children.find(child => !child.name); // corpo é o que não tem nome
        const head = character3D.children.find(child => child.name === 'head');
        
        if (body && head) {
            body.material.color.setStyle(mainColor);
            head.material.color.setStyle(skinColor);
            
            const newBodyGeometry = new THREE.CylinderGeometry(
                Math.max(0.1, topRadius), // Evita valores zero ou negativos
                Math.max(0.1, bottomRadius),
                2,
                32
            );
            body.geometry.dispose();
            body.geometry = newBodyGeometry;
        }
    }
}

function initCharacterPreview() {
    const canvas = document.getElementById('characterPreview');
    const previewSection = document.querySelector('.preview-section');
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(75, previewSection.offsetWidth / previewSection.offsetHeight, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas,
        antialias: true,
        logarithmicDepthBuffer: true
    });

    // Criar cena espacial
    const spaceScene = new SpaceScene(scene, camera);

    // Usar CameraController - removida a declaração duplicada
    const cameraController = new CameraController(camera, renderer, scene);

    function resizeRenderer() {
        const width = previewSection.offsetWidth;
        const height = previewSection.offsetHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }
    
    window.addEventListener('resize', resizeRenderer);
    resizeRenderer();
    
    // Criar modelo 3D inicial
    try {
        currentCharacter = new Character("", mainColor, skinColor, accentColor);
        character3D = currentCharacter.create3DModel();
        scene.add(character3D);
    } catch (error) {
        console.error('Erro ao criar personagem:', error);
    }
    
    // Animation loop simplificado
    function animate() {
        requestAnimationFrame(animate);
        cameraController.update();
        spaceScene.update();
        renderer.render(scene, camera);
    }
    animate();
    
    // Configurar inputs de cor
    ['mainColor', 'skinColor', 'accentColor'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            if (id === 'mainColor') {
                mainColor = e.target.value;
                character3D.children[0].material.color.setStyle(mainColor);
            } else if (id === 'skinColor') {
                skinColor = e.target.value;
                character3D.children[1].material.color.setStyle(skinColor);
            }
        });
    });

    // Configurar controle 2D de raios
    setupRadiusControl();
}

function setupRadiusControl() {
    const slider2D = document.getElementById('radiusSlider2D');
    const handle = document.getElementById('radiusHandle');
    let isDragging = false;

    // Definir constantes para os limites
    const MIN_RADIUS = 0.5;
    const MAX_RADIUS = 1.0;
    const DEFAULT_RADIUS = 0.75;

    // Função para converter posição do mouse para valor do raio
    function updateRadiusFromPosition(x, y) {
        const rect = slider2D.getBoundingClientRect();
        const normalizedX = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
        const normalizedY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));

        // Mapear valores normalizados para o intervalo desejado
        topRadius = MIN_RADIUS + (normalizedX * (MAX_RADIUS - MIN_RADIUS));
        bottomRadius = MIN_RADIUS + (normalizedY * (MAX_RADIUS - MIN_RADIUS));

        // Atualizar posição visual do handle
        handle.style.left = `${normalizedX * 100}%`;
        handle.style.top = `${normalizedY * 100}%`;

        // Atualizar valores exibidos
        document.getElementById('topRadiusValue').textContent = topRadius.toFixed(2);
        document.getElementById('bottomRadiusValue').textContent = bottomRadius.toFixed(2);

        updateCharacterBody();
    }

    // Posicionar handle na posição inicial (0.75, 0.75)
    const initialX = ((DEFAULT_RADIUS - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100;
    const initialY = ((DEFAULT_RADIUS - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100;
    handle.style.left = `${initialX}%`;
    handle.style.top = `${initialY}%`;

    function updateCharacterBody() {
        if (character3D) {
            const body = character3D.children[0];
            const newGeometry = new THREE.CylinderGeometry(
                topRadius,
                bottomRadius,
                2,
                32
            );
            body.geometry.dispose();
            body.geometry = newGeometry;
        }
    }

    slider2D.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateRadiusFromPosition(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateRadiusFromPosition(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}
