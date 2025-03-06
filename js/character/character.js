import { THREE } from '../core/three.js';
import { MaterialSystem } from '../core/materialSystem.js';

// Constantes globais para criação de personagem
export const CHARACTER_CONFIG = {
    defaults: {
        mainColor: '#FF0000',
        skinColor: '#FFA07A', 
        accentColor: '#000000',
        topRadius: 0.75,
        bottomRadius: 0.75,
        faceExpression: "'-'",
        name: '',
        equipment: {
            head: null,
            leftHand: null,
            rightHand: null,
            back: null
        }
    },
    validation: {
        faceExpression: {
            maxLength: 5,
            minLength: 1
        },
        radius: {
            min: 0.5,
            max: 1.0
        }
    }
};

export class Character {
    constructor(data = {}, isCreationMode = false) {
        console.log('🎭 Modo:', isCreationMode ? 'Criação' : 'Carregamento');
        console.log('📥 Dados recebidos:', data);
        
        // Em modo de criação, usar valores padrão
        const baseData = isCreationMode ? CHARACTER_CONFIG.defaults : {};
        
        // Garantir valores padrão para todos os campos
        const defaults = {
            id: null,
            user_id: null,
            name: '',
            mainColor: CHARACTER_CONFIG.defaults.mainColor,
            skinColor: CHARACTER_CONFIG.defaults.skinColor,
            accentColor: CHARACTER_CONFIG.defaults.accentColor,
            topRadius: CHARACTER_CONFIG.defaults.topRadius,
            bottomRadius: CHARACTER_CONFIG.defaults.bottomRadius,
            faceExpression: CHARACTER_CONFIG.defaults.faceExpression,
            equipment: CHARACTER_CONFIG.defaults.equipment,
            ...baseData
        };

        // Processar dados recebidos
        const processedData = this.processInputData(data, defaults, isCreationMode);
        
        // Atribuir valores processados
        this.id = processedData.id;
        this.userId = processedData.user_id;
        this.name = processedData.name;
        this.mainColor = processedData.mainColor;
        this.skinColor = processedData.skinColor;
        this.accentColor = processedData.accentColor;
        this.topRadius = processedData.topRadius;
        this.bottomRadius = processedData.bottomRadius;
        this.faceExpression = processedData.faceExpression;
        this.equipment = processedData.equipment;
        
        this.materialSystem = MaterialSystem.getInstance();
        this.character3D = null;
        
        console.log('✨ Personagem construído:', this);
    }

    processInputData(data, defaults, isCreationMode) {
        // Garantir que dados do banco tenham prioridade sobre os padrões
        const processed = {
            id: data.id || defaults.id,
            user_id: data.user_id || data.userId || defaults.user_id,
            name: data.name || defaults.name,
            mainColor: isCreationMode ? defaults.mainColor : 
                      (data.main_color || data.mainColor || defaults.mainColor),
            skinColor: isCreationMode ? defaults.skinColor :
                      (data.skin_color || data.skinColor || defaults.skinColor),
            accentColor: isCreationMode ? defaults.accentColor :
                        (data.accent_color || data.accentColor || defaults.accentColor),
            topRadius: Number(isCreationMode ? defaults.topRadius :
                     (data.top_radius || data.topRadius || defaults.topRadius)),
            bottomRadius: Number(isCreationMode ? defaults.bottomRadius :
                       (data.bottom_radius || data.bottomRadius || defaults.bottomRadius)),
            faceExpression: this.validateFaceExpression(
                isCreationMode ? defaults.faceExpression :
                (data.face_expression || data.faceExpression || defaults.faceExpression)
            ),
            equipment: isCreationMode ? defaults.equipment :
                      (data.equipment || defaults.equipment)
        };

        console.log('🔄 Dados processados:', processed);
        return processed;
    }

    validateFaceExpression(expression) {
        const config = CHARACTER_CONFIG.validation.faceExpression;
        
        if (!expression) return CHARACTER_CONFIG.defaults.faceExpression;
        
        // Limitar tamanho e remover espaços
        const cleaned = expression.trim().slice(0, config.maxLength);
        
        // Garantir tamanho mínimo
        return cleaned.length < config.minLength ? 
               CHARACTER_CONFIG.defaults.faceExpression : 
               cleaned;
    }

    createHead() {
        const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const canvas = document.createElement('canvas');
        canvas.width = 1024; // Aumentado para melhor resolução
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Cor base da pele
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Configuração melhorada do texto
        ctx.fillStyle = this.accentColor;
        ctx.font = "bold 128px monospace"; // Fonte maior
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Validar e garantir expressão facial válida
        const expression = this.faceExpression || CHARACTER_CONFIG.defaults.faceExpression;
        
        // Desenhar expressão
        ctx.fillText(expression, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16; // Melhorar qualidade da textura
        texture.needsUpdate = true;

        const headMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.6,
            metalness: 0.1,
            envMapIntensity: 1.0
        });

        return new THREE.Mesh(headGeometry, headMaterial);
    }

    equipItem(item) {
        if (this.equipment.hasOwnProperty(item.slot)) {
            this.equipment[item.slot] = item;
            return true;
        }
        return false;
    }

    unequipItem(slot) {
        if (this.equipment.hasOwnProperty(slot)) {
            const item = this.equipment[slot];
            this.equipment[slot] = null;
            return item;
        }
        return null;
    }

    // Método para criar a representação 3D do personagem
    create3DModel() {
        const group = new THREE.Group();

        // Corpo com dimensões corretas
        const bodyGeometry = new THREE.CylinderGeometry(
            this.topRadius || CHARACTER_CONFIG.defaults.topRadius,
            this.bottomRadius || CHARACTER_CONFIG.defaults.bottomRadius,
            2,
            32
        );
        
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.mainColor || CHARACTER_CONFIG.defaults.mainColor,
            roughness: 0.3,
            metalness: 0.4,
            envMapIntensity: 1.2
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Cabeça com textura facial
        const head = this.createHead();
        head.position.y = 1.5; // Ajustado para posição correta
        group.add(head);

        this.character3D = group;
        return group;
    }

    // Método para atualizar o modelo 3D existente
    update3DModel(model) {
        if (!model || model.children.length < 2) {
            console.warn('⚠️ Modelo inválido para atualização');
            return;
        }

        const body = model.children[0];
        const head = model.children[1];

        // Log para debug da atualização do modelo
        console.log('🔄 Atualizando modelo 3D:', {
            face: this.faceExpression,
            mainColor: this.mainColor,
            skinColor: this.skinColor
        });

        // Atualizar corpo
        body.material.color.setStyle(this.mainColor);
        const newGeometry = new THREE.CylinderGeometry(
            this.topRadius,
            this.bottomRadius,
            2,
            32
        );
        body.geometry.dispose();
        body.geometry = newGeometry;

        // Criar nova cabeça com textura atualizada
        const newHead = this.createHead();
        head.material = newHead.material;
        head.material.needsUpdate = true;
    }

    updateShape(topRadius, bottomRadius) {
        this.topRadius = topRadius;
        this.bottomRadius = bottomRadius;
        if (this.character3D) {
            this.update3DModel(this.character3D);
        }
    }

    updateColors(mainColor, skinColor, accentColor) {
        if (mainColor) this.mainColor = mainColor;
        if (skinColor) this.skinColor = skinColor;
        if (accentColor) this.accentColor = accentColor;
        if (this.character3D) {
            this.update3DModel(this.character3D);
        }
    }

    updateFaceExpression(expression) {
        if (!expression) return;
        
        this.faceExpression = expression;
        
        // Se tiver um modelo 3D, atualizar imediatamente
        if (this.character3D) {
            const head = this.character3D.children[1];
            if (head && head.material) {
                const newHead = this.createHead();
                head.material.dispose();
                head.material = newHead.material;
                head.material.needsUpdate = true;
            }
        }
    }

    // Método para salvar o personagem
    save() {
        const characters = loadCharacters();
        const existingIndex = characters.findIndex(c => c.name === this.name);
        
        if (existingIndex >= 0) {
            characters[existingIndex] = this;
        } else {
            characters.push(this);
        }
        
        localStorage.setItem('characters', JSON.stringify(characters));
    }

    update(data) {
        let needsUpdate = false;

        if (data.name) this.name = data.name;
        if (data.main_color) this.mainColor = data.main_color;
        if (data.skin_color) this.skinColor = data.skin_color;
        if (data.accent_color) this.accentColor = data.accent_color;
        if (data.top_radius) this.topRadius = data.top_radius;
        if (data.bottom_radius) this.bottomRadius = data.bottom_radius;
        if (data.face_expression) this.faceExpression = data.face_expression;
        if (data.equipment) this.equipment = data.equipment;

        if (this.character3D) {
            this.update3DModel(this.character3D);
        }

        return this;
    }

    reset() {
        Object.assign(this, CHARACTER_CONFIG.defaults);
        if (this.character3D) {
            this.update3DModel(this.character3D);
        }
    }
}

export class Item {
    constructor(name, slot) {
        this.name = name;
        this.slot = slot; // 'head', 'leftHand', 'rightHand', 'back'
    }
}

// Funções de utilidade compartilhadas
function loadCharacters() {
    const saved = localStorage.getItem('characters');
    if (saved) {
        gameState.characters = JSON.parse(saved);
    }
    return gameState.characters;
}