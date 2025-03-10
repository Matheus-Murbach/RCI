import { THREE } from '../core/three.js';

export class CharacterController {
    constructor(character3D, camera) {
        if (!character3D || !camera) {
            console.error('❌ Character ou Camera não fornecidos ao CharacterController');
            return;
        }

        this.character = character3D;
        this.camera = camera;
        this.moveSpeed = 0.1;
        this.velocity = new THREE.Vector3();
        this.moveDirection = new THREE.Vector3();
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        this.setupEventListeners();
        
        console.log('✅ CharacterController inicializado');
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onKeyDown(event) {
        switch(event.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
        }
    }

    onKeyUp(event) {
        switch(event.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
        }
    }

    onMouseMove(event) {
        if (!this.camera || !this.character) return;
        
        // Converter coordenadas do mouse para coordenadas do mundo
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        // Criar raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        // Calcular ponto no plano XZ
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, targetPoint);

        // Rotacionar personagem para olhar para o ponto
        if (this.character) {
            const direction = targetPoint.sub(this.character.position);
            const angle = Math.atan2(direction.x, direction.z);
            this.character.rotation.y = angle;
        }
    }

    update() {
        if (!this.camera || !this.character) return;

        const moved = this.updateMovement();
        if (moved) {
            // Encontrar cena e notificar câmera
            let currentScene = this.character.parent;
            while (currentScene) {
                if (currentScene.cameraController) {
                    currentScene.cameraController.setFollowTarget(this.character);
                    break;
                }
                currentScene = currentScene.parent;
            }
        }
    }

    updateMovement() {
        // Resetar direção de movimento
        this.moveDirection.set(0, 0, 0);

        // Calcular direção baseada na câmera
        const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
        
        // Corrigir vetor direita/esquerda - estava invertido
        const cameraRight = new THREE.Vector3(
            -cameraDirection.z, // Invertido o sinal
            0,
            cameraDirection.x // Invertido x/z
        ).normalize();
        
        const cameraForward = new THREE.Vector3(
            cameraDirection.x,
            0,
            cameraDirection.z
        ).normalize();

        // Aplicar movimento baseado nas teclas
        if (this.keys.w) this.moveDirection.add(cameraForward);
        if (this.keys.s) this.moveDirection.sub(cameraForward);
        if (this.keys.a) this.moveDirection.sub(cameraRight);
        if (this.keys.d) this.moveDirection.add(cameraRight);

        // Normalizar e aplicar velocidade
        if (this.moveDirection.lengthSq() > 0) {
            this.moveDirection.normalize();
            this.velocity.copy(this.moveDirection).multiplyScalar(this.moveSpeed);
            this.character.position.add(this.velocity);
            return true;
        }
        return false;
    }
}
