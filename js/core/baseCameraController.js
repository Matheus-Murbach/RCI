import { THREE } from './three.js';

export class BaseCameraController {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.enabled = true;
        this.target = new THREE.Vector3(0, 0, 0);
        
        // Configurações base
        this.defaultPosition = new THREE.Vector3(0, 2, 5);
        this.defaultTarget = new THREE.Vector3(0, 0, 0);
        
        // Limites
        this.minDistance = 3;
        this.maxDistance = 30;
        this.minAngle = Math.PI / 9;
        this.maxAngle = Math.PI / 2;
        
        // Velocidades
        this.rotateSpeed = 0.003;
        this.panSpeed = 0.03;
        this.zoomSpeed = 1;
        this.smoothness = 0.1;

        this.distance = 5; // Adicionar distância inicial
        this.angle = Math.PI / 4; // Adicionar ângulo inicial
        this.rotationAngle = 0; // Adicionar ângulo de rotação inicial
    }

    update() {
        if (!this.enabled) return;
        this.updateCameraPosition();
    }

    updateCameraPosition() {
        // Implementação base
        const horizontalDistance = this.distance * Math.cos(this.angle);
        
        this.camera.position.x = this.target.x + horizontalDistance * Math.sin(this.rotationAngle);
        this.camera.position.z = this.target.z + horizontalDistance * Math.cos(this.rotationAngle);
        this.camera.position.y = this.target.y + this.distance * Math.sin(this.angle);
        
        this.camera.lookAt(this.target);
    }

    resetCamera() {
        this.camera.position.copy(this.defaultPosition);
        this.camera.lookAt(this.defaultTarget);
    }

    dispose() {
        // Limpar eventos e recursos
        this.enabled = false;
    }
}
