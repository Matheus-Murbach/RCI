import { THREE } from '../core/three.js';
import { MaterialSystem } from '../core/materialSystem.js';

// Constantes globais para criação de personagem
export const DEFAULT_CHARACTER = {
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
};

export class Character {
    constructor(data = {}) {
        console.log('🎭 Construindo personagem com dados brutos:', data);
        
        // Usar dados do banco com fallback para valores padrão
        this.id = data.id;
        this.userId = data.userId || data.user_id;
        this.name = data.name;
        this.mainColor = data.mainColor || data.main_color || DEFAULT_CHARACTER.mainColor;
        this.skinColor = data.skinColor || data.skin_color || DEFAULT_CHARACTER.skinColor;
        this.accentColor = data.accentColor || data.accent_color || DEFAULT_CHARACTER.accentColor;
        this.topRadius = parseFloat(data.topRadius || data.top_radius) || DEFAULT_CHARACTER.topRadius;
        this.bottomRadius = parseFloat(data.bottomRadius || data.bottom_radius) || DEFAULT_CHARACTER.bottomRadius;
        this.faceExpression = data.faceExpression || data.face_expression || DEFAULT_CHARACTER.faceExpression;
        this.equipment = data.equipment || data.equipment_data || DEFAULT_CHARACTER.equipment;
        
        this.materialSystem = MaterialSystem.getInstance();
        this.character3D = null;

        console.log('✨ Personagem construído:', this);
    }

    createHead() {
        const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Cor base da pele sem gradientes
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = this.accentColor; 
        ctx.font = "bold 64px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Garantir que a expressão facial nunca seja undefined
        const expression = this.faceExpression;
        ctx.fillText(expression, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const headMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.2,
            metalness: 0.3,
            envMapIntensity: 1.2,
            transparent: true,
            alphaTest: 0.5
        });

        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        head.name = 'head';
        head.rotation.y = Math.PI;

        return head;
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
            this.topRadius || DEFAULT_CHARACTER.topRadius,
            this.bottomRadius || DEFAULT_CHARACTER.bottomRadius,
            2,
            32
        );
        
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.mainColor || DEFAULT_CHARACTER.mainColor,
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
        if (!model || model.children.length < 2) return;

        const body = model.children[0];
        const head = model.children[1];

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
        this.faceExpression = expression;
        if (this.character3D) {
            this.update3DModel(this.character3D);
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

        if (data.name) {
            this.name = data.name;
            needsUpdate = true;
        }
        if (data.main_color || data.mainColor) {
            this.mainColor = data.main_color || data.mainColor;
            needsUpdate = true;
        }
        if (data.skin_color || data.skinColor) {
            this.skinColor = data.skin_color || data.skinColor;
            needsUpdate = true;
        }
        if (data.accent_color || data.accentColor) {
            this.accentColor = data.accent_color || data.accentColor;
            needsUpdate = true;
        }
        if (data.top_radius || data.topRadius) {
            this.topRadius = data.top_radius || data.topRadius;
            needsUpdate = true;
        }
        if (data.bottom_radius || data.bottomRadius) {
            this.bottomRadius = data.bottom_radius || data.bottomRadius;
            needsUpdate = true;
        }
        if (data.face_expression || data.faceExpression) {
            // Garantir que a expressão facial seja preservada com fallback
            this.faceExpression = data.faceExpression || data.face_expression || "'-'";
            needsUpdate = true;
        }
        if (data.equipment) {
            this.equipment = data.equipment;
            needsUpdate = true;
        }

        // Atualizar o modelo 3D apenas uma vez se houver mudanças
        if (needsUpdate && this.character3D) {
            this.update3DModel(this.character3D);
        }

        return this;
    }

    reset() {
        Object.assign(this, DEFAULT_CHARACTER);
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