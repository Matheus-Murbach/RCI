import * as THREE from 'three';

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
        try {
            const group = new THREE.Group();
            
            // Corpo (cilindro)
            const bodyGeometry = new THREE.CylinderGeometry(
                this.topRadius,
                this.bottomRadius,
                2,
                32
            );
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: this.mainColor
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 1; // Ajustado para ficar mais alto
            body.castShadow = true;
            group.add(body);
            
            // Cabeça (esfera)
            const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
            const headMaterial = new THREE.MeshPhongMaterial({
                color: this.skinColor
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 2.5; // Ajustado para ficar acima do corpo
            head.castShadow = true;
            group.add(head);
            
            console.log('Modelo 3D do personagem criado com sucesso');
            return group;
        } catch (error) {
            console.error('Erro ao criar modelo 3D:', error);
            return null;
        }
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
        
        console.log('Personagem atualizado:', this);
        return this;
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
