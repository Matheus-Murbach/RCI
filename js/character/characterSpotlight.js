import { THREE } from '../core/three.js';

export class CharacterSpotlight {
    constructor(scene, character) {
        this.scene = scene;
        this.character = character;
        
        // Criar luz spot principal
        this.spotlight = new THREE.SpotLight(0xffffff, 10);
        this.spotlight.angle = Math.PI / 5; // 30 graus
        this.spotlight.penumbra = 0.5;
        this.spotlight.decay = 0.01;
        this.spotlight.distance = 1500;
        
        // Configurar sombras
        this.spotlight.castShadow = true;
        this.spotlight.shadow.mapSize.width = 1024;
        this.spotlight.shadow.mapSize.height = 1024;
        this.spotlight.shadow.camera.near = 0.5;
        this.spotlight.shadow.camera.far = 20;
        
        // Criar target para a luz
        this.targetObject = new THREE.Object3D();
        this.scene.add(this.targetObject);
        this.spotlight.target = this.targetObject;
        
        this.scene.add(this.spotlight);
    }

    update(rotation) {
        if (!this.character) return;

        // Posicionar luz acima do personagem
        const characterPosition = this.character.position;
        this.spotlight.position.set(
            characterPosition.x,
            characterPosition.y + 3,
            characterPosition.z 
        );

        // Corrigir o ângulo da luz (rotação - 90 graus em radianos)
        const adjustedRotation = rotation + Math.PI/2;
        const distance = 5;
        const targetX = characterPosition.x - Math.sin(adjustedRotation) * distance;
        const targetZ = characterPosition.z - Math.cos(adjustedRotation) * distance;
        
        this.targetObject.position.set(targetX, 0, targetZ);
    }

    dispose() {
        this.scene.remove(this.spotlight);
        this.scene.remove(this.targetObject);
        this.spotlight.dispose();
    }
}
