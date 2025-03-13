import { THREE } from '../core/three.js';
import { BaseScene } from './baseScene.js';
import { MaterialSystem } from '../core/materialSystem.js';
import { RenderSystem } from '../core/renderSystem.js';
import { StateManager } from '../core/stateManager.js';
import { CameraControllerGame } from '../cameraControllerGame.js';
import { DungeonThemeManager } from './dungeonThemeManager.js';
import { MapGenerator } from './mapGenerator.js';

export class PlainScene extends BaseScene {
    constructor(scene, camera) {
        super(scene, camera);
        
        // Inicializar componentes principais
        this.camera = camera;
        this.scene = scene;
        this.cameraController = new CameraControllerGame(camera, scene);
        this.mapGenerator = new MapGenerator();
        this.themeManager = new DungeonThemeManager(scene);
        
        // Atualizar câmera diretamente no tema atual
        if (this.themeManager.currentTheme) {
            this.themeManager.currentTheme.camera = camera;
        }
        
        console.log('🎥 PlainScene inicializada:', {
            camera: !!camera,
            scene: !!scene,
            controller: !!this.cameraController
        });
    }

    async init() {
        if (!super.init()) return false;

        await this.setupMapAndTheme();
        return true;
    }

    async setupMapAndTheme() {
        try {
            // Gerar mapa
            this.mapGenerator.generateMap();
            
            // Verificar se o mapa foi gerado com sucesso
            if (!this.mapGenerator.grid) {
                console.warn('⚠️ Usando mapa padrão');
                this.createDefaultMap();
            }

            // Configurar câmera com base no tamanho do mapa
            const gridSize = this.mapGenerator.grid.length;
            if (this.cameraController) {
                try {
                    console.log('📸 Configurando posição inicial da câmera');
                    this.cameraController.setInitialPosition(gridSize, gridSize);
                } catch (error) {
                    console.warn('⚠️ Erro ao posicionar câmera:', error);
                    // Usar configuração padrão como fallback
                    this.cameraController.setCameraDefaults(12, 15, Math.PI / 4);
                }
            }

            // Aplicar tema com câmera
            const theme = this.themeManager.createTheme('scifi');
            if (theme) {
                theme.camera = this.camera; // Passar câmera diretamente
                await theme.generateFromGrid(this.mapGenerator.grid);
            }

            // Configurar materiais das paredes para receber sombras
            this.scene.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });

            // Ajustar configurações de sombra do renderer
            const renderer = this.renderSystem.getRenderer();
            if (renderer) {
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao configurar mapa:', error);
            return false;
        }
    }

    createDefaultMap() {
        // Criar grid básico 5x5
        this.mapGenerator = new MapGenerator();
        this.mapGenerator.grid = Array(5).fill(null).map(() => 
            Array(5).fill(null).map(() => ({ type: 'room' }))
        );
        // Definir célula central como hub
        this.mapGenerator.grid[2][2] = { type: 'hub' };
    }

    async setupSceneWithMap(theme) {
        if (!this.mapGenerator?.grid) return;

        try {
            // Configurar câmera com tratamento de erro
            try {
                this.cameraController.setInitialPosition(
                    this.mapGenerator.grid[0].length,
                    this.mapGenerator.grid.length
                );
            } catch (error) {
                console.warn('⚠️ Erro ao posicionar câmera:', error);
            }

            // Aplicar tema
            if (this.themeManager) {
                try {
                    await this.themeManager.applyTheme(theme, this.mapGenerator.grid);
                } catch (error) {
                    console.warn('⚠️ Erro ao aplicar tema:', error);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao configurar cena:', error);
        }
    }

    async setupBasicScene() {
        // Limpar cena primeiro
        while(this.scene.children.length > 0) {
            const obj = this.scene.children[0];
            this.scene.remove(obj);
        }

        // Setup básico garantido
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(1000, 1000),
            new THREE.MeshStandardMaterial({ 
                color: 0x555555, // Clareado um pouco
                side: THREE.DoubleSide,
                roughness: 0.7,  // Reduzido para refletir mais luz
                metalness: 0.3   // Aumentado levemente
            })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Remover luzes básicas e deixar só a do personagem
        
        return true;
    }

    update() {
        // Atualizar câmera primeiro
        if (this.cameraController) {
            this.cameraController.update();
        }

        // Depois atualizar o resto da cena
        super.update();

        try {
            // Verificar se themeManager e currentTheme existem e atualizar
            if (this.themeManager?.currentTheme?.update) {
                this.themeManager.currentTheme.update();
            }

        } catch (error) {
            console.warn('Aviso: Erro ao atualizar cena:', error);
        }

        return true;
    }

    updateCharacterModel(character) {
        if (!character) return false;

        try {
            // Remover modelo anterior
            if (this.characterModel) {
                this.scene.remove(this.characterModel);
            }

            // Criar e posicionar novo modelo
            this.characterModel = character.create3DModel();
            const hubPos = this.findHubCenter();
            const cellSize = 4;

            this.characterModel.position.set(
                hubPos.x * cellSize,
                0.5,
                hubPos.z * cellSize
            );

            // Adicionar à cena
            this.scene.add(this.characterModel);

            // Configurar câmera para seguir personagem
            if (this.cameraController) {
                console.log('🎯 Configurando câmera para seguir personagem');
                this.cameraController.setFollowTarget(this.characterModel);
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar personagem:', error);
            return false;
        }
    }

    findHubCenter() {
        if (!this.mapGenerator?.grid) {
            console.warn('⚠️ Grid não encontrado, usando posição padrão');
            return { x: 0, z: 0 };
        }

        try {
            // Procurar pela sala hub
            for (let z = 0; z < this.mapGenerator.grid.length; z++) {
                for (let x = 0; x < this.mapGenerator.grid[z].length; x++) {
                    const cell = this.mapGenerator.grid[z][x];
                    if (cell && cell.type === 'hub') {
                        // Retornar o centro exato da célula
                        return {
                            x: x + 0.5, // Adicionar 0.5 para centralizar na célula
                            z: z + 0.5
                        };
                    }
                }
            }

            // Se não encontrar o hub, usar centro do grid
            const centerX = Math.floor(this.mapGenerator.grid[0].length / 2);
            const centerZ = Math.floor(this.mapGenerator.grid.length / 2);
            return { x: centerX + 0.5, z: centerZ + 0.5 }; // Adicionar 0.5 para centralizar

        } catch (error) {
            console.warn('⚠️ Erro ao encontrar centro do hub:', error);
            return { x: 0, z: 0 };
        }
    }

    setTheme(themeName) {
        this.currentTheme = themeName;
        if (this.mapGenerator && this.camera) {
            console.log('🎨 Aplicando tema:', themeName);
            this.themeManager.applyTheme(themeName, this.mapGenerator.grid);
        }
    }

    setMapGenerator(mapGenerator) {
        this.mapGenerator = mapGenerator;
        // Aplicar tema se já estiver definido
        if (this.currentTheme) {
            this.themeManager.applyTheme(this.currentTheme, this.mapGenerator.grid);
        }
    }
}
