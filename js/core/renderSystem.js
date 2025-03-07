import { THREE } from './three.js';
import {
    EffectComposer,
    RenderPass,
    UnrealBloomPass,
    SSAOPass,
    SMAAPass  // Agora está sendo importado corretamente
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
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            container.offsetWidth / container.offsetHeight,
            0.1,
            5000
        );

        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: "high-performance"
        });

        // Usar novas propriedades do THREE.js r155
        renderer.outputColorSpace = THREE.SRGBColorSpace; // Nova propriedade
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight, false);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        return { scene, camera, renderer };
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
        if (this.animationFrame) return; // Evitar múltiplas animações
        
        const animate = () => {
            this.animationFrame = requestAnimationFrame(animate);

            // Atualizar cena ativa
            if (this.activeScene) {
                this.activeScene.update();
            }

            // Renderizar usando composer ou renderer
            if (this.composer && this.composer.enabled) {
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
