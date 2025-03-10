import { THREE } from './core/three.js';
import { BaseCameraController } from './core/baseCameraController.js';

export class CameraControllerGame extends BaseCameraController {
    constructor(camera, scene) {
        super(camera, scene);

        if (!camera) {
            console.error('❌ Câmera não fornecida ao CameraControllerGame');
            return;
        }

        // Configurações da câmera com valores padrão
        this.config = {
            // Posicionamento
            height: 10,         // Altura da câmera
            distance: 10,    // Distância do alvo
            angle: Math.PI / 4, // Ângulo da câmera (45 graus)
            
            // Suavização
            smoothness: {
                position: 0.1,  // Suavização do movimento
                rotation: 0.05,  // Suavização da rotação
                zoom: 0.1       // Suavização do zoom
            },

            // Limites
            limits: {
                minHeight: 5,
                maxHeight: 10,
                minDistance: 5,
                maxDistance: 10,
                minAngle: Math.PI / 6,  // 30 graus
                maxAngle: Math.PI / 3   // 60 graus
            },

            // Offset do alvo
            offset: {
                x: 0,
                y: 0.5, // Meio da altura do personagem
                z: 0
            },

            // Configurações do offset do mouse para isométrico
            mouseOffset: {
                enabled: true,
                maxOffset: 25,     // Distância máxima do offset (reduzida para isométrico)
                strength: 0.2,    // Força do efeito (0-1)
                smoothness: 0.05  // Suavização do movimento (mais suave para isométrico)
            },

            // Debug
            debugMode: true,

            // Controles de scroll
            scroll: {
                zoomSensitivity: 0.5,    // Sensibilidade do zoom
                invertZoom: false        // Inverter direção do zoom
            }
        };

        this.followTarget = null;
        this.setupCamera();
        
        // Adicionar variáveis para tracking do mouse
        this.mousePosition = new THREE.Vector2();
        this.targetOffset = new THREE.Vector3();
        this.currentOffset = new THREE.Vector3();
        
        // Inicializar tracking do mouse
        this.setupMouseTracking();
        
        // Debug info
        if (this.config.debugMode) {
            this.setupDebug();
        }
        
        console.log('✅ CameraControllerGame inicializado', this.config);
    }

    setupCamera() {
        this.camera.fov = 50;
        this.camera.near = 0.1;
        this.camera.far = 1000;
        this.camera.updateProjectionMatrix();
    }

    setFollowTarget(target) {
        this.followTarget = target;
        if (target) {
            // Posicionar câmera imediatamente
            this.updateCameraPosition();
            console.log('🎯 Câmera seguindo:', target.position.toArray());
        }
    }

    update() {
        if (this.followTarget) {
            this.updateCameraPosition();
        }
    }

    // Métodos para ajuste em tempo real
    adjustHeight(delta) {
        const newHeight = this.config.height + delta;
        this.config.height = THREE.MathUtils.clamp(
            newHeight,
            this.config.limits.minHeight,
            this.config.limits.maxHeight
        );
    }

    adjustDistance(delta) {
        const newDistance = this.config.distance + delta;
        this.config.distance = THREE.MathUtils.clamp(
            newDistance,
            this.config.limits.minDistance,
            this.config.limits.maxDistance
        );
    }

    adjustAngle(delta) {
        const newAngle = this.config.angle + delta;
        this.config.angle = THREE.MathUtils.clamp(
            newAngle,
            this.config.limits.minAngle,
            this.config.limits.maxAngle
        );
    }

    adjustSmoothness(type, value) {
        if (this.config.smoothness[type] !== undefined) {
            this.config.smoothness[type] = THREE.MathUtils.clamp(value, 0.01, 1);
        }
    }

    updateCameraPosition() {
        if (!this.camera || !this.followTarget) return;

        // Calcular posição base do alvo
        const targetPosition = new THREE.Vector3()
            .copy(this.followTarget.position)
            .add(new THREE.Vector3(
                this.config.offset.x,
                this.config.offset.y,
                this.config.offset.z
            ));

        // Adicionar offset do mouse mantendo perspectiva isométrica
        const mouseOffset = this.calculateMouseOffset();
        targetPosition.add(mouseOffset);

        // Calcular offset isométrico
        const angle = this.config.angle;
        const offsetX = Math.cos(angle) * this.config.distance;
        const offsetZ = Math.sin(angle) * this.config.distance;

        // Calcular nova posição da câmera
        const newPosition = new THREE.Vector3(
            targetPosition.x - offsetX,
            targetPosition.y + this.config.height,
            targetPosition.z - offsetZ
        );

        // Aplicar suavização
        this.camera.position.lerp(newPosition, this.config.smoothness.position);
        
        // Atualizar alvo da câmera mantendo a perspectiva isométrica
        this.camera.lookAt(targetPosition);
        this.camera.updateMatrixWorld(true);

        if (this.config.debugMode) {
            this.updateDebugInfo();
        }
    }

    setInitialPosition(gridWidth, gridHeight) {
        const cellSize = 4;
        const centerX = (gridWidth * cellSize) / 2;
        const centerZ = (gridHeight * cellSize) / 2;

        // Configurar posição da câmera
        const angle = this.config.angle;
        const offsetX = Math.cos(angle) * this.config.distance;
        const offsetZ = Math.sin(angle) * this.config.distance;

        this.camera.position.set(
            centerX - offsetX,
            this.config.height,
            centerZ - offsetZ
        );

        // Apontar para o centro
        this.camera.lookAt(new THREE.Vector3(centerX, 0, centerZ));
        this.camera.updateMatrixWorld(true);
        
        console.log('📸 Câmera posicionada:', {
            position: this.camera.position.toArray(),
            target: [centerX, 0, centerZ]
        });
    }

    setCameraDefaults(height, distance, angle) {
        this.config.height = height || this.config.height;
        this.config.distance = distance || this.config.distance;
        this.config.angle = angle || this.config.angle;
        
        if (this.camera) {
            this.camera.updateProjectionMatrix();
        }
    }

    setupDebug() {
        this.debugHelper = new THREE.Group();
        this.scene.add(this.debugHelper);
        
        // Criar linhas de debug
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        this.debugLines = new THREE.LineSegments(
            new THREE.BufferGeometry(),
            material
        );
        this.debugHelper.add(this.debugLines);
    }

    updateDebugInfo() {
        if (!this.config.debugMode || !this.followTarget) return;

        console.debug('🎥 Camera Info:', {
            position: this.camera.position.toArray(),
            target: this.followTarget.position.toArray(),
            config: this.config
        });
    }

    setupMouseTracking() {
        document.addEventListener('mousemove', (e) => {
            // Converter para coordenadas normalizadas (-1 a 1)
            this.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mousePosition.y = -((e.clientY / window.innerHeight) * 2 - 1);
        });

        // Adicionar listener para o scroll (apenas zoom)
        document.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY * this.config.scroll.zoomSensitivity;
            this.adjustDistance(this.config.scroll.invertZoom ? -zoomDelta : zoomDelta);
        }, { passive: false });
    }

    calculateMouseOffset() {
        if (!this.config.mouseOffset.enabled) return new THREE.Vector3();

        // Calcular offset mantendo proporções isométricas
        const isoMatrix = new THREE.Matrix4().makeRotationY(this.config.angle);
        
        // Criar vetor de offset base
        const offsetX = this.mousePosition.x * -this.config.mouseOffset.maxOffset;
        const offsetZ = this.mousePosition.y * this.config.mouseOffset.maxOffset;
        
        // Aplicar offset na direção correta considerando rotação isométrica
        const worldOffset = new THREE.Vector3(offsetX, 0, offsetZ);
        worldOffset.applyMatrix4(isoMatrix);
        
        // Atualizar offset alvo
        this.targetOffset.copy(worldOffset).multiplyScalar(this.config.mouseOffset.strength);

        // Suavizar transição do offset
        this.currentOffset.lerp(this.targetOffset, this.config.mouseOffset.smoothness);

        return this.currentOffset;
    }

    // Adicionar métodos para controle do offset
    setMouseOffsetEnabled(enabled) {
        this.config.mouseOffset.enabled = enabled;
    }

    adjustMouseOffset(params) {
        Object.assign(this.config.mouseOffset, params);
    }
}
