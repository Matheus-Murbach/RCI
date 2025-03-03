import { Character } from './character.js';
import { authGuard } from './auth/authGuard.js';
import { Database } from './database/database.js';
import { SpaceScene } from './spaceScene.js';
import { CameraController } from './cameraController.js';

class CharacterCreator {
    constructor() {
        this.db = new Database();
        this.character3D = null;
        this.currentCharacter = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Configurações padrão
        this.mainColor = '#FF0000';
        this.skinColor = '#FFA07A';
        this.accentColor = '#0000FF';
        this.topRadius = 0.75;
        this.bottomRadius = 0.75;
        this.isDragging = false;
        this.setupRadiusControl();
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
            throw new Error('Elementos da cena não encontrados');
        }

        // Configurar cena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Configurar câmera
        this.camera = new THREE.PerspectiveCamera(
            75,
            previewSection.offsetWidth / previewSection.offsetHeight,
            0.1,
            5000
        );

        // Configurar renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            logarithmicDepthBuffer: true
        });

        // Configurar SpaceScene
        this.spaceScene = new SpaceScene(this.scene, this.camera);
        
        // Configurar controles de câmera
        this.cameraController = new CameraController(
            this.camera,
            this.renderer,
            this.scene
        );

        // Configurar redimensionamento
        this.setupResizeHandler(previewSection);
        
        // Iniciar animação
        this.animate();
        
        console.log('Cena inicializada');
    }

    initCharacter() {
        console.log('Inicializando personagem...');
        
        try {
            this.currentCharacter = new Character(
                "",
                this.mainColor,
                this.skinColor,
                this.accentColor
            );
            
            this.character3D = this.currentCharacter.create3DModel();
            this.scene.add(this.character3D);
            
            console.log('Personagem inicializado');
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

        // Inputs de cor
        ['mainColor', 'skinColor', 'accentColor'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.updateColor(id, e.target.value);
            });
        });
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
                equipment: this.currentCharacter.equipment
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
        switch(colorType) {
            case 'mainColor':
                this.mainColor = value;
                this.currentCharacter.mainColor = value;
                if (this.character3D) {
                    this.character3D.children[0].material.color.setStyle(value);
                }
                break;
            case 'skinColor':
                this.skinColor = value;
                this.currentCharacter.skinColor = value;
                if (this.character3D) {
                    this.character3D.children[1].material.color.setStyle(value);
                }
                break;
            case 'accentColor':
                this.accentColor = value;
                this.currentCharacter.accentColor = value;
                break;
        }
        console.log('Cores atualizadas:', {
            mainColor: this.mainColor,
            skinColor: this.skinColor,
            accentColor: this.accentColor
        });
    }

    setupRadiusControl() {
        const slider = document.getElementById('radiusSlider2D');
        const handle = document.getElementById('radiusHandle');
        
        // Valores mínimo e máximo para os raios
        const MIN_RADIUS = 0.5;
        const MAX_RADIUS = 1.0;

        const updateRadius = (clientX, clientY) => {
            const rect = slider.getBoundingClientRect();
            
            // Calcular posições normalizadas (0 a 1)
            let x = (clientX - rect.left) / rect.width;
            let y = (clientY - rect.top) / rect.height;
            
            // Limitar valores entre 0 e 1
            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));
            
            // Calcular raios com base nas posições
            this.topRadius = MIN_RADIUS + (x * (MAX_RADIUS - MIN_RADIUS));
            this.bottomRadius = MIN_RADIUS + ((1 - y) * (MAX_RADIUS - MIN_RADIUS));
            
            // Atualizar também no currentCharacter
            this.currentCharacter.topRadius = this.topRadius;
            this.currentCharacter.bottomRadius = this.bottomRadius;
            
            // Atualizar posição do handle
            handle.style.left = `${x * 100}%`;
            handle.style.top = `${y * 100}%`;
            
            // Atualizar valores exibidos
            document.getElementById('topRadiusValue').textContent = this.topRadius.toFixed(2);
            document.getElementById('bottomRadiusValue').textContent = this.bottomRadius.toFixed(2);
            
            // Atualizar geometria do personagem
            this.updateCharacterShape();
            
            console.log('Forma atualizada:', {
                topRadius: this.topRadius,
                bottomRadius: this.bottomRadius
            });
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
        if (!this.character3D) return;

        const body = this.character3D.children[0];
        const newGeometry = new THREE.CylinderGeometry(
            this.topRadius,
            this.bottomRadius,
            2,
            32
        );

        // Atualizar geometria preservando materiais e transformações
        const oldGeometry = body.geometry;
        body.geometry = newGeometry;
        oldGeometry.dispose(); // Limpar geometria antiga da memória
    }

    resetCharacterForm() {
        // Resetar valores
        this.topRadius = 0.75;
        this.bottomRadius = 0.75;

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
    
    // Corpo (cilindro)
    const bodyGeometry = new THREE.CylinderGeometry(
        options.topRadius || 0.75,
        options.bottomRadius || 0.75,
        2,
        32
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: options.mainColor || '#FF0000'
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.5;
    group.add(body);
    
    // Cabeça (esfera)
    const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({
        color: options.skinColor || '#FFA07A'
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1;
    group.add(head);
    
    // Posicionar o personagem em cima do asteroide
    group.position.y = 1;
    
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
        const body = character3D.children[0];
        const head = character3D.children[1];
        
        body.material.color.setStyle(mainColor);
        head.material.color.setStyle(skinColor);
        
        const newBodyGeometry = new THREE.CylinderGeometry(
            topRadius,
            bottomRadius,
            2,
            32
        );
        body.geometry.dispose();
        body.geometry = newBodyGeometry;
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

// ... resto do código da tela de criação ...
