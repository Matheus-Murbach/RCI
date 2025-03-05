import { THREE } from './three.js';
import {
    EffectComposer,
    RenderPass,
    UnrealBloomPass,
    SSAOPass,
    SAOPass,
    SMAAPass
} from './three.js';

export class RenderSystem {
    static instance = null;

    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.activeScene = null;
        this.animationFrame = null;
        this.defaultBackground = new THREE.Color(0x000000);
        this.composer = null;
        this.effects = new Map();
    }

    static getInstance() {
        if (!RenderSystem.instance) {
            RenderSystem.instance = new RenderSystem();
        }
        return RenderSystem.instance;
    }

    initialize(canvas, container) {
        // Criar scene
        this.scene = new THREE.Scene();
        this.scene.background = this.defaultBackground;

        // Configurar camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            5000
        );
        this.camera.position.set(0, 2, 5);

        // Configurar renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            logarithmicDepthBuffer: true,
            shadowMap: {
                enabled: true,
                type: THREE.PCFSoftShadowMap
            }
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);

        // Melhorar configurações do renderer
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Nova propriedade
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        // Removida a linha physicallyCorrectLights que está depreciada

        // Configurar pós-processamento
        this.setupPostProcessing();

        // Configurar resize handler
        window.addEventListener('resize', () => {
            if (container && this.camera && this.renderer) {
                const width = container.clientWidth;
                const height = container.clientHeight;
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(width, height);

                // Atualizar também o composer e efeitos
                if (this.composer) {
                    this.composer.setSize(width, height);
                }

                // Atualizar tamanho dos efeitos que precisam
                const pixelRatio = this.renderer.getPixelRatio();
                this.effects.forEach(effect => {
                    if (effect.setSize) {
                        effect.setSize(width * pixelRatio, height * pixelRatio);
                    }
                });
            }
        });

        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer
        };
    }

    setupPostProcessing() {
        // Criar compositor
        this.composer = new EffectComposer(this.renderer);

        // Passe de renderização básica
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Ajustar Bloom para ser mais sutil
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.3,    // força reduzida
            0.3,    // raio reduzido
            0.9     // threshold aumentado
        );
        this.composer.addPass(bloomPass);
        this.effects.set('bloom', bloomPass);

        // Ajustar SSAO para ser mais sutil
        const ssaoPass = new SSAOPass(
            this.scene,
            this.camera,
            window.innerWidth,
            window.innerHeight
        );
        ssaoPass.kernelRadius = 8;      // reduzido
        ssaoPass.minDistance = 0.001;   // ajustado
        ssaoPass.maxDistance = 0.05;    // ajustado
        this.composer.addPass(ssaoPass);
        this.effects.set('ssao', ssaoPass);

        // Anti-aliasing SMAA
        const smaaPass = new SMAAPass(
            window.innerWidth * this.renderer.getPixelRatio(),
            window.innerHeight * this.renderer.getPixelRatio()
        );
        this.composer.addPass(smaaPass);
        this.effects.set('smaa', smaaPass);
    }

    setActiveScene(scene) {
        this.activeScene = scene;
    }

    animate() {
        const animate = () => {
            this.animationFrame = requestAnimationFrame(animate);

            if (this.activeScene) {
                this.activeScene.update();
            }

            if (this.activeScene?.cameraController) {
                this.activeScene.cameraController.update();
            }

            // Usar o composer ao invés do renderer direto
            if (this.composer) {
                this.composer.render();
            } else if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };

        animate();
    }

    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    initRenderer(renderer) {
        this.renderer = renderer;
        return this;
    }

    isRendererInitialized() {
        return !!this.renderer;
    }

    setBackground(color) {
        if (this.renderer) {
            this.renderer.setClearColor(color);
        }
        this.defaultBackground = color;
    }

    getRenderer() {
        return this.renderer;
    }

    // Método para ajustar efeitos
    adjustEffect(effectName, params) {
        const effect = this.effects.get(effectName);
        if (effect) {
            Object.assign(effect, params);
        }
    }

    // Método para habilitar/desabilitar efeitos
    toggleEffect(effectName, enabled) {
        const effect = this.effects.get(effectName);
        if (effect) {
            effect.enabled = enabled;
        }
    }

    dispose() {
        this.stopAnimation();
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.composer) {
            this.composer.dispose();
        }
        this.effects.clear();
    }
}
