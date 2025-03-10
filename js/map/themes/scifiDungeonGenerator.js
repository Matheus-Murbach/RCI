import { THREE } from '../../core/three.js';
import { MaterialSystem } from '../../core/materialSystem.js';
import { LODController } from '../../LODController.js';

export class ScifiDungeonGenerator {
    constructor(scene) {
        this.scene = scene;
        this.materialSystem = MaterialSystem.getInstance();
        this.animationFrames = new Set();
        this.lights = new Set();
        this.lastUpdate = 0;
        
        this.cellSize = 4;
        this.wallHeight = 4;
        
        // Configurações de luz
        this.lightConfig = {
            color: 0x66ccff,
            intensity: 80,     // Aumentado
            range: 20,        // Aumentado
            height: 0.8,      
            spacing: 4,       // Reduzido para mais luzes
            flickerChance: 0.3,
            ambient: 50,
            shadowMapSize: 512,  // Novo: tamanho do shadowMap
            shadowBias: -0.001   // Novo: bias para sombras mais suaves
        };

        // Configurações de luz ambiente
        this.ambientConfig = {
            color: 0x404060,    // Azulado suave
            intensity: 100      // 40% de intensidade base
        };

        // Criar luz ambiente
        this.ambientLight = new THREE.AmbientLight(
            this.ambientConfig.color,
            this.ambientConfig.intensity
        );

        // Ajustar materiais para melhor interação com luz
        this.materials = {
            wall: new THREE.MeshStandardMaterial({
                color: 0x2B4C7E,
                roughness: 0.8,
                metalness: 0.2,
                emissive: 0x000000
            }),
            floor: new THREE.MeshStandardMaterial({
                color: 0x1A1A1A,
                roughness: 0.9,
                metalness: 0.1,
                emissive: 0x000000
            }),
            ceiling: new THREE.MeshStandardMaterial({
                color: 0x1C2833,
                roughness: 0.7,
                metalness: 0.2,
                emissive: 0x000000
            })
        };

        // Adicionar material para debug das luzes
        this.debugMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true
        });

        // Adicionar materiais para debug visual
        this.debugMaterials = {
            lightSource: new THREE.MeshBasicMaterial({
                color: 0xff0000, // Vermelho mais visível
                transparent: true,
                opacity: 0.8,    // Aumentar opacidade
                depthTest: false // Garantir que fique visível
            }),
            lightRange: new THREE.MeshBasicMaterial({
                color: 0x00ff00, // Verde mais visível
                wireframe: true,
                transparent: true,
                opacity: 0.3,    // Aumentar opacidade
                depthTest: false
            })
        };

        this.debugMode = true; // Novo: ativar debug por padrão

        this.findCamera();
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
            this.scene.background = new THREE.Color(0x000010);
            
            // Adicionar luz ambiente
            this.scene.add(this.ambientLight);
            
            // Criar estrutura básica
            this.createBaseStructure(grid);
            
            // Criar névoa
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

        // Novo sistema de posicionamento de luzes
        this.placeLights(grid, cellSize, wallHeight);
    }

    placeLights(grid, cellSize, wallHeight) {
        const spacing = this.lightConfig.spacing;
        
        for (let z = 0; z < grid.length; z++) {
            for (let x = 0; x < grid[z].length; x++) {
                // Colocar luzes apenas em intervalos regulares onde há células válidas
                if ((x % spacing === 0 || z % spacing === 0) && 
                    this.isValidCell(grid, x, z)) {
                    
                    // Verificar células adjacentes para melhor posicionamento
                    const hasNeighbors = this.countNeighbors(grid, x, z) >= 2;
                    
                    if (hasNeighbors) {
                        const pos = new THREE.Vector3(
                            x * cellSize + cellSize/2,
                            0,
                            z * cellSize + cellSize/2
                        );
                        this.createLight(pos, wallHeight);
                    }
                }
            }
        }
    }

    countNeighbors(grid, x, z) {
        const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
        return dirs.reduce((count, [dx, dz]) => {
            return count + (this.isValidCell(grid, x + dx, z + dz) ? 1 : 0);
        }, 0);
    }

    isValidCell(grid, x, z) {
        return grid[z] && 
               grid[z][x] && 
               grid[z][x].type !== 'empty' && 
               grid[z][x].type !== undefined;
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

        // Criar paredes
        if (z === 0 || !grid[z-1] || grid[z-1][x].type === 'empty') {
            const wallNorth = new THREE.Mesh(
                new THREE.BoxGeometry(cellSize, wallHeight, 0.2),
                this.materials.wall
            );
            wallNorth.position.copy(pos).add(new THREE.Vector3(0, wallHeight/2, -cellSize/2));
            this.scene.add(wallNorth);
        }

        if (z === grid.length-1 || !grid[z+1] || grid[z+1][x].type === 'empty') {
            const wallSouth = new THREE.Mesh(
                new THREE.BoxGeometry(cellSize, wallHeight, 0.2),
                this.materials.wall
            );
            wallSouth.position.copy(pos).add(new THREE.Vector3(0, wallHeight/2, cellSize/2));
            this.scene.add(wallSouth);
        }

        if (x === 0 || !grid[z][x-1] || grid[z][x-1].type === 'empty') {
            const wallWest = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, wallHeight, cellSize),
                this.materials.wall
            );
            wallWest.position.copy(pos).add(new THREE.Vector3(-cellSize/2, wallHeight/2, 0));
            this.scene.add(wallWest);
        }

        if (x === grid[z].length-1 || !grid[z][x+1] || grid[z][x+1].type === 'empty') {
            const wallEast = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, wallHeight, cellSize),
                this.materials.wall
            );
            wallEast.position.copy(pos).add(new THREE.Vector3(cellSize/2, wallHeight/2, 0));
            this.scene.add(wallEast);
        }
    }

    getLightState() {
        const rand = Math.random();
        // 40% perfect | 40% failing | 20% broken
        if (rand > 0.8) return 'broken';
        if (rand > 0.4) return 'failing';
        return 'perfect';
    }

    createLight(position, wallHeight) {
        if (!this.scene || !this.lodController) return;

        const chunkX = Math.floor(position.x / this.lodController.chunkSize);
        const chunkZ = Math.floor(position.z / this.lodController.chunkSize);
        
        const chunk = this.lodController.getChunk(chunkX, chunkZ);
        if (chunk && chunk.lights.size >= this.lodController.maxLightsPerChunk) return;

        // Criar luz com sombras
        const light = new THREE.PointLight(
            this.lightConfig.color,
            this.lightConfig.intensity,
            this.lightConfig.range,
            2  // Decay quadrático
        );

        light.position.copy(position).add(
            new THREE.Vector3(0, wallHeight * this.lightConfig.height, 0)
        );

        // Configurar sombras
        light.castShadow = true;
        light.shadow.mapSize.width = this.lightConfig.shadowMapSize;
        light.shadow.mapSize.height = this.lightConfig.shadowMapSize;
        light.shadow.bias = this.lightConfig.shadowBias;

        // Otimizar near/far plane
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = this.lightConfig.range;

        // Configurar comportamento da luz
        light.userData = {
            flicker: Math.random() < this.lightConfig.flickerChance,
            baseIntensity: this.lightConfig.intensity,
            flickerSpeed: 0.1 + Math.random() * 0.2,
            minIntensity: this.lightConfig.intensity * 0.7,  // Aumentado mínimo
            maxIntensity: this.lightConfig.intensity * 1.3,  // Aumentado máximo
            flickerPhase: Math.random() * Math.PI * 2  // Novo: fase aleatória
        };

        this.scene.add(light);
        this.lights.add(light);
        this.lodController.addLight(light, chunkX, chunkZ);

        // Sempre criar os visuais de debug, mas controlar visibilidade
        this.createDebugVisuals(light, position);

        return light;
    }

    update() {
        try {
            const time = Date.now() * 0.001;
            
            this.lights.forEach(light => {
                if (!light?.userData?.flicker) return;

                // Sistema de flicker melhorado
                const flicker = Math.sin(
                    (time * light.userData.flickerSpeed) + 
                    light.userData.flickerPhase
                ) * 0.3;

                const noise = (Math.random() - 0.5) * 0.1;  // Adiciona ruído sutil
                
                light.intensity = THREE.MathUtils.clamp(
                    light.userData.baseIntensity * (1.0 + flicker + noise),
                    light.userData.minIntensity,
                    light.userData.maxIntensity
                );
            });

            return true;
        } catch (error) {
            console.error('❌ Erro na atualização das luzes:', error);
            return false;
        }
    }

    // Novo método para criar visuais de debug
    createDebugVisuals(light, position) {
        // 1. Esfera para marcar posição da luz (maior e mais visível)
        const lightMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8), // Aumentado tamanho
            this.debugMaterials.lightSource
        );
        lightMarker.position.copy(light.position);
        lightMarker.userData.isDebugObject = true;
        lightMarker.visible = this.debugMode;
        this.scene.add(lightMarker);

        // 2. Círculo no chão mais visível
        const groundMarker = new THREE.Mesh(
            new THREE.CircleGeometry(this.lightConfig.range, 32), // Mais segmentos
            this.debugMaterials.lightRange
        );
        groundMarker.rotation.x = -Math.PI / 2;
        groundMarker.position.set(position.x, 0.05, position.z); // Mais próximo do chão
        groundMarker.userData.isDebugObject = true;
        groundMarker.visible = this.debugMode;
        this.scene.add(groundMarker);

        // 3. Linha de conexão mais grossa
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            light.position,
            new THREE.Vector3(position.x, 0.05, position.z)
        ]);
        const line = new THREE.Line(
            lineGeometry,
            new THREE.LineBasicMaterial({ 
                color: 0xffff00, 
                opacity: 0.8, 
                transparent: true,
                linewidth: 2 // Linha mais grossa (note que nem todos browsers suportam)
            })
        );
        line.userData.isDebugObject = true;
        line.visible = this.debugMode;
        this.scene.add(line);

        return { lightMarker, groundMarker, line };
    }

    // Novo método para alternar modo debug
    toggleDebug(enabled) {
        this.debugMode = enabled;
        this.scene.traverse(object => {
            if (object.userData.isDebugObject) {
                object.visible = enabled;
            }
        });
    }

    // Novo método para ajustar intensidade da luz ambiente
    setAmbientIntensity(intensity) {
        this.ambientLight.intensity = intensity;
    }

    dispose() {
        this.animationFrames.forEach(id => cancelAnimationFrame(id));
        this.animationFrames.clear();
        
        Object.values(this.materials).forEach(material => {
            if (material.dispose) {
                material.dispose();
            }
        });

        this.lights.forEach(light => {
            this.scene.remove(light);
            light.dispose();
        });
        this.lights.clear();

        // Remover luz ambiente
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
        }

        // Remover marcadores de debug
        this.scene.traverse(object => {
            if (object.userData.isLightMarker) {
                this.scene.remove(object);
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            }
        });

        // Atualizar remoção de objetos de debug
        this.scene.traverse(object => {
            if (object.userData.isDebugObject) {
                this.scene.remove(object);
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            }
        });
    }

    createFog() {
        // Ajustar névoa para ser mais densa e escura
        const fog = new THREE.Fog(0x000000, 1, 20);
        this.scene.fog = fog;
    }
}
