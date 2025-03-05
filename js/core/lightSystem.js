import { THREE } from './three.js';

export class LightSystem {
    static instance = null;

    constructor() {
        if (LightSystem.instance) {
            return LightSystem.instance;
        }
        LightSystem.instance = this;
        
        this.lights = new Map();
        this.defaultConfig = {
            ambient: {
                color: 0xffffff,
                intensity: 0.4
            },
            directional: {
                color: 0xffffcc,
                intensity: 1.5,
                position: new THREE.Vector3(5, 5, 5),
                shadowConfig: {
                    enabled: true,
                    mapSize: 2048,
                    near: 0.1,
                    far: 1000,
                    left: -50,
                    right: 50,
                    top: 50,
                    bottom: -50,
                    bias: -0.001
                }
            },
            hemisphere: {
                skyColor: 0xffffff,
                groundColor: 0x444444,
                intensity: 0.8,
                position: new THREE.Vector3(0, 50, 0)
            }
        };
    }

    setupLighting(scene, config = {}) {
        // Mesclar configuração padrão com configuração personalizada
        const finalConfig = this.mergeConfigs(this.defaultConfig, config);

        // Limpar luzes existentes
        this.clearLights(scene);

        // Criar luzes com a configuração final
        const lights = {
            ambient: this.createAmbientLight(finalConfig.ambient),
            directional: this.createDirectionalLight(finalConfig.directional),
            hemisphere: this.createHemisphereLight(finalConfig.hemisphere)
        };

        // Adicionar luzes à cena
        Object.values(lights).forEach(light => scene.add(light));

        // Armazenar referência das luzes
        this.lights.set(scene, lights);

        return lights;
    }

    mergeConfigs(default_config, custom_config) {
        return {
            ambient: { ...default_config.ambient, ...custom_config.ambient },
            directional: { ...default_config.directional, ...custom_config.directional },
            hemisphere: { ...default_config.hemisphere, ...custom_config.hemisphere }
        };
    }

    clearLights(scene) {
        scene.children
            .filter(child => child instanceof THREE.Light)
            .forEach(light => scene.remove(light));
        
        this.lights.delete(scene);
    }

    createAmbientLight(config) {
        return new THREE.AmbientLight(config.color, config.intensity);
    }

    createDirectionalLight(config) {
        const light = new THREE.DirectionalLight(config.color, config.intensity);
        light.position.copy(config.position);

        if (config.shadowConfig.enabled) {
            light.castShadow = true;
            light.shadow.mapSize.width = config.shadowConfig.mapSize;
            light.shadow.mapSize.height = config.shadowConfig.mapSize;
            light.shadow.camera.near = config.shadowConfig.near;
            light.shadow.camera.far = config.shadowConfig.far;
            light.shadow.camera.left = config.shadowConfig.left;
            light.shadow.camera.right = config.shadowConfig.right;
            light.shadow.camera.top = config.shadowConfig.top;
            light.shadow.camera.bottom = config.shadowConfig.bottom;
            light.shadow.bias = config.shadowConfig.bias;
        }

        return light;
    }

    createHemisphereLight(config) {
        const light = new THREE.HemisphereLight(
            config.skyColor,
            config.groundColor,
            config.intensity
        );
        light.position.copy(config.position);
        return light;
    }

    updateLighting(scene, config) {
        const lights = this.lights.get(scene);
        if (!lights) return;

        // Atualizar configurações das luzes existentes
        if (config.ambient && lights.ambient) {
            lights.ambient.color.set(config.ambient.color ?? lights.ambient.color);
            lights.ambient.intensity = config.ambient.intensity ?? lights.ambient.intensity;
        }

        if (config.directional && lights.directional) {
            const dl = lights.directional;
            dl.color.set(config.directional.color ?? dl.color);
            dl.intensity = config.directional.intensity ?? dl.intensity;
            if (config.directional.position) {
                dl.position.copy(config.directional.position);
            }
        }

        if (config.hemisphere && lights.hemisphere) {
            const hl = lights.hemisphere;
            hl.skyColor.set(config.hemisphere.skyColor ?? hl.skyColor);
            hl.groundColor.set(config.hemisphere.groundColor ?? hl.groundColor);
            hl.intensity = config.hemisphere.intensity ?? hl.intensity;
            if (config.hemisphere.position) {
                hl.position.copy(config.hemisphere.position);
            }
        }
    }

    static getInstance() {
        if (!LightSystem.instance) {
            LightSystem.instance = new LightSystem();
        }
        return LightSystem.instance;
    }
}
