import { THREE } from '../../core/three.js';
import { MaterialSystem } from '../../core/materialSystem.js';
import { LODController } from '../../LODController.js';

export class ScifiDungeonGenerator {
    constructor(scene) {
        this.scene = scene;
        this.materialSystem = MaterialSystem.getInstance();
        
        this.cellSize = 4;
        this.wallHeight = 4;

        // Configurações de luz ambiente - aumentada para compensar falta de outras luzes
        this.ambientConfig = {
            color: 0xffffff,    // Azulado mais claro
            intensity: 0.3,     // Aumentado de 0.01 para 0.3
            flickerSpeed: 0.001,
            flickerIntensity: 0.001,
            minIntensity: 0.02,  // Aumentado de 0.01 para 0.2
            maxIntensity: 0.4,  // Aumentado de 0.1 para 0.4
            lastUpdate: 0
        };

        // Criar luz ambiente
        this.ambientLight = new THREE.AmbientLight(
            this.ambientConfig.color,
            this.ambientConfig.intensity
        );

        // Adicionar sistema de flicker
        this.flickerNoise = [];
        this.generateFlickerNoise();

        // Ajustar materiais para melhor visibilidade com apenas luz ambiente
        this.materials = {
            wall: [
                new THREE.MeshStandardMaterial({
                    color: 0x4466aa,
                    roughness: 0.5,  // Reduzido para refletir mais luz
                    metalness: 0.3,  // Aumentado para mais reflexão
                    emissive: 0x000000,
                    side: THREE.FrontSide,
                    transparent: true,
                    opacity: 0.25
                }),
                new THREE.MeshStandardMaterial({
                    color: 0x4466aa,
                    roughness: 0.5,  // Reduzido para refletir mais luz
                    metalness: 0.3,  // Aumentado para mais reflexão
                    emissive: 0x112233,
                    emissiveIntensity: 0.2,
                    side: THREE.BackSide
                })
            ],
            floor: new THREE.MeshStandardMaterial({
                color: 0x333344,
                roughness: 0.4,     // Reduzido para mais reflexão
                metalness: 0.5,     // Aumentado para mais brilho
                emissive: 0x111122,
                emissiveIntensity: 0.1
            }),
            ceiling: new THREE.MeshStandardMaterial({
                color: 0x333344,
                roughness: 0.4,     // Reduzido para mais reflexão
                metalness: 0.5,     // Aumentado para mais brilho
                emissive: 0x111122,
                emissiveIntensity: 0.1
            })
        };

        // Remover sistemas de luz desnecessários
        this.debugMode = false;
    }

    findCamera() {
        // Buscar câmera na cena e suas subárvores
        let camera = null;
        this.scene.traverse(obj => {
            if (obj.type === 'PerspectiveCamera' || obj.type === 'OrthographicCamera') {
                camera = obj;
            }
        });

        if (camera) {
            console.log('📸 Camera encontrada:', camera.type);
            this.camera = camera;
            this.lodController = LODController.initialize(camera);
        } else {
            console.warn('⚠️ Câmera não encontrada - LOD desativado');
        }
    }

    createWallMaterial() {
        return this.materialSystem.createEnvironmentMaterial(0x2B4C7E, {
            roughness: 0.7,
            metalness: 0.8
        });
    }

    createFloorMaterial() {
        return this.materialSystem.createEnvironmentMaterial(0x1A1A1A, {
            roughness: 0.4,
            metalness: 0.9
        });
    }

    createCeilingMaterial() {
        return this.materialSystem.createEnvironmentMaterial(0x1C2833, {
            roughness: 0.5,
            metalness: 0.7
        });
    }

    createDoorMaterial() {
        return this.materialSystem.createEnvironmentMaterial(0x4A90E2, {
            roughness: 0.2,
            metalness: 0.9
        });
    }

    createDetailsMaterial() {
        return this.materialSystem.createEnvironmentMaterial(0xE74C3C, {
            roughness: 0.3,
            metalness: 1.0
        });
    }

    generateFromGrid(grid) {
        if (!this.scene) {
            console.error('❌ Cena não inicializada');
            return false;
        }

        try {
            // Configurar cena
            this.scene.background = new THREE.Color(0x000000);
            
            // Adicionar apenas luz ambiente
            this.scene.add(this.ambientLight);
            
            // Criar estrutura básica
            this.createBaseStructure(grid);
            
            // Configurar névoa mais clara e distante
            this.createFog();
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao gerar mapa:', error);
            return false;
        }
    }

    createBaseStructure(grid) {
        const cellSize = 4;
        const wallHeight = 4;
        this.cellSize = cellSize; // Armazenar para uso em outras funções
        
        // Criar estrutura básica
        grid.forEach((row, z) => {
            row.forEach((cell, x) => {
                if (cell.type === 'empty') return;

                const pos = new THREE.Vector3(x * cellSize, 0, z * cellSize);

                // Criar chão e paredes
                this.createFloorAndWalls(cell, pos, x, z, grid, cellSize, wallHeight);
            });
        });
    }

    createFloorAndWalls(cell, pos, x, z, grid, cellSize, wallHeight) {
        // Criar chão
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(cellSize, cellSize),
            this.materials.floor
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.copy(pos);
        this.scene.add(floor);

        // Função auxiliar para criar parede dupla
        const createDualWall = (position, rotation) => {
            // Parede externa
            const outerWall = new THREE.Mesh(
                new THREE.PlaneGeometry(cellSize, wallHeight),
                this.materials.wall[0]
            );
            outerWall.position.copy(position);
            outerWall.rotation.y = rotation;
            outerWall.userData.type = 'wall'; // Adicionar tipo
            
            // Parede interna
            const innerWall = new THREE.Mesh(
                new THREE.PlaneGeometry(cellSize, wallHeight),
                this.materials.wall[1]
            );
            innerWall.position.copy(position);
            innerWall.rotation.y = rotation;
            innerWall.userData.type = 'wall'; // Adicionar tipo
            
            this.scene.add(outerWall);
            this.scene.add(innerWall);
        };

        // Criar paredes como planos duplos
        if (z === 0 || !grid[z-1] || grid[z-1][x].type === 'empty') {
            createDualWall(
                pos.clone().add(new THREE.Vector3(0, wallHeight/2, -cellSize/2)),
                Math.PI
            );
        }

        if (z === grid.length-1 || !grid[z+1] || grid[z+1][x].type === 'empty') {
            createDualWall(
                pos.clone().add(new THREE.Vector3(0, wallHeight/2, cellSize/2)),
                0
            );
        }

        if (x === 0 || !grid[z][x-1] || grid[z][x-1].type === 'empty') {
            createDualWall(
                pos.clone().add(new THREE.Vector3(-cellSize/2, wallHeight/2, 0)),
                -Math.PI/2
            );
        }

        if (x === grid[z].length-1 || !grid[z][x+1] || grid[z][x+1].type === 'empty') {
            createDualWall(
                pos.clone().add(new THREE.Vector3(cellSize/2, wallHeight/2, 0)),
                Math.PI/2
            );
        }
    }

    createFog() {
        // Ajustar névoa para ser menos densa e mais clara
        const fog = new THREE.Fog(0x000033, 10, 100); // Aumentado start e end, cor mais clara
        this.scene.fog = fog;
    }

    generateFlickerNoise() {
        // Gerar 1000 valores de ruído para criar um padrão de flickering
        for (let i = 0; i < 1000; i++) {
            this.flickerNoise.push(Math.random());
        }
    }

    update() {
        if (!this.ambientLight) return;
        
        const time = performance.now() * this.ambientConfig.flickerSpeed;
        const noiseIndex = Math.floor(time % this.flickerNoise.length);
        const noise = this.flickerNoise[noiseIndex];
        
        // Adicionar variação aleatória ocasional
        const randomFlicker = Math.random() > 0.95 ? Math.random() * 0.4 : 0;
        
        // Calcular nova intensidade
        const baseIntensity = this.ambientConfig.minIntensity + 
            (noise * (this.ambientConfig.maxIntensity - this.ambientConfig.minIntensity));
        
        // Aplicar flickering
        this.ambientLight.intensity = baseIntensity + 
            (Math.sin(time) * this.ambientConfig.flickerIntensity) + randomFlicker;
    }

    dispose() {
        Object.values(this.materials).forEach(material => {
            if (material.dispose) {
                material.dispose();
            }
        });

        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
        }
    }
}
