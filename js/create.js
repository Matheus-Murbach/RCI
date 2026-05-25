import { THREE } from './core/three.js';
import { Character, CHARACTER_CONFIG } from './character/character.js';
import { authGuard } from './auth/authGuard.js';
import { Database } from './database/database.js';
import { SpaceScene } from './map/spaceScene.js';
import { RenderSystem } from './core/renderSystem.js';
import { CameraController } from './cameraControllerLobby.js';
import { StateManager } from './core/stateManager.js';

class CharacterCreator {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.db = new Database();
        this.character3D = null;
        this.currentCharacter = new Character(CHARACTER_CONFIG.defaults, true);
        this.renderSystem = RenderSystem.getInstance();
        this.isDragging = false;

        this.topRadius = CHARACTER_CONFIG.defaults.topRadius;
        this.bottomRadius = CHARACTER_CONFIG.defaults.bottomRadius;
    }

    async initialize() {
        try {
            console.log('Iniciando tela de criação...');

            if (!authGuard.isUserActive()) {
                localStorage.setItem('redirectAfterLogin', '/pages/create.html');
                window.location.replace('/pages/login.html');
                return;
            }

            this.initScene();
            await this.initCharacter();
            this.resetCharacterForm();
            this.setupEventListeners();

            console.log('Inicialização concluída com sucesso');

        } catch (error) {
            console.error('Erro na inicialização:', error.message);
            this.handleError(error);
        }
    }

    initScene() {
        const canvas = document.getElementById('characterPreview');
        const previewSection = document.querySelector('.preview-section');

        if (!canvas || !previewSection) {
            throw new Error('Canvas ou container não encontrados');
        }

        const { scene, camera, renderer } = this.renderSystem.initialize(canvas, previewSection);

        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        const spotlight = new THREE.SpotLight(0xffffff, 5);
        spotlight.position.set(5, 5, 5);
        spotlight.angle = Math.PI / 10;
        spotlight.distance = 3;

        const targetObject = new THREE.Object3D();
        targetObject.position.set(0, 0, 0);
        this.scene.add(targetObject);
        spotlight.target = targetObject;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.scene.add(spotlight);

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        this.spaceScene = new SpaceScene(scene, camera);

        this.cameraController = new CameraController(camera, renderer, scene);
        this.spaceScene.setCameraController(this.cameraController);
        this.renderSystem.setActiveScene(this.spaceScene);
        this.cameraController.enableCinematicMode();

        const orbitButton = document.getElementById('toggleOrbit');
        if (orbitButton) {
            orbitButton.classList.add('active');
            orbitButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.cameraController) {
                    this.cameraController.toggleCinematicMode();
                }
            });
        }

        this.renderSystem.animate();
    }

    async initCharacter() {
        try {
            this.character3D = await this.currentCharacter.create3DModel();

            if (this.character3D && this.scene) {
                this.character3D.position.set(0, -0.5, 0);
                this.scene.add(this.character3D);
                this.currentCharacter.update3DModel(this.character3D);
            }
        } catch (error) {
            console.error('Erro ao criar personagem:', error);
            throw new Error('Falha ao criar modelo 3D do personagem');
        }
    }

    setupEventListeners() {
        document.getElementById('saveCharacter').addEventListener('click', async () => {
            if (!this.validateForm()) return;
            await this.saveCharacter();
        });

        document.getElementById('backButton').addEventListener('click', () => {
            window.location.href = 'select.html';
        });

        document.getElementById('logoutButton').addEventListener('click', () => {
            authGuard.logout();
        });

        const toggleBtn = document.getElementById('toggleCharacterList');
        const controlsSection = document.querySelector('.character-list-section');

        if (toggleBtn && controlsSection) {
            toggleBtn.addEventListener('click', () => {
                controlsSection.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (!controlsSection.contains(e.target) &&
                    !toggleBtn.contains(e.target) &&
                    controlsSection.classList.contains('active')) {
                    controlsSection.classList.remove('active');
                }
            });
        }

        ['mainColor', 'skinColor', 'accentColor'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.updateColor(id, e.target.value);
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.radius-control')) {
                this.isDragging = false;
            }
        });

        document.getElementById('faceExpression').addEventListener('input', (e) => {
            if (this.currentCharacter) {
                this.currentCharacter.faceExpression = e.target.value;
                this.currentCharacter.update3DModel(this.character3D);
            }
        });

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

        const colorRegex = /^#[0-9A-F]{6}$/i;
        if (!colorRegex.test(mainColor) || !colorRegex.test(skinColor) || !colorRegex.test(accentColor)) {
            alert('Por favor, selecione cores válidas para o personagem');
            return false;
        }

        if (this.topRadius < 0.25 || this.topRadius > 1.0 ||
            this.bottomRadius < 0.25 || this.bottomRadius > 1.0) {
            alert('Os valores dos raios devem estar entre 0.25 e 1.0');
            return false;
        }

        if (!authGuard.isUserActive()) {
            alert('Sua sessão expirou. Por favor, faça login novamente.');
            authGuard.logout();
            return false;
        }

        return true;
    }

    async saveCharacter() {
        try {
            const userId = authGuard.getActiveUserId();
            if (!userId) throw new Error('ID do usuário não encontrado');

            const characterData = {
                userId,
                name: document.getElementById('charName').value.trim(),
                faceExpression: document.getElementById('faceExpression').value.trim(),
                mainColor: document.getElementById('mainColor').value || CHARACTER_CONFIG.defaults.mainColor,
                skinColor: document.getElementById('skinColor').value || CHARACTER_CONFIG.defaults.skinColor,
                accentColor: document.getElementById('accentColor').value || CHARACTER_CONFIG.defaults.accentColor,
                topRadius: this.topRadius || CHARACTER_CONFIG.defaults.topRadius,
                bottomRadius: this.bottomRadius || CHARACTER_CONFIG.defaults.bottomRadius,
                equipment: CHARACTER_CONFIG.defaults.equipment || {}
            };

            Object.entries(characterData).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    throw new Error(`Campo ${key} não pode ser vazio`);
                }
            });

            const result = await this.db.saveCharacter(characterData);

            if (result.success) {
                this.stateManager.setCurrentCharacter(result.character);
                alert('Personagem salvo com sucesso!');
                window.location.href = 'select.html';
            } else {
                throw new Error(result.message || 'Erro ao salvar personagem');
            }

        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
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

            let x = (clientX - rect.left) / rect.width;
            let y = (clientY - rect.top) / rect.height;

            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));

            handle.style.left = `${x * 100}%`;
            handle.style.top = `${y * 100}%`;

            this.topRadius = 0.25 + (x * 0.75);
            this.bottomRadius = 0.25 + ((1 - y) * 0.75);

            if (this.currentCharacter) {
                this.currentCharacter.topRadius = this.topRadius;
                this.currentCharacter.bottomRadius = this.bottomRadius;
            }

            document.getElementById('topRadiusValue').textContent = this.topRadius.toFixed(2);
            document.getElementById('bottomRadiusValue').textContent = this.bottomRadius.toFixed(2);

            this.updateCharacterShape();
        };

        slider.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            updateRadius(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) updateRadius(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        slider.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            updateRadius(e.touches[0].clientX, e.touches[0].clientY);
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) updateRadius(e.touches[0].clientX, e.touches[0].clientY);
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
        const faceInput = document.getElementById('faceExpression');
        if (faceInput) faceInput.value = CHARACTER_CONFIG.defaults.faceExpression;

        const mainColorInput = document.getElementById('mainColor');
        if (mainColorInput) mainColorInput.value = CHARACTER_CONFIG.defaults.mainColor;

        const skinColorInput = document.getElementById('skinColor');
        if (skinColorInput) skinColorInput.value = CHARACTER_CONFIG.defaults.skinColor;

        const accentColorInput = document.getElementById('accentColor');
        if (accentColorInput) accentColorInput.value = CHARACTER_CONFIG.defaults.accentColor;

        this.topRadius = CHARACTER_CONFIG.defaults.topRadius;
        this.bottomRadius = CHARACTER_CONFIG.defaults.bottomRadius;

        const handle = document.getElementById('radiusHandle');
        if (handle) {
            handle.style.left = '50%';
            handle.style.top = '50%';
        }

        const topRadiusValue = document.getElementById('topRadiusValue');
        if (topRadiusValue) topRadiusValue.textContent = this.topRadius.toFixed(2);

        const bottomRadiusValue = document.getElementById('bottomRadiusValue');
        if (bottomRadiusValue) bottomRadiusValue.textContent = this.bottomRadius.toFixed(2);

        this.updateCharacterShape();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const creator = new CharacterCreator();
    creator.initialize().catch(error => {
        console.error('Erro fatal:', error);
        alert('Erro ao inicializar aplicação. Voltando para o menu...');
        window.location.replace('/pages/select.html');
    });
});
