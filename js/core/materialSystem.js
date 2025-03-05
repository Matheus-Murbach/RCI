import { THREE } from './three.js';

export class MaterialSystem {
    static instance = null;

    constructor() {
        if (MaterialSystem.instance) {
            return MaterialSystem.instance;
        }
        MaterialSystem.instance = this;
    }

    createCharacterMaterial(color, options = {}) {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness: options.roughness || 0.3,
            metalness: options.metalness || 0.4,
            envMapIntensity: options.envMapIntensity || 1.2,
            flatShading: false
        });
    }

    createEnvironmentMaterial(color, options = {}) {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness: options.roughness || 0.8,
            metalness: options.metalness || 0.1,
            envMapIntensity: options.envMapIntensity || 0.5
        });
    }

    static getInstance() {
        if (!MaterialSystem.instance) {
            MaterialSystem.instance = new MaterialSystem();
        }
        return MaterialSystem.instance;
    }
}
