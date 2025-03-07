import { THREE } from './core/three.js';
import { BaseCameraController } from './core/baseCameraController.js';

export class CameraControllerGame extends BaseCameraController {
    constructor(camera, scene) {
        super(camera, scene);
        
        // Estado específico do jogo
        this.isLeftMouseDown = false;
        this.isRightMouseDown = false;
        this.isRotationMode = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.setupMouseControls();
    }

    setupMouseControls() {
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('wheel', (e) => this.onMouseWheel(e));
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onMouseDown(event) {
        if (event.button === 0) {
            this.isLeftMouseDown = true;
            if (this.isRightMouseDown) {
                this.isRotationMode = true;
            }
        }
        if (event.button === 2) {
            this.isRightMouseDown = true;
        }
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    onMouseUp(event) {
        if (event.button === 0) {
            this.isLeftMouseDown = false;
            this.isRotationMode = false;
        }
        if (event.button === 2) {
            this.isRightMouseDown = false;
            this.isRotationMode = false;
        }
    }

    onMouseMove(event) {
        if (!this.isRightMouseDown) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        if (this.isRotationMode) {
            // Rotação da câmera
            this.rotationAngle -= deltaX * this.rotateSpeed;
            this.angle = THREE.MathUtils.clamp(
                this.angle + deltaY * this.rotateSpeed,
                this.minAngle,
                this.maxAngle
            );
        } else if (this.isRightMouseDown) {
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

    dispose() {
        super.dispose();
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('wheel', this.onMouseWheel);
        document.removeEventListener('contextmenu', this.onContextMenu);
    }
}
