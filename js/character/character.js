import { THREE } from '../core/three.js';
import { MaterialSystem } from '../core/materialSystem.js';
import { StateManager } from '../core/stateManager.js';

// Constantes globais para criação de personagem
export const CHARACTER_CONFIG = {
    defaults: {
        mainColor: '#FF0000',
        skinColor: '#FFA07A', 
        accentColor: '#000000',
        topRadius: 0.62,
        bottomRadius: 0.62,
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
            min: 0.25,
            max: 1.0
        }
    }
};

export class Character {
    constructor(data = {}, isCreationMode = false) {
        console.log('🎭 Modo:', isCreationMode ? 'Criação' : 'Carregamento');
        console.log('📥 Dados recebidos:', data);

        // Garantir valores padrão caso não existam
        const defaults = CHARACTER_CONFIG.defaults;
        this.id = data.id;
        this.userId = data.userId;
        this.name = data.name;
        this.mainColor = data.mainColor || defaults.mainColor;
        this.skinColor = data.skinColor || defaults.skinColor;
        this.accentColor = data.accentColor || defaults.accentColor;
        this.topRadius = data.topRadius || defaults.topRadius;
        this.bottomRadius = data.bottomRadius || defaults.bottomRadius;
        this.faceExpression = data.faceExpression || defaults.faceExpression;
        this.equipment = data.equipment || { ...defaults.equipment };
        
        this.stateManager = StateManager.getInstance();
        this.materialSystem = MaterialSystem.getInstance();
        this.character3D = null;

        console.log('✨ Personagem construído:', this);
    }

    isValid() {
        const hasRequired = this.id && this.name;
        const hasValidFace = this.faceExpression && typeof this.faceExpression === 'string';
        const hasValidColors = this.mainColor && this.skinColor && this.accentColor;
        const hasValidDimensions = typeof this.topRadius === 'number' && 
                                 typeof this.bottomRadius === 'number';

        const isValid = hasRequired && hasValidFace && hasValidColors && hasValidDimensions;

        console.log('🔍 Validação do personagem:', {
            hasRequired,
            hasValidFace,
            hasValidColors,
            hasValidDimensions,
            isValid
        });

        return isValid;
    }

    processInputData(data, defaults, isCreationMode) {
        console.log('🎭 [CHARACTER] Processando dados, expressão:', 
            data.faceExpression);
        const processed = {
            id: data.id,
            userId: data.userId,
            name: data.name,
            mainColor: data.mainColor,
            skinColor: data.skinColor,
            accentColor: data.accentColor,
            topRadius: data.topRadius,
            bottomRadius: data.bottomRadius,
            faceExpression: data.faceExpression,
            equipment: data.equipment
        };

        console.log('🔄 Dados processados:', processed);
        console.log('🎭 [CHARACTER] Dados processados, expressão final:', 
            processed.faceExpression);
        return processed;

    }

    createHead() {
        console.log('🎭 [CHARACTER] Criando cabeça com expressão:', 
            this.faceExpression);
        const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
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
        
        // Desenhar expressão
        ctx.fillText(this.faceExpression, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16; // Melhorar qualidade da textura
        texture.needsUpdate = true;

        const headMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.6,
            metalness: 0.1,
            envMapIntensity: 1.0
        });

        console.log('🎭 [CHARACTER] Expressão desenhada na textura:',  this.faceExpression);
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
        console.log('🎮 Criando modelo 3D com dados:', {
            mainColor: this.mainColor,
            skinColor: this.skinColor,
            accentColor: this.accentColor,
            topRadius: this.topRadius,
            bottomRadius: this.bottomRadius,
            faceExpression: this.faceExpression
        });

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
        console.log('🎭 [CHARACTER] Atualizando modelo 3D, expressão:', 
            this.faceExpression);
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
        console.log('🎭 [CHARACTER] Modelo 3D atualizado com expressão');
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

    // Método para salvar o personagem
    save() {
        const currentCharacter = this.stateManager.getCurrentCharacter();
        const characters = this.stateManager.getCharacters();
        const existingIndex = characters.findIndex(c => c.name === this.name);
        
        if (existingIndex >= 0) {
            characters[existingIndex] = this;
        } else {
            characters.push(this);
        }
        
        this.stateManager.setCharacters(characters);
        if (currentCharacter?.name === this.name) {
            this.stateManager.setCurrentCharacter(this);
        }
    }

    update(data) {
        this.name = data.name;
        this.mainColor = data.mainColor;
        this.skinColor = data.skinColor;
        this.accentColor = data.accentColor;
        this.topRadius = data.topRadius;
        this.bottomRadius = data.bottomRadius;
        this.faceExpression = data.faceExpression;
        this.equipment = data.equipment;

        if (this.character3D) {
            this.update3DModel(this.character3D);
        }
    }

    // Atualizar método de carregamento de personagens
    static loadCharacters() {
        return StateManager.getInstance().getCharacters();
    }

}

export class Item {
    constructor(name, slot) {
        this.name = name;
        this.slot = slot; // 'head', 'leftHand', 'rightHand', 'back'
    }
}