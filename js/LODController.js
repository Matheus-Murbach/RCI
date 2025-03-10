import { THREE } from './core/three.js'; // Ajustado o caminho da importação

export class LODController {
    static instance = null;
    
    constructor(camera) {
        if (LODController.instance) {
            return LODController.instance;
        }

        // Verificação mais robusta da câmera
        if (!camera || !(camera instanceof THREE.Camera)) {
            console.error('⚠️ LODController precisa de uma câmera THREE.js válida');
            return;
        }

        console.log('🎮 Inicializando LODController com câmera:', camera);
        this.camera = camera;
        this.objects = new Map(); // Mapa de objetos gerenciados
        this.lodLevels = [
            { distance: 10, detail: 1.0 },    // Alta qualidade
            { distance: 50, detail: 0.75 },   // Média-alta qualidade
            { distance: 100, detail: 0.5 },   // Média qualidade
            { distance: 200, detail: 0.25 },  // Baixa qualidade
            { distance: 500, detail: 0.1 }    // Muito baixa qualidade
        ];
        LODController.instance = this;

        // Adicionar gestão de chunks e luzes
        this.chunks = new Map(); 
        this.lights = new Map(); 
        this.chunkSize = 12;         // Reduzido para chunks menores
        this.visibilityRange = 100;  // Aumentado significativamente
        this.maxLightsPerChunk = 8;  // Aumentado número de luzes por chunk
        
        // Configurações de culling
        this.frustum = new THREE.Frustum();
        this.cameraViewProjectionMatrix = new THREE.Matrix4();

        return this;
    }

    static getInstance() {
        if (!LODController.instance) {
            console.warn('LODController não foi inicializado ainda. Use initialize() primeiro.');
        }
        return LODController.instance;
    }

    static initialize(camera) {
        if (!camera || !(camera instanceof THREE.Camera)) {
            console.error('⚠️ Camera THREE.js válida é necessária para inicializar LODController');
            return null;
        }

        if (!LODController.instance) {
            const controller = new LODController(camera);
            if (controller && controller.camera) {
                console.log('✅ LODController inicializado com sucesso');
                return controller;
            }
        }
        
        return LODController.instance;
    }

    // Novo método para adicionar objetos da dungeon
    addDungeonObject(object, type = 'wall') {
        const lodConfigs = {
            wall: {
                minScale: 0.5,
                maxScale: 1.0,
                minDetail: 0.3,
                maxDetail: 1.0,
                enableGeometryLOD: true,
                enableMaterialLOD: true,
                customLODLevels: [
                    { distance: 10, detail: 1.0 },
                    { distance: 20, detail: 0.75 },
                    { distance: 30, detail: 0.5 },
                    { distance: 40, detail: 0.25 }
                ]
            },
            duct: {
                minScale: 0.3,
                maxScale: 1.0,
                minDetail: 0.2,
                maxDetail: 1.0,
                enableGeometryLOD: true,
                customLODLevels: [
                    { distance: 5, detail: 1.0 },
                    { distance: 15, detail: 0.5 },
                    { distance: 25, detail: 0.2 }
                ]
            }
        };

        this.addObject(object, lodConfigs[type]);
    }

    // Registra um objeto para ser gerenciado pelo LOD
    addObject(object, options = {}) {
        // Verificações de segurança
        if (!object || !object.isMesh) {
            console.warn('LODController: Objeto inválido ignorado');
            return;
        }

        if (!object.geometry || !object.material) {
            console.warn('LODController: Objeto sem geometria ou material ignorado');
            return;
        }

        const defaultOptions = {
            minScale: 0.1,           // Escala mínima do objeto
            maxScale: 1.0,           // Escala máxima do objeto
            minDetail: 0.1,          // Nível mínimo de detalhe (0.1 = 10%)
            maxDetail: 1.0,          // Nível máximo de detalhe (1.0 = 100%)
            enableGeometryLOD: true, // Habilita LOD na geometria
            enableMaterialLOD: true, // Habilita LOD nos materiais
            customLODLevels: null    // Níveis de LOD personalizados
        };

        const finalOptions = { ...defaultOptions, ...options };

        // Armazena a geometria original se for uma mesh
        if (object.isMesh) {
            object.userData.originalGeometry = object.geometry.clone();
            object.userData.vertexCount = object.geometry.attributes.position.count;
        }

        // Armazena as configurações de material original
        if (object.material) {
            object.userData.originalMaterial = {
                wireframe: object.material.wireframe,
                flatShading: object.material.flatShading,
                roughness: object.material.roughness,
                metalness: object.material.metalness
            };
        }

        try {
            this.objects.set(object, {
                originalScale: object.scale.clone(),
                options: finalOptions
            });
        } catch (error) {
            console.error('Erro ao adicionar objeto ao LOD:', error);
        }
    }

    removeObject(object) {
        // Restaura a geometria original se existir
        if (object.userData.originalGeometry) {
            object.geometry.dispose();
            object.geometry = object.userData.originalGeometry;
        }

        // Restaura as configurações originais do material
        if (object.userData.originalMaterial) {
            Object.assign(object.material, object.userData.originalMaterial);
        }

        this.objects.delete(object);
    }

    update() {
        if (!this.camera) {
            console.warn('⚠️ LODController sem câmera válida');
            return;
        }

        // Atualizar chunks e visibilidade
        this.updateChunks();

        this.objects.forEach((data, object) => {
            if (!object || !object.position) return;
            
            // Verificar se objeto está no frustum
            object.visible = this.frustum.containsPoint(object.position);
            if (!object.visible) return;

            const distance = this.camera.position.distanceTo(object.position);
            this.updateObjectLOD(object, distance, data);
        });
    }

    updateObjectLOD(object, distance, data) {
        const { options } = data;
        const lodLevels = options.customLODLevels || this.lodLevels;

        // Encontra o nível de LOD apropriado
        let currentLevel = lodLevels[0];
        for (const level of lodLevels) {
            if (distance > level.distance) {
                currentLevel = level;
            } else {
                break;
            }
        }

        // Calcula o fator de detalhe baseado na distância
        const detailFactor = Math.max(
            options.minDetail,
            Math.min(options.maxDetail, currentLevel.detail)
        );

        // Atualiza a geometria se necessário
        if (options.enableGeometryLOD && object.isMesh) {
            this.updateGeometryLOD(object, detailFactor);
        }

        // Atualiza o material se necessário
        if (options.enableMaterialLOD && object.material) {
            this.updateMaterialLOD(object, detailFactor);
        }

        // Atualiza a escala
        const scale = this.calculateScale(distance, options);
        object.scale.setScalar(scale);
    }

    updateGeometryLOD(object, detailFactor) {
        const originalVertexCount = object.userData.vertexCount;
        if (!originalVertexCount) return;

        // Só atualiza se a diferença for significativa (> 5%)
        const targetVertexCount = Math.floor(originalVertexCount * detailFactor);
        const currentVertexCount = object.geometry.attributes.position.count;
        
        if (Math.abs(currentVertexCount - targetVertexCount) / originalVertexCount > 0.05) {
            this.simplifyGeometry(object, detailFactor);
        }
    }

    simplifyGeometry(object, detailFactor) {
        const originalGeometry = object.userData.originalGeometry;
        if (!originalGeometry) return;

        // Simplificação básica por decimação de vértices
        if (object.geometry.isBufferGeometry) {
            const positions = originalGeometry.attributes.position.array;
            const stride = 3;
            const totalVertices = positions.length / stride;
            const targetVertices = Math.max(4, Math.floor(totalVertices * detailFactor));
            
            // Cria nova geometria simplificada
            const newPositions = new Float32Array(targetVertices * stride);
            const step = Math.max(1, Math.floor(totalVertices / targetVertices));
            
            for (let i = 0, j = 0; i < targetVertices; i++, j += step) {
                if (j >= totalVertices) j = totalVertices - 1;
                newPositions[i * stride] = positions[j * stride];
                newPositions[i * stride + 1] = positions[j * stride + 1];
                newPositions[i * stride + 2] = positions[j * stride + 2];
            }

            object.geometry.setAttribute('position', 
                new THREE.BufferAttribute(newPositions, 3));
        }
    }

    updateMaterialLOD(object, detailFactor) {
        const material = object.material;
        if (!material) return;

        // Ajusta qualidade do material baseado no detailFactor
        material.wireframe = detailFactor < 0.3;
        material.flatShading = detailFactor < 0.5;
        
        if (material.roughness !== undefined) {
            material.roughness = Math.min(1, 1.5 - detailFactor);
        }
        
        if (material.metalness !== undefined) {
            material.metalness = detailFactor;
        }

        material.needsUpdate = true;
    }

    calculateScale(distance, options) {
        const { minScale, maxScale } = options;
        const scaleFactor = 1 / (1 + distance * 0.01);
        return Math.max(minScale, Math.min(maxScale, scaleFactor));
    }

    // Novo método para gerenciar chunks
    updateChunks() {
        if (!this.camera) return;

        this.cameraViewProjectionMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);

        this.chunks.forEach((chunk, key) => {
            // Criar ponto central do chunk
            const chunkCenter = new THREE.Vector3(
                chunk.x * this.chunkSize + this.chunkSize/2,
                0,
                chunk.z * this.chunkSize + this.chunkSize/2
            );
            
            // Verificar se está dentro do frustum e do range
            const distance = this.camera.position.distanceTo(chunkCenter);
            const isInRange = distance <= this.visibilityRange;
            const isInFrustum = this.frustum.containsPoint(chunkCenter);
            
            this.setChunkVisibility(chunk, isInRange && isInFrustum);
        });
    }

    // Novo método para adicionar luz ao sistema LOD
    addLight(light, chunkX, chunkZ) {
        try {
            const chunk = this.getChunk(chunkX, chunkZ);
            
            if (chunk.lights.size >= this.maxLightsPerChunk) {
                return false;
            }

            chunk.lights.add(light);
            this.lights.set(light, { chunk: `${chunkX},${chunkZ}` });
            
            const distance = this.getChunkDistance(chunk);
            light.visible = distance <= this.visibilityRange / this.chunkSize;

            return true;

        } catch (error) {
            console.error('❌ Erro ao adicionar luz:', error);
            return false;
        }
    }

    getChunkDistance(chunk) {
        if (!this.camera) return Infinity;
        
        // Calcular centro do chunk
        const chunkCenterX = (chunk.x * this.chunkSize) + (this.chunkSize / 2);
        const chunkCenterZ = (chunk.z * this.chunkSize) + (this.chunkSize / 2);
        
        // Usar distância real da câmera ao centro do chunk
        return Math.sqrt(
            Math.pow(this.camera.position.x - chunkCenterX, 2) + 
            Math.pow(this.camera.position.z - chunkCenterZ, 2)
        );
    }

    // Otimizar luzes dentro de um chunk
    optimizeLightsInChunk(chunk) {
        const lights = Array.from(chunk.lights);
        lights.sort((a, b) => b.intensity - a.intensity);

        // Manter apenas as luzes mais intensas
        for (let i = this.maxLightsPerChunk; i < lights.length; i++) {
            const light = lights[i];
            light.visible = false;
            chunk.lights.delete(light);
        }
    }

    // Gerenciar visibilidade do chunk
    setChunkVisibility(chunk, isVisible) {
        if (chunk.isActive === isVisible) return;
        
        chunk.isActive = isVisible;
        const distance = this.getChunkDistance(chunk);
        
        chunk.lights.forEach(light => {
            // Garante que luzes próximas sempre fiquem visíveis
            light.visible = distance <= this.visibilityRange;
            
            // Ajusta intensidade baseado na distância
            if (light.visible) {
                const falloff = 1 - Math.min(1, distance / this.visibilityRange);
                light.intensity = light.userData.baseIntensity * (falloff * 0.5 + 0.5);
            }
        });

        chunk.objects.forEach(object => {
            object.visible = isVisible;
        });
    }

    getChunk(x, z) {
        const key = `${x},${z}`;
        if (!this.chunks.has(key)) {
            this.chunks.set(key, {
                lights: new Set(),
                objects: new Set(),
                isActive: false,
                x: x,
                z: z
            });
        }
        return this.chunks.get(key);
    }
}
