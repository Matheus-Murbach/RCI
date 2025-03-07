import { THREE } from './core/three.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BaseCameraController } from './core/baseCameraController.js';

export class CameraController extends BaseCameraController {
    constructor(camera, renderer, scene) {
        super(camera, scene);
        this.renderer = renderer;
        this.controls = null;
        this.cinematicMode = true; // Garantir que inicie em modo cinematográfico

        // Configurações específicas da câmera cinematográfica
        this.cinematicConfig = {
            rotationSpeed: 0.00008,
            radiusMin: 3,
            radiusMax: 6,
            heightMin: 1,
            heightMax: 2.5,
            heightSpeed: 0.0002,
            radiusSpeed: 0.0003,
            tiltSpeed: 0.0001,
            tiltAngle: Math.PI / 8
        };

        // Inicializar controles e estado cinematográfico
        this.setupControls();
        this.enableCinematicMode(); // Novo método para garantir estado inicial

        // Inicializar estado do botão
        this.initOrbitButton();

        console.log('🎥 CameraController inicializado, modo cinematográfico:', this.cinematicMode);
    }

    setupControls() {
        if (!this.renderer.domElement) return;

        try {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            
            // Configurações básicas dos controles
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 3;
            this.controls.maxDistance = 8;
            this.controls.minPolarAngle = Math.PI / 4;
            this.controls.maxPolarAngle = Math.PI / 2;
            this.controls.enablePan = false;
            this.controls.enabled = !this.cinematicMode;

            // Configurar posição inicial
            this.controls.target.copy(this.defaultTarget);
            this.camera.position.copy(this.defaultPosition);
            
            // Evento para desativar modo cinematográfico ao interagir
            this.renderer.domElement.addEventListener('pointerdown', () => {
                if (this.cinematicMode) {
                    this.disableCinematicMode();
                }
            });

            this.controls.update();
        } catch (error) {
            console.error('Erro nos controles:', error);
        }
    }

    initOrbitButton() {
        const button = document.getElementById('toggleOrbit');
        if (button) {
            // Configurar estado inicial do botão
            button.classList.toggle('active', this.cinematicMode);
            button.querySelector('.material-icons').textContent = 
                this.cinematicMode ? 'sync' : 'sync_disabled';

            // Adicionar listener do botão
            button.addEventListener('click', () => {
                this.toggleCinematicMode();
            });
        }
    }

    updateCinematicCamera(time) {
        if (!this.cinematicMode) return;

        const config = this.cinematicConfig;
        
        // Movimento circular mais suave
        const baseAngle = time * config.rotationSpeed;
        const radiusVariation = Math.sin(time * config.radiusSpeed) * 0.5;  // Reduzido para 0.5
        const currentRadius = config.radiusMin + 
            (radiusVariation + 1) * (config.radiusMax - config.radiusMin) / 2;
        
        // Posição base
        const x = Math.cos(baseAngle) * currentRadius;
        const z = Math.sin(baseAngle) * currentRadius;
        
        // Altura com variação mais suave
        const heightVariation = Math.sin(time * config.heightSpeed) * 0.5;  // Reduzido para 0.5
        const y = config.heightMin + 
            (heightVariation + 1) * (config.heightMax - config.heightMin) / 2;

        // Inclinação mais suave
        const tiltVariation = Math.sin(time * config.tiltSpeed) * config.tiltAngle * 0.5;  // Reduzido para 0.5
        
        // Suavização aumentada
        this.camera.position.lerp(new THREE.Vector3(x, y, z), 0.01);  // Reduzido para 0.01

        // Olhar para o personagem com altura variável mais suave
        const lookAtY = 1 + Math.sin(time * config.heightSpeed * 0.5) * 0.3;  // Reduzido para 0.3
        const targetPosition = new THREE.Vector3(0, lookAtY, 0);
        this.camera.lookAt(targetPosition);
        this.camera.rotateZ(tiltVariation);
    }

    update() {
        if (!this.enabled) return;

        if (this.cinematicMode) {
            this.updateCinematicCamera(Date.now());
        } else {
            this.controls.update();
        }
    }

    // Novo método para forçar modo cinematográfico
    enableCinematicMode() {
        this.cinematicMode = true;
        if (this.controls) {
            this.controls.enabled = false;
        }
        this.resetCamera();
        this.updateOrbitButtonState();
    }

    toggleCinematicMode() {
        console.log('🎬 Alternando modo cinematográfico');
        console.log('Estado anterior:', this.cinematicMode);
        
        this.cinematicMode = !this.cinematicMode;
        
        if (this.controls) {
            this.controls.enabled = !this.cinematicMode;
        }

        if (this.cinematicMode) {
            this.resetCamera();
        }

        this.updateOrbitButtonState();
        console.log('Novo estado:', this.cinematicMode);
    }

    disableCinematicMode() {
        this.cinematicMode = false;
        if (this.controls) this.controls.enabled = true;
        
        const button = document.getElementById('toggleOrbit');
        if (button) button.classList.remove('active');
    }

    // Método para gerenciar o estado do botão
    updateOrbitButtonState() {
        const button = document.getElementById('toggleOrbit');
        if (button) {
            button.classList.toggle('active', this.cinematicMode);
            button.querySelector('.material-icons').textContent = 
                this.cinematicMode ? 'sync' : 'sync_disabled';
        }
    }

    resetCamera() {
        this.camera.position.copy(this.defaultPosition);
        if (this.controls) {
            this.controls.target.copy(this.defaultTarget);
            this.controls.update();
        }
        this.camera.lookAt(this.defaultTarget);
    }

    dispose() {
        super.dispose();
        if (this.controls) {
            this.controls.dispose();
        }
        this.controls = null;
    }
}