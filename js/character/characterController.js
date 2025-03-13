import { THREE } from '../core/three.js';
import { CharacterSpotlight } from './characterSpotlight.js';

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
        
        // Sistema de física aprimorado
        this.physics = {
            acceleration: 0.003,     // Aceleração mais lenta
            deceleration: 0.04,      // Desaceleração mais suave
            maxSpeed: 0.12,          // Velocidade máxima reduzida
            currentSpeed: 0,
            turnSpeed: 0.1,
            inertia: 0.92,
            directionSmoothing: 0.1,
            rotationInertia: 0.85
        };

        // Sistema de colisão
        this.collisionSystem = {
            enabled: true,
            rayCount: 8,           // Número de raios
            rayLength: 0.6,        // Comprimento dos raios
            rayOffset: 0.5,        // Altura dos raios
            rays: []               // Array para guardar os raycasters
        };

        // Inicializar raios de colisão
        this.initCollisionRays();

        // Adicionar variável para rotação
        this.targetRotation = 0;

        // Sistema de movimento
        this.movement = {
            current: new THREE.Vector3(),
            target: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            lastDirection: new THREE.Vector3()
        };
        
        // Variáveis de interpolação
        this.lastPosition = character3D.position.clone();
        this.targetPosition = character3D.position.clone();
        this.positionLerpFactor = 0.15; // Fator de interpolação

        // Sistema de rotação
        this.rotation = {
            target: 0,
            current: 0,
            speed: 0.1
        };

        // Adicionar sistema de iluminação
        this.spotlight = new CharacterSpotlight(character3D.parent, character3D);

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
            case 's': this.keys.s = true; break; // Corrigido: era false
            case 'd': this.keys.d = true; break; // Corrigido: era false
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
        
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, targetPoint);

        // Calcular direção para o ponto
        const direction = new THREE.Vector3()
            .subVectors(targetPoint, this.character.position)
            .normalize();

        // Atualizar rotação alvo diretamente
        this.targetRotation = Math.atan2(direction.x, direction.z) + Math.PI / 2;
    }

    update() {
        if (!this.camera || !this.character) return;

        // Atualizar rotação com suavização
        const currentRotation = this.character.rotation.y;
        const angleDiff = ((this.targetRotation - currentRotation + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
        this.character.rotation.y += angleDiff * this.physics.turnSpeed;

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

        // Atualizar a luz do personagem
        if (this.spotlight) {
            this.spotlight.update(this.character.rotation.y);
        }
    }

    updateMovement() {
        // Calcular direção desejada
        const desiredDirection = new THREE.Vector3();
        const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
        
        // Vetores de direção da câmera
        const cameraForward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
        const cameraRight = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x).normalize();

        // Aplicar inputs com suavização
        if (this.keys.w) desiredDirection.add(cameraForward);
        if (this.keys.s) desiredDirection.sub(cameraForward);
        if (this.keys.a) desiredDirection.sub(cameraRight);
        if (this.keys.d) desiredDirection.add(cameraRight);

        // Normalizar direção se houver input
        if (desiredDirection.lengthSq() > 0) {
            desiredDirection.normalize();
            
            // Interpolar direção atual com direção desejada
            this.movement.target.lerp(desiredDirection, this.physics.directionSmoothing);
            
            // Aplicar aceleração gradual
            this.physics.currentSpeed += this.physics.acceleration;
            this.physics.currentSpeed = Math.min(this.physics.currentSpeed, this.physics.maxSpeed);
        } else {
            // Aplicar desaceleração com inércia
            this.physics.currentSpeed *= this.physics.inertia;
            
            // Parar completamente se muito lento
            if (this.physics.currentSpeed < 0.001) {
                this.physics.currentSpeed = 0;
            }
        }

        // Calcular movimento final
        this.movement.velocity
            .copy(this.movement.target)
            .multiplyScalar(this.physics.currentSpeed);

        // Aplicar inércia ao movimento
        this.movement.current.lerp(this.movement.velocity, 1 - this.physics.inertia);

        // Verificar se a próxima posição causará colisão
        const nextPosition = this.character.position.clone().add(this.movement.current);
        if (this.checkCollisions(nextPosition)) {
            // Se houver colisão, não mover
            this.physics.currentSpeed = 0;
            return false;
        }

        // Se não houver colisão, aplicar o movimento
        if (this.movement.current.lengthSq() > 0.00001) {
            this.character.position.add(this.movement.current);
            this.movement.lastDirection.copy(this.movement.current).normalize();
            return true;
        }

        return false;
    }

    initCollisionRays() {
        for (let i = 0; i < this.collisionSystem.rayCount; i++) {
            const angle = (i / this.collisionSystem.rayCount) * Math.PI * 2;
            const direction = new THREE.Vector3(
                Math.cos(angle),
                0,
                Math.sin(angle)
            );
            
            const raycaster = new THREE.Raycaster(
                new THREE.Vector3(),
                direction,
                0,
                this.collisionSystem.rayLength
            );
            
            this.collisionSystem.rays.push(raycaster);
        }
    }

    checkCollisions(position) {
        if (!this.collisionSystem.enabled) return false;

        // Obter todas as paredes da cena
        const walls = [];
        this.character.parent.traverse((node) => {
            if (node.userData.type === 'wall') {
                walls.push(node);
            }
        });

        // Verificar colisões com cada raio
        for (const raycaster of this.collisionSystem.rays) {
            raycaster.ray.origin.copy(position);
            raycaster.ray.origin.y += this.collisionSystem.rayOffset;

            const intersects = raycaster.intersectObjects(walls);
            if (intersects.length > 0) {
                return true; // Colisão detectada
            }
        }

        return false;
    }

    dispose() {
        if (this.spotlight) {
            this.spotlight.dispose();
        }
    }
}
