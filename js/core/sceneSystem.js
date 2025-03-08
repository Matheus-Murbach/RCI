import { THREE } from './three.js';
import { RenderSystem } from './renderSystem.js';
import { LightSystem } from './lightSystem.js';

export class SceneSystem {
    static instance = null;

    constructor() {
        if (SceneSystem.instance) {
            return SceneSystem.instance;
        }
        SceneSystem.instance = this;
        
        this.renderSystem = RenderSystem.getInstance();
        this.lightSystem = LightSystem.getInstance();
    }

    initializeScene(canvas, container) {
        // Inicializar sistemas base
        const { scene, camera, renderer } = this.renderSystem.initialize(canvas, container);
        
        // Configurar iluminação padrão
        this.lightSystem.setupLighting(scene);
        
        // Configurar material padrão para estilo cartunista
        THREE.ShaderLib.standard.fragmentShader = THREE.ShaderLib.standard.fragmentShader
            .replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                // Aumentar saturação
                diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, 1.5);
                // Adicionar contorno suave
                float fresnel = pow(1.0 - dot(normalize(vViewPosition), normal), 3.0);
                diffuseColor.rgb += fresnel * 0.3;
                `
            );

        return { scene, camera, renderer };
    }

    static getInstance() {
        if (!SceneSystem.instance) {
            SceneSystem.instance = new SceneSystem();
        }
        return SceneSystem.instance;
    }

    // Novo método para gerar cores vibrantes para planetas
    static generateCartoonColor() {
        const hue = Math.random();
        const saturation = 0.7 + Math.random() * 0.3; // Alta saturação
        const lightness = 0.5 + Math.random() * 0.2; // Brilho moderado
        return new THREE.Color().setHSL(hue, saturation, lightness);
    }
}
