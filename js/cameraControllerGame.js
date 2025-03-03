import * as THREE from 'three';

export class CameraControllerGame {
    constructor(camera) {
        // Referência da câmera
        this.camera = camera;
        this.target = new THREE.Vector3();

        // Configurações de Distância
        this.distance = 20;        // Distância inicial da câmera
        this.minDistance = 10;     // Zoom máximo (mais próximo)
        this.maxDistance = 30;     // Zoom máximo (mais distante)

        // Configurações de Ângulos
        this.angle = Math.PI / 5;  // Ângulo vertical inicial (45 graus)
        this.rotationAngle = Math.PI / 4; // Rotação horizontal inicial (45 graus)
        this.minAngle = Math.PI / 9;      // Ângulo vertical mínimo (30 graus)
        this.maxAngle = Math.PI / 2;    // Ângulo vertical máximo (72 graus)

        // Velocidades e Sensibilidade
        this.panSpeed = 0.05;      // Velocidade do movimento lateral
        this.rotateSpeed = 0.005;  // Velocidade da rotação
        this.zoomSpeed = 1;        // Velocidade do zoom
        this.smoothness = 0.1;     // Suavização do movimento (0-1)

        // Estado do Mouse e Teclado
        this.isLeftMouseDown = false;
        this.isRightMouseDown = false;
        this.isShiftDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.setupCamera();
        this.setupMouseControls();
    }

    setupCamera() {
        this.updateCameraPosition();
        this.camera.lookAt(this.target);
    }

    setupMouseControls() {
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('wheel', (e) => this.onMouseWheel(e));
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') this.isShiftDown = true;
        });
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') this.isShiftDown = false;
        });
    }

    onMouseDown(event) {
        if (event.button === 0) this.isLeftMouseDown = true;
        if (event.button === 2) this.isRightMouseDown = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    onMouseUp(event) {
        if (event.button === 0) this.isLeftMouseDown = false;
        if (event.button === 2) this.isRightMouseDown = false;
    }

    onMouseMove(event) {
        if (!this.isRightMouseDown) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        if (this.isRightMouseDown && !this.isShiftDown) {
            // Movimento da câmera (pan)
            const forward = new THREE.Vector3(
                Math.sin(this.rotationAngle),
                0,
                Math.cos(this.rotationAngle)
            );
            const right = new THREE.Vector3(
                Math.sin(this.rotationAngle + Math.PI/2),
                0,
                Math.cos(this.rotationAngle + Math.PI/2)
            );

            this.target.add(right.multiplyScalar(-deltaX * this.panSpeed));
            this.target.add(forward.multiplyScalar(-deltaY * this.panSpeed));
        }

        if (this.isRightMouseDown && this.isShiftDown) {
            // Rotação da câmera
            this.rotationAngle -= deltaX * this.rotateSpeed;
            this.angle = THREE.MathUtils.clamp(
                this.angle + deltaY * this.rotateSpeed,
                this.minAngle,
                this.maxAngle
            );
        }

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.updateCameraPosition();
    }

    onMouseWheel(event) {
        const zoomDelta = event.deltaY * this.zoomSpeed * 0.01;
        this.distance = THREE.MathUtils.clamp(
            this.distance + zoomDelta,
            this.minDistance,
            this.maxDistance
        );
        this.updateCameraPosition();
    }

    updateCameraPosition() {
        const horizontalDistance = this.distance * Math.cos(this.angle);
        
        this.camera.position.x = this.target.x + horizontalDistance * Math.sin(this.rotationAngle);
        this.camera.position.z = this.target.z + horizontalDistance * Math.cos(this.rotationAngle);
        this.camera.position.y = this.target.y + this.distance * Math.sin(this.angle);
        
        this.camera.lookAt(this.target);
    }

    update(characterPosition) {
        if (characterPosition) {
            this.updateCameraPosition();
        }
    }

    // Métodos de ajuste simplificados
    adjustCameraSettings(settings) {
        // Ajuste de distâncias
        if (settings.distance) {
            this.distance = settings.distance.current ?? this.distance;
            this.minDistance = settings.distance.min ?? this.minDistance;
            this.maxDistance = settings.distance.max ?? this.maxDistance;
        }

        // Ajuste de ângulos
        if (settings.angles) {
            this.angle = settings.angles.vertical ?? this.angle;
            this.rotationAngle = settings.angles.rotation ?? this.rotationAngle;
            this.minAngle = settings.angles.min ?? this.minAngle;
            this.maxAngle = settings.angles.max ?? this.maxAngle;
        }

        // Ajuste de velocidades
        if (settings.speeds) {
            this.panSpeed = settings.speeds.pan ?? this.panSpeed;
            this.rotateSpeed = settings.speeds.rotate ?? this.rotateSpeed;
            this.zoomSpeed = settings.speeds.zoom ?? this.zoomSpeed;
        }

        if (settings.smoothness !== undefined) this.smoothness = settings.smoothness;

        this.updateCameraPosition();
    }
}
