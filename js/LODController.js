class LODController {
    constructor(camera) {
        this.camera = camera;
        this.objects = new Map(); // Mapa de objetos gerenciados
        this.lodLevels = [
            { distance: 10, detail: 1.0 },    // Alta qualidade
            { distance: 50, detail: 0.75 },   // Média-alta qualidade
            { distance: 100, detail: 0.5 },   // Média qualidade
            { distance: 200, detail: 0.25 },  // Baixa qualidade
            { distance: 500, detail: 0.1 }    // Muito baixa qualidade
        ];
    }

    // Registra um objeto para ser gerenciado pelo LOD
    addObject(object, options = {}) {
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

        this.objects.set(object, {
            originalScale: object.scale.clone(),
            options: finalOptions
        });
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
        this.objects.forEach((data, object) => {
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
}

// Exportar a classe
window.LODController = LODController;
