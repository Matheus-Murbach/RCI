import { THREE, OrbitControls } from './core/three.js';

export class CameraController {
    constructor(camera, renderer, scene) {
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;
        this.controls = null;
        this.enabled = true;
        this.cinematicMode = true;

        // Posição padrão da câmera
        this.defaultPosition = new THREE.Vector3(0, 2, 5);
        this.defaultTarget = new THREE.Vector3(0, 0, 0);

        // Configurações da câmera cinematográfica ajustadas
        this.cinematicConfig = {
            rotationSpeed: 0.00008,   // Velocidade reduzida
            radiusMin: 3,             // Distância mínima reduzida
            radiusMax: 6,             // Distância máxima reduzida
            heightMin: 1,             // Altura mínima mantida
            heightMax: 2.5,           // Altura máxima reduzida
            heightSpeed: 0.0002,      // Velocidade de altura reduzida
            radiusSpeed: 0.0003,      // Velocidade do raio reduzida
            tiltSpeed: 0.0001,        // Velocidade de inclinação reduzida
            tiltAngle: Math.PI / 8    // Ângulo de inclinação reduzido
        };

        this.setupControls();
        this.resetCamera();

        // Configurar estado inicial do botão
        const button = document.getElementById('toggleOrbit');
        if (button) button.classList.add('active');

        // Garantir estado inicial correto
        this.cinematicMode = true;
        this.updateOrbitButtonState();
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

    toggleCinematicMode() {
        this.cinematicMode = !this.cinematicMode;
        
        // Atualizar controles
        if (this.controls) {
            this.controls.enabled = !this.cinematicMode;
        }
        
        this.updateOrbitButtonState();

        // Resetar posição se entrando no modo cinematográfico
        if (this.cinematicMode) {
            this.resetCamera();
        }
    }

    disableCinematicMode() {
        this.cinematicMode = false;
        if (this.controls) this.controls.enabled = true;
        
        const button = document.getElementById('toggleOrbit');
        if (button) button.classList.remove('active');
    }

    // Novo método para gerenciar o estado do botão
    updateOrbitButtonState() {
        const button = document.getElementById('toggleOrbit');
        if (button) {
            // Quando cinematicMode é true, o botão deve estar ativo
            if (this.cinematicMode) {
                button.classList.add('active');
                button.querySelector('.material-icons').textContent = 'sync';
            } else {
                button.classList.remove('active');
                button.querySelector('.material-icons').textContent = 'sync_disabled';
            }
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
}