// Classes e funções compartilhadas
export class Character {
    constructor(name, mainColor, skinColor, accentColor) {
        this.name = name;
        this.mainColor = mainColor || '#FF0000';
        this.skinColor = skinColor || '#FFA07A';
        this.accentColor = accentColor || '#0000FF';
        this.topRadius = 0.75;
        this.bottomRadius = 0.75;
        this.userId = null; // Adicionado campo userId
        this.equipment = {
            head: null,
            leftHand: null,
            rightHand: null,
            back: null
        };
        
        // Adicionar log para debug
        console.log('Novo personagem criado:', {
            name: this.name,
            mainColor: this.mainColor,
            skinColor: this.skinColor,
            accentColor: this.accentColor,
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
        body.position.y = -0.5;
        group.add(body);
        
        // Cabeça (esfera)
        const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: this.skinColor
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1;
        group.add(head);
        
        return group;
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
