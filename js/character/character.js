import { THREE } from '../core/three.js';
import { MaterialSystem } from '../core/materialSystem.js';
import { EyeTypes, createEye } from '../character/eyeTypes.js'; // Corrigir importação

// Classes e funções compartilhadas
export class Character {
    constructor(data) {
        // Aceitar dados do banco ou valores padrão
        this.name = data?.name || '';
        this.mainColor = data?.main_color || data?.mainColor || '#FF0000';
        this.skinColor = data?.skin_color || data?.skinColor || '#FFA07A';
        this.accentColor = data?.accent_color || data?.accentColor || '#0000FF';
        this.topRadius = data?.top_radius || data?.topRadius || 0.75;
        this.bottomRadius = data?.bottom_radius || data?.bottomRadius || 0.75;
        this.id = data?.id || null;
        this.userId = data?.userId || null;
        this.equipment = {
            head: null,
            leftHand: null,
            rightHand: null,
            back: null
        };
        this.materialSystem = MaterialSystem.getInstance();
        this.eyeType = data?.eye_type || data?.eyeType || 'friendly';
        
        console.log('Personagem inicializado com:', {
            name: this.name,
            mainColor: this.mainColor,
            skinColor: this.skinColor,
            topRadius: this.topRadius,
            bottomRadius: this.bottomRadius
        });
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
        console.log('Criando modelo 3D com parâmetros:', {
            mainColor: this.mainColor,
            skinColor: this.skinColor,
            topRadius: this.topRadius,
            bottomRadius: this.bottomRadius
        });

        const group = new THREE.Group();

        // Corpo
        const bodyGeometry = new THREE.CylinderGeometry(
            this.topRadius,
            this.bottomRadius,
            2,
            32
        );
        const bodyMaterial = this.materialSystem.createCharacterMaterial(this.mainColor);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0;
        body.castShadow = true;
        group.add(body);

        // Cabeça
        const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const headMaterial = this.materialSystem.createCharacterMaterial(this.skinColor);
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        group.add(head);

        // Adicionar olhos
        const leftEye = createEye(this.eyeType, 'left');
        const rightEye = createEye(this.eyeType, 'right');
        
        leftEye.position.set(-0.15, 1.6, 0.4);
        rightEye.position.set(0.15, 1.6, 0.4);
        
        group.add(leftEye);
        group.add(rightEye);

        // Posicionar o grupo
        group.position.y = 1;

        console.log('Modelo 3D criado com sucesso');
        return group; // Retornar o grupo diretamente, sem Promise
    }

    // Método para atualizar o modelo 3D existente
    update3DModel(model) {
        if (!model || model.children.length < 2) return;

        const body = model.children[0];
        const head = model.children[1];

        // Atualizar cores
        body.material.color.setStyle(this.mainColor);
        head.material.color.setStyle(this.skinColor);

        // Atualizar geometria do corpo
        const newGeometry = new THREE.CylinderGeometry(
            this.topRadius,
            this.bottomRadius,
            2,
            32
        );
        body.geometry.dispose();
        body.geometry = newGeometry;
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
        Object.assign(this, {
            name: data.name || this.name,
            mainColor: data.mainColor || this.mainColor,
            skinColor: data.skinColor || this.skinColor,
            accentColor: data.accentColor || this.accentColor,
            topRadius: data.topRadius || this.topRadius,
            bottomRadius: data.bottomRadius || this.bottomRadius,
            equipment: data.equipment || this.equipment
        });
        
        this.eyeType = data.eyeType || this.eyeType;

        console.log('Personagem atualizado:', this);
        return this;
    }

    updateEyes(type) {
        if (!this.character3D) return;
        
        // Remover olhos existentes
        const existingEyes = this.character3D.children.filter(child => 
            child.userData.isEye === true
        );
        existingEyes.forEach(eye => this.character3D.remove(eye));

        // Criar novos olhos
        const leftEye = createEye(type, 'left');
        const rightEye = createEye(type, 'right');

        leftEye.position.set(-0.15, 1.6, 0.4);
        rightEye.position.set(0.15, 1.6, 0.4);

        this.character3D.add(leftEye);
        this.character3D.add(rightEye);
        
        this.eyeType = type;
    }
}

export class Item {
    constructor(name, slot) {
        this.name = name;
        this.slot = slot; // 'head', 'leftHand', 'rightHand', 'back'
    }
}

// Itens disponíveis no jogo
export const availableItems = [
    new Item("Chapéu", "head"),
    new Item("Capacete", "head"),
    new Item("Espada", "rightHand"),
    new Item("Escudo", "leftHand"),
    new Item("Cajado", "rightHand"),
    new Item("Mochila", "back"),
    new Item("Capa", "back")
];

// Função compartilhada para criar personagem 3D
function createCharacter3D(options = {}) {
    // ... código existente da função createCharacter3D ...
}

// Funções de utilidade compartilhadas
function loadCharacters() {
    const saved = localStorage.getItem('characters');
    if (saved) {
        gameState.characters = JSON.parse(saved);
    }
    return gameState.characters;
}

function saveCharacters() {
    localStorage.setItem('characters', JSON.stringify(gameState.characters));
}
