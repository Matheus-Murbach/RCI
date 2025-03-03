import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { authGuard } from './auth/authGuard.js';

export class CameraController {
    constructor(camera, renderer, scene) {
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;
        this.controls = null;
        
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);
        
        this.setupOrbitControls();
        this.setupEventListeners();
    }

    setupOrbitControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Configurações dos controles
        Object.assign(this.controls, {
            enableDamping: true,
            dampingFactor: 0.05,
            screenSpacePanning: false,
            minDistance: 3,
            maxDistance: 10,
            minPolarAngle: Math.PI / 4,
            maxPolarAngle: Math.PI / 2,
            autoRotate: true,
            autoRotateSpeed: 0.5,
            enabled: true
        });
    }

    setupEventListeners() {
        const toggleButton = document.getElementById('toggleOrbit');
        const logoutButton = document.getElementById('logoutButton');

        // Configurar botão de toggle
        if (toggleButton) {
            toggleButton.classList.add('active');
            toggleButton.addEventListener('click', () => {
                this.controls.autoRotate = !this.controls.autoRotate;
                toggleButton.classList.toggle('active');
            });
        }

        // Configurar botão de logout
        if (logoutButton) {
            logoutButton.addEventListener('click', () => authGuard.logout());
        }

        // Handler para desativar rotação automática
        const disableAutoRotate = () => {
            if (this.controls.autoRotate) {
                this.controls.autoRotate = false;
                toggleButton?.classList.remove('active');
            }
        };

        // Event listeners para mouse
        const canvas = this.renderer.domElement;
        
        // Desativa quando começa a arrastar
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Botão esquerdo do mouse
                disableAutoRotate();
            }
        });

        // Desativa durante o movimento se o botão estiver pressionado
        canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) { // Botão esquerdo pressionado
                disableAutoRotate();
            }
        });

        // Desativa no zoom
        canvas.addEventListener('wheel', disableAutoRotate);

        // Event listeners para touch
        canvas.addEventListener('touchstart', disableAutoRotate);
        canvas.addEventListener('touchmove', disableAutoRotate);

        // Atualizar controles quando o mouse sair da tela
        canvas.addEventListener('mouseleave', () => {
            if (this.controls) {
                this.controls.reset();
            }
        });
    }

    update() {
        this.controls?.update();
    }

    focusOnTarget(target = new THREE.Vector3(0, 0, 0)) {
        this.camera.lookAt(target);
        this.controls.target.copy(target);
    }
}