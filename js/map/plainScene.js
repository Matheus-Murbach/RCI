import * as THREE from 'three';
import { CameraControllerGame } from '../cameraControllerGame.js';

export class PlainScene {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.cameraController = new CameraControllerGame(camera);
        this.characterModel = null;
        this.init();
    }

    init() {
        // Configurar iluminação
        this.setupLighting();
        
        // Criar elementos da cena
        this.createTerrain();
        this.createSkybox();
        this.createAmbientElements();
    }

    setupLighting() {
        // Luz direcional principal (sol)
        const sunLight = new THREE.DirectionalLight(0xffffcc, 1);
        sunLight.position.set(0, 100, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        // Luz ambiente suave
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Luz hemisférica para melhorar sombras
        const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
        this.scene.add(hemiLight);
    }

    createTerrain() {
        // Criar um plano simples e grande
        const size = 1000;
        const geometry = new THREE.PlaneGeometry(size, size);
        
        // Material com textura procedural
        const material = new THREE.MeshStandardMaterial({
            map: this.generateTerrainTexture(),
            roughness: 0.8,
            metalness: 0.1,
            color: 0x90AF50,
        });

        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        this.scene.add(terrain);
    }

    generateTerrainTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Cor base (grama de planície)
        ctx.fillStyle = '#9CB754';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Adicionar variações sutis de cor
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 1 + Math.random() * 2;
            
            ctx.fillStyle = Math.random() > 0.5 ? '#8CA744' : '#AAC164';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(16, 16); // Aumentado para mais detalhes no chão
        
        return texture;
    }

    createSkybox() {
        // Criar céu simples usando um gradiente
        const verticalFov = 60;
        const aspect = window.innerWidth / window.innerHeight;
        const height = 2000;
        const skyGeometry = new THREE.SphereGeometry(height, 32, 32);
        
        const uniforms = {
            topColor: { value: new THREE.Color(0x0077ff) },
            bottomColor: { value: new THREE.Color(0xffffff) },
            offset: { value: height * 0.25 },
            exponent: { value: 0.6 }
        };

        const skyMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(h, exponent), 0.0)), 1.0);
                }
            `,
            uniforms: uniforms,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }

    createAmbientElements() {
        // Reduzir quantidade de árvores e espalhar mais
        for (let i = 0; i < 30; i++) {
            const tree = this.createTree();
            const x = (Math.random() - 0.5) * 900;
            const z = (Math.random() - 0.5) * 900;
            tree.position.set(x, 0, z); // Altura fixa em 0
            
            const scale = 0.5 + Math.random() * 0.5;
            tree.scale.set(scale, scale, scale);
            
            this.scene.add(tree);
        }
    }

    createTree() {
        const group = new THREE.Group();

        // Tronco
        const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 8, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4b3621 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        group.add(trunk);

        // Copa da árvore
        const leavesGeometry = new THREE.ConeGeometry(5, 10, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x005500 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 8;
        leaves.castShadow = true;
        group.add(leaves);

        return group;
    }

    update() {
        // Atualizar posição da câmera baseada no personagem
        if (this.characterModel) {
            this.cameraController.update(this.characterModel.position);
        }
    }

    updateCharacterModel(character) {
        try {
            if (this.characterModel) {
                this.scene.remove(this.characterModel);
            }

            this.characterModel = character.create3DModel();
            if (!this.characterModel) {
                throw new Error('Falha ao criar modelo 3D do personagem');
            }

            // Posicionar o personagem um pouco acima do terreno
            this.characterModel.position.y = 2;
            this.scene.add(this.characterModel);
            console.log('Modelo do personagem adicionado à cena');
            
        } catch (error) {
            console.error('Erro ao atualizar modelo do personagem:', error);
            throw error;
        }
    }
}
