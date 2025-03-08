import { BaseScene } from './baseScene.js';
import { MaterialSystem } from '../core/materialSystem.js';
import { LightSystem } from '../core/lightSystem.js';
import { RenderSystem } from '../core/renderSystem.js';
import { THREE } from '../core/three.js';

export class SpaceScene extends BaseScene {
    constructor(scene, camera) {
        super(scene, camera);
        this.materialSystem = MaterialSystem.getInstance();
        this.lightSystem = LightSystem.getInstance();
        this.renderSystem = RenderSystem.getInstance(); // Use getInstance
        
        // Ajustar far plane da câmera para ver muito mais longe
        if (this.camera) {
            this.camera.far = 15000; // Aumentado significativamente (era tipicamente 1000 ou 2000)
            this.camera.near = 0.1;  // Mantido próximo para objetos próximos
            this.camera.updateProjectionMatrix(); // Importante: atualizar após mudanças
        }

        this.characterModel = null;
        this.cameraController = null; // Será definido depois
        this.init();

        // Log para debug
        console.log('🌌 SpaceScene inicializada');
    }

    setCameraController(controller) {
        this.cameraController = controller;
        console.log('📸 Camera Controller definido na SpaceScene');
    }

    init() {
        this.lodController = null;
        this.initLODController();
        
        // Ajustar controle de velocidade global
        this.baseSpeed = 0.0005;
        this.timeScale = 1.0;
        
        // Mover a configuração do background para depois da inicialização do renderer
        if (this.renderSystem.isRendererInitialized()) {
            this.renderSystem.setBackground(new THREE.Color(0x000000));
        }
        
        // Configurar iluminação usando LightSystem
        this.lightSystem.setupLighting(this.scene, {
            ambient: {
                intensity: 0.2 // Reduzir luz ambiente para o espaço
            },
            directional: {
                intensity: 2.0, // Aumentar intensidade para o sol
                position: new THREE.Vector3(-600, 150, -2000)
            }
        });
        
        // Criar elementos da cena
        this.createStars();
        this.createSpaceDust();
        this.createSun();
        this.createPlanets();
        this.createAsteroid();

        // Adicionar propriedades para controle do movimento das estrelas
        this.starsMovementSpeed = 0.5;
        this.starsDirection = new THREE.Vector3(0, 0, 1); // Movimento para frente
        this.stars = null; // Referência para o objeto de estrelas

        // Log para debug
        console.log('🌟 Elementos da SpaceScene criados');
    }

    // Novo método para calcular velocidade relativa
    calculateSpeed(distance) {
        const baseSpeed = (this.baseSpeed * 0.5) * this.timeScale * (3000 / distance); // Ajustado para novas distâncias
        
        // 80% lentos, 20% rápidos
        if (Math.random() > 0.2) {
            return baseSpeed * (0.2 + Math.random() * 0.3); // 20-50% da velocidade base
        } else {
            return baseSpeed * (1 + Math.random()); // 100-200% da velocidade base
        }
    }

    initLODController() {
        // Verificar se THREE está disponível
        if (typeof THREE === 'undefined') {
            console.error('THREE.js não está carregado ainda');
            return;
        }

        // Verificar se LODController está disponível
        if (typeof LODController === 'undefined') {
            console.error('LODController não está carregado ainda');
            return;
        }

        // Inicializar o LODController
        this.lodController = new LODController(this.camera);
    }

    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.1,
            transparent: true,
            sizeAttenuation: false // Desativa atenuação de tamanho para melhor performance
        });

        const starsVertices = [];
        // Aumentar a área de distribuição das estrelas para criar mais profundidade
        const spread = 10000; // Aumentado para acompanhar a nova render distance
        for (let i = 0; i < 2000; i++) { // Reduzido de 5000 para 2000
            const x = (Math.random() - 0.5) * spread;
            const y = (Math.random() - 0.5) * spread;
            const z = (Math.random() - 0.5) * spread;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);
    }

    createSpaceDust() {
        const dustGeometry = new THREE.BufferGeometry();
        const dustParticles = [];
        const dustVelocities = [];
        const particleCount = 600; // Dobrado de 300 para 600
        const spread = 300;     // Triplicado de 100 para 300

        // Criar partículas
        for (let i = 0; i < particleCount; i++) {
            dustParticles.push(
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread
            );

            dustVelocities.push(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            );
        }

        dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustParticles, 3));

        // Criar textura para as partículas
        const texture = this.createDustTexture();

        const dustMaterial = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.2,
            transparent: true,
            opacity: 0.6,
            map: texture,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.spaceDust = new THREE.Points(dustGeometry, dustMaterial);
        this.scene.add(this.spaceDust);
        this.dustVelocities = dustVelocities;
    }

    createDustTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Criar gradiente circular
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(200,200,200,0.6)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        // Aplicar gradiente
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        // Criar textura
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createSun() {
        const config = {
            plasmaRadius: 450,
            plasmaCount: 80000,
            plasmaSize: {min: 5, max: 6},
            // Ajustar posição para ser consistente em todas as cenas
            position: new THREE.Vector3(-600, 150, -2000), // Modificado Y de 300 para 150 e Z de -1500 para -2000
            colors: {
                yellow: 0xffbb00, // Ajustado para um amarelo mais solar
                orange: 0xff7a00  // Mantido laranja
            },
            movement: {
                speed: 0.05,
                turbulence: 15,
                pulseSpeed: 0.05,
                rotationSpeed: 0.05,
                lateralForce: 0.05
            }
        };

        const sunGroup = new THREE.Group();
        const plasma = this.createSunPlasma(config);
        sunGroup.add(plasma);
        sunGroup.position.copy(config.position);

        this.scene.add(sunGroup);
        this.sun = sunGroup;
        this.sunPlasma = plasma;
    }

    createSunPlasma(config) {
        const plasmaParticles = new THREE.BufferGeometry();
        const plasmaPositions = new Float32Array(config.plasmaCount * 3);
        const plasmaSizes = new Float32Array(config.plasmaCount);
        const plasmaColors = new Float32Array(config.plasmaCount * 3);
        
        const color1 = new THREE.Color(config.colors.yellow);
        const color2 = new THREE.Color(config.colors.orange);
        
        for (let i = 0; i < config.plasmaCount; i++) {
            const radius = config.plasmaRadius + (Math.random() * 20 - 10);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            const i3 = i * 3;
            plasmaPositions[i3] = x;
            plasmaPositions[i3 + 1] = y;
            plasmaPositions[i3 + 2] = z;
            
            plasmaSizes[i] = config.plasmaSize.min + Math.random() * (config.plasmaSize.max - config.plasmaSize.min);
            
            // Inicializar com uma cor aleatória entre amarelo e laranja
            const mixFactor = Math.random();
            const color = new THREE.Color().lerpColors(color2, color1, mixFactor);
            plasmaColors[i3] = color.r;
            plasmaColors[i3 + 1] = color.g;
            plasmaColors[i3 + 2] = color.b;
        }

        plasmaParticles.setAttribute('position', new THREE.BufferAttribute(plasmaPositions, 3));
        plasmaParticles.setAttribute('size', new THREE.BufferAttribute(plasmaSizes, 1));
        plasmaParticles.setAttribute('color', new THREE.BufferAttribute(plasmaColors, 3));
        
        const plasmaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                colorYellow: { value: new THREE.Color(config.colors.yellow) },
                colorOrange: { value: new THREE.Color(config.colors.orange) },
                moveSpeed: { value: config.movement.speed },
                turbulence: { value: config.movement.turbulence },
                pulseSpeed: { value: config.movement.pulseSpeed },
                rotationSpeed: { value: config.movement.rotationSpeed },
                lateralForce: { value: config.movement.lateralForce }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                uniform vec3 colorYellow;
                uniform vec3 colorOrange;
                uniform float moveSpeed;
                uniform float turbulence;
                uniform float pulseSpeed;
                uniform float rotationSpeed;
                uniform float lateralForce;
                
                //Funções de ruído melhoradas
                float rand(vec2 co) {
                    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
                }
                
                float noise(vec3 pos) {
                    vec3 fl = floor(pos);
                    vec3 fr = fract(pos);
                    fr = fr * fr * (3.0 - 2.0 * fr);
                    
                    vec2 h = vec2(0.0, 1.0);
                    float n = mix(
                        mix(
                            mix(rand(fl.xy + h.xx), rand(fl.xy + h.yx), fr.x),
                            mix(rand(fl.xy + h.xy), rand(fl.xy + h.yy), fr.x),
                            fr.y
                        ),
                        mix(
                            mix(rand(fl.xy + h.xx + 1.0), rand(fl.xy + h.yx + 1.0), fr.x),
                            mix(rand(fl.xy + h.xy + 1.0), rand(fl.xy + h.yy + 1.0), fr.x),
                            fr.y
                        ),
                        fr.z
                    );
                    return n * 2.0 - 1.0;
                }
                
                void main() {
                    // Cores oscilantes mais rápidas e aleatórias
                    float colorOsc = noise(vec3(position.xy * 0.1, time)) * 0.5 + 0.5;
                    vColor = mix(color, mix(colorOrange, colorYellow, colorOsc), 0.5);
                    
                    vec3 pos = position;
                    
                    // Movimento de rotação
                    float rotAngle = time * rotationSpeed;
                    mat2 rotation = mat2(
                        cos(rotAngle), -sin(rotAngle),
                        sin(rotAngle), cos(rotAngle)
                    );
                    pos.xy = rotation * pos.xy;
                    
                    // Movimento lateral aleatório
                    float lateralNoise = noise(vec3(
                        time * 0.5 + pos.x * 0.1,
                        time * 0.7 + pos.y * 0.1,
                        time * 0.3 + pos.z * 0.1
                    ));
                    vec3 lateral = vec3(
                        lateralNoise,
                        noise(pos.yzx + time),
                        noise(pos.zxy + time)
                    ) * lateralForce;
                    
                    // Movimento caótico em todas as direções
                    float noiseX = noise(vec3(time * moveSpeed + pos.x, pos.y, pos.z));
                    float noiseY = noise(vec3(pos.x, time * moveSpeed + pos.y, pos.z));
                    float noiseZ = noise(vec3(pos.x, pos.y, time * moveSpeed + pos.z));
                    
                    // Turbulência em espiral
                    float spiral = sin(time + length(pos.xy) * 0.3) * 3.0;
                    float heightFactor = (pos.y / length(pos)) * 2.0; // Fator de altura
                    
                    // Combinar todos os movimentos
                    vec3 offset = vec3(
                        noiseX * turbulence + lateral.x + spiral * cos(time),
                        noiseY * turbulence + lateral.y + heightFactor * sin(time * 2.0),
                        noiseZ * turbulence + lateral.z + spiral * sin(time)
                    );
                    
                    // Pulsar com variação por partícula
                    float individualPulse = noise(vec3(pos.xy * 0.1, time * pulseSpeed));
                    float pulse = sin(time * pulseSpeed + length(pos) * 0.1) * 0.3 + individualPulse;
                    
                    // Posição final
                    vec3 newPos = pos + normalize(pos) * offset * (1.0 + pulse);
                    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
                    
                    // Tamanho variável das partículas
                    float sizePulse = 1.0 + (pulse * 0.5) + (rand(pos.xy + time) * 0.5);
                    gl_PointSize = size * (1500.0 / -mvPosition.z) * sizePulse;
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5));
                    if (r > 0.5) discard;
                    
                    float intensity = pow(1.0 - r * 2.0, 2.0);
                    gl_FragColor = vec4(vColor, intensity);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Points(plasmaParticles, plasmaMaterial);
    }

    createPlanets() {
        this.planets = [];
        
        // Função auxiliar para gerar cor aleatória
        const randomColor = () => {
            const colors = [0x00ffff, 0x9932cc, 0xff4400, 0xaaddff, 0x66ff00, 0xffaa00, 0xc0c0c0, 0xff3366];
            return colors[Math.floor(Math.random() * colors.length)];
        };

        // Ajustar as camadas orbitais para distâncias mais próximas
        const sunPos = this.sun.position;
        const orbitLayers = [
            { minDist: 1500, maxDist: 3000, count: 5, minSize: 3, maxSize: 30 },    // Triplicado
            { minDist: 3000, maxDist: 6000, count: 10, minSize: 30, maxSize: 150 }, // Triplicado
            { minDist: 6000, maxDist: 12000, count: 15, minSize: 150, maxSize: 300 } // Aumentado para acompanhar a nova render distance
        ];

        orbitLayers.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                const distance = layer.minDist + Math.random() * (layer.maxDist - layer.minDist);
                const data = {
                    // Tamanho proporcional à distância para manter visibilidade
                    radius: layer.minSize + Math.random() * (layer.maxSize - layer.minSize),
                    color: randomColor(),
                    distance: distance,
                    // Usar método unificado para velocidade
                    speed: this.calculateSpeed(distance),
                    orbitTilt: Math.random() * Math.PI * 2,
                    orbitPhase: Math.random() * Math.PI * 2,
                    rotationAxis: new THREE.Vector3(
                        Math.random() - 0.5,
                        Math.random() - 0.5,
                        Math.random() - 0.5
                    ).normalize(),
                    // Características aleatórias
                    rings: Math.random() < 0.3,
                    multiRings: Math.random() < 0.2,
                    atmosphere: Math.random() < 0.4,
                    crystalline: Math.random() < 0.25,
                    binary: Math.random() < 0.15,
                    // Órbita menos elíptica para evitar distâncias extremas
                    eccentricity: Math.random() * 0.1,
                    tipo: Math.random() > 0.5 ? 'rochoso' : 'gasoso' // Adicionar tipo
                };

                const planetGroup = this.createPlanetGroup(data);
                planetGroup.position.copy(sunPos);
                
                // Adicionar uma escala mínima para garantir visibilidade
                planetGroup.userData.minScale = 0.5;
                planetGroup.userData.originalScale = 1;
                planetGroup.userData.maxScale = 2;
                
                this.scene.add(planetGroup);
                this.planets.push(planetGroup);
            }
        });
    }

    createPlanetGroup(data) {
        const planetGroup = new THREE.Group();
        
        // Textura mais cartunista
        const texture = this.generatePlanetTexture(data.color, data.tipo);

        // Criar gradientes para efeito toon
        const gradientMap = this.generateToonGradient();

        const planetMaterial = new THREE.MeshToonMaterial({
            map: texture,
            color: data.color,
            gradientMap: gradientMap
        });

        const planetGeometry = new THREE.SphereGeometry(data.radius, 32, 32);
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planetGroup.add(planet);

        // Adicionar características especiais
        if (data.rings) {
            if (data.multiRings) {
                // Criar múltiplos anéis com cores e tamanhos mais naturais
                const ringColors = [
                    new THREE.Color(data.color).offsetHSL(0, 0.1, 0.1),
                    new THREE.Color(data.color).offsetHSL(0.02, 0.05, 0),
                    new THREE.Color(data.color).offsetHSL(-0.02, 0.15, -0.1)
                ];

                for (let i = 0; i < 3; i++) {
                    const innerRadius = data.radius * (1.5 + i * 0.2); // Aumentado espaçamento
                    const outerRadius = innerRadius * (1.2 + Math.random() * 0.15); // Aumentado gap
                    
                    const ringGeo = new THREE.RingGeometry(
                        innerRadius,
                        outerRadius,
                        64  // Aumentado número de segmentos
                    );
                    const ringMat = new THREE.MeshBasicMaterial({
                        color: ringColors[i],
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.6 - (i * 0.15),
                        depthWrite: false,
                        blending: THREE.AdditiveBlending
                    });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.x = Math.PI / 2;
                    planetGroup.add(ring);
                }
            } else {
                // Anel único mais realista
                const ringGeometry = new THREE.RingGeometry(
                    data.radius * 1.6, // Aumentado de 1.4 para 1.6
                    data.radius * 2.2, // Aumentado de 1.8 para 2.2
                    64  // Aumentado número de segmentos
                );
                const ringColor = new THREE.Color(data.color).offsetHSL(0, 0.1, 0.05);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    color: ringColor,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.7,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                });
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = Math.PI / 2;
                planetGroup.add(ring);
            }
        }

        if (data.atmosphere) {
            const atmosphereGeometry = new THREE.SphereGeometry(data.radius * 1.3, 32, 32); // Aumentado de 1.2 para 1.3
            const atmosphereMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(data.color).multiplyScalar(1.2), // Clarear levemente a cor
                transparent: true,
                opacity: 0.15, // Reduzido de 0.3 para 0.15
                side: THREE.DoubleSide, // Garantir que a atmosfera seja visível de todos os ângulos
                depthWrite: false, // Evitar artefatos visuais
                blending: THREE.AdditiveBlending // Adicionar blending para efeito mais suave
            });
            const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            planetGroup.add(atmosphere);
        }

        if (data.crystalline) {
            for (let i = 0; i < 8; i++) {
                const spikeGeometry = new THREE.ConeGeometry(data.radius * 0.2, data.radius * 0.5, 4);
                const spikeMaterial = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(data.color).multiplyScalar(1.2),
                    shininess: 100
                });
                const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
                spike.position.setFromSpherical(
                    new THREE.Spherical(
                        data.radius,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI * 2
                    )
                );
                spike.lookAt(0, 0, 0);
                planetGroup.add(spike);
            }
        }

        if (data.binary) {
            // Criar um planeta companheiro menor
            const companionGeo = new THREE.SphereGeometry(data.radius * 0.6, 32, 32);
            const companionMat = new THREE.MeshPhongMaterial({
                color: new THREE.Color(data.color).offsetHSL(0.1, 0, 0)
            });
            const companion = new THREE.Mesh(companionGeo, companionMat);
            companion.position.set(data.radius * 2.5, 0, 0);
            planetGroup.add(companion);
        }

        // Configurar dados da órbita
        planetGroup.userData = {
            distance: data.distance,
            angle: Math.random() * Math.PI * 2,
            speed: data.speed,
            orbitTilt: data.orbitTilt,
            orbitPhase: data.orbitPhase,
            rotationAxis: data.rotationAxis,
            eccentricity: data.eccentricity
        };

        // Verificar se LODController está disponível antes de usar
        if (this.lodController) {
            this.lodController.addObject(planet, {
                minScale: 0.3,
                maxScale: 1.2,
                minDetail: 0.2,
                maxDetail: 1.0,
                customLODLevels: [
                    { distance: 20, detail: 1.0 },
                    { distance: 100, detail: 0.75 },
                    { distance: 200, detail: 0.5 },
                    { distance: 400, detail: 0.25 },
                    { distance: 800, detail: 0.1 }
                ]
            });
        }

        return planetGroup;
    }

    generateToonGradient() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');

        const gradient = context.createLinearGradient(0, 0, 0, 64);
        gradient.addColorStop(0.0, '#ffffff');
        gradient.addColorStop(0.33, '#e0e0e0');
        gradient.addColorStop(0.67, '#888888');
        gradient.addColorStop(1.0, '#444444');

        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);

        const gradientMap = new THREE.CanvasTexture(canvas);
        gradientMap.minFilter = THREE.NearestFilter;
        gradientMap.magFilter = THREE.NearestFilter;

        return gradientMap;
    }

    updatePlanetPosition(planetGroup) {
        const sunPosition = this.sun.position;
        const userData = planetGroup.userData;
        const angle = userData.angle;
        const distance = userData.distance * (1 + userData.eccentricity * Math.cos(angle));
        
        // Criar vetor de base centrado no sol
        const orbitCenter = new THREE.Vector3().copy(sunPosition);
        
        // Calcular posição inicial em relação ao sol
        const position = new THREE.Vector3(
            Math.cos(angle) * distance,
            Math.sin(angle) * Math.cos(userData.orbitTilt) * distance,
            Math.sin(angle) * Math.sin(userData.orbitTilt) * distance
        );

        // Criar quaternion para rotação orbital
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(userData.rotationAxis, userData.orbitPhase);
        position.applyQuaternion(quaternion);
        
        // Adicionar posição do sol
        position.add(orbitCenter);
        
        // Aplicar posição final
        planetGroup.position.copy(position);

        // Rotação própria do planeta mantendo alinhamento com a órbita
        const rotationQuaternion = new THREE.Quaternion();
        rotationQuaternion.setFromAxisAngle(userData.rotationAxis, userData.speed * 2);
        planetGroup.quaternion.multiply(rotationQuaternion);

        // Adicionar ajuste de escala baseado na distância da câmera
        if (this.camera) {
            const distance = this.camera.position.distanceTo(planetGroup.position);
            const scale = Math.max(
                planetGroup.userData.minScale,
                Math.min(
                    planetGroup.userData.maxScale,
                    planetGroup.userData.originalScale * (3000 / distance) // Aumentado de 1000 para 3000
                )
            );
            planetGroup.scale.setScalar(scale);
        }
    }

    createAsteroid() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Gerar textura com tom base 110
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const noise1 = Math.random() * 0.15;
                
                const grayValue = Math.floor(110 + (noise1 * 20));
                const r = grayValue;
                const g = grayValue;
                const b = grayValue;
                
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, y, 1, 1);

                // Reduzida frequência das manchas de 0.97 para 0.993 (menos manchas)
                if (Math.random() > 0.993) {
                    ctx.fillStyle = `rgba(90,90,90,${0.3 + Math.random() * 0.3})`; 
                    ctx.beginPath();
                    ctx.arc(x, y, 3 + Math.random() * 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Aumentar o número de faces do asteroide para 16
        const asteroidGeometry = new THREE.SphereGeometry(8, 16, 16); // Modificado de 8,8,8 para 8,16,16
        const positions = asteroidGeometry.attributes.position;
        
        // Deformar a geometria com variações mais sutis
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Reduzir a intensidade do ruído para 0.1 (era 0.3)
            // e simplificar a função de ruído
            const noise = (Math.sin(x * 1.5) + Math.cos(y * 1.5)) * 0.1;
            
            positions.setXYZ(
                i,
                x + noise,
                y + noise,
                z + noise
            );
        }

        // Criar texture e material
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);

        const asteroidMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.9,
            metalness: 0.1,
            bumpScale: 0.5,
            flatShading: true
        });

        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        asteroid.position.set(0, -9.6, 0);
        
        this.scene.add(asteroid);
        this.asteroid = asteroid;
    }

    updateSpaceDust() {
        if (!this.spaceDust) return;

        const positions = this.spaceDust.geometry.attributes.position;
        const spread = 100;

        for (let i = 0; i < positions.count; i++) {
            // Atualizar posição com velocidade
            positions.setX(i, positions.getX(i) + this.dustVelocities[i * 3]);
            positions.setY(i, positions.getY(i) + this.dustVelocities[i * 3 + 1]);
            positions.setZ(i, positions.getZ(i) + this.dustVelocities[i * 3 + 2]);

            // Verificar limites e reposicionar partículas
            if (Math.abs(positions.getX(i)) > spread / 2) {
                positions.setX(i, -Math.sign(positions.getX(i)) * spread / 2);
            }
            if (Math.abs(positions.getY(i)) > spread / 2) {
                positions.setY(i, -Math.sign(positions.getY(i)) * spread / 2);
            }
            if (Math.abs(positions.getZ(i)) > spread / 2) {
                positions.setZ(i, -Math.sign(positions.getZ(i)) * spread / 2);
            }
        }

        positions.needsUpdate = true;
        this.spaceDust.rotation.y += 0.0001; // Rotação suave
    }

    update() {
        // Atualizar controles da câmera se existirem
        if (this.cameraController) {
            this.cameraController.update();
        }
        
        // Atualização mais lenta para o plasma
        if (this.sunPlasma) {
            this.sunPlasma.material.uniforms.time.value += 0.01 * this.timeScale; // Reduzido de 0.02 para 0.01
        }
        
        // Atualizar poeira espacial
        this.updateSpaceDust();

        this.planets.forEach(planetGroup => {
            const speed = planetGroup.userData.speed;
            // Atualizar ângulo orbital usando timeScale
            planetGroup.userData.angle += speed * this.timeScale;
            
            // Atualizar posição
            this.updatePlanetPosition(planetGroup);
            
            // Rotação própria proporcional à velocidade orbital
            planetGroup.rotation.y += speed * this.timeScale * 2;
        });

        // Verificar se LODController está disponível antes de atualizar
        if (this.lodController) {
            this.lodController.update();
        }

        // Atualizar posição das estrelas
        if (this.stars) {
            const positions = this.stars.geometry.attributes.position.array;
            const spread = 10000; // Aumentado para corresponder ao createStars
            
            for (let i = 0; i < positions.length; i += 3) {
                // Mover cada estrela na direção definida
                positions[i + 0] += this.starsDirection.x * this.starsMovementSpeed * this.timeScale;
                positions[i + 1] += this.starsDirection.y * this.starsMovementSpeed * this.timeScale;
                positions[i + 2] += this.starsDirection.z * this.starsMovementSpeed * this.timeScale;

                // Reposicionar estrelas que saíram do campo de visão
                if (positions[i + 2] > spread/2) {
                    positions[i + 2] = -spread/2;
                }
                // Manter as estrelas dentro dos limites laterais
                if (Math.abs(positions[i]) > spread/2) {
                    positions[i] = Math.sign(positions[i]) * spread/2;
                }
                if (Math.abs(positions[i + 1]) > spread/2) {
                    positions[i + 1] = Math.sign(positions[i + 1]) * spread/2;
                }
            }
            
            this.stars.geometry.attributes.position.needsUpdate = true;
        }

        // Atualizar luz do sol junto com o plasma
        if (this.sunLight && this.sunPlasma) {
            this.sunLight.position.copy(this.sun.position);
        }

        // Animações ou atualizações contínuas aqui
    }

    // Método para ajustar a velocidade global
    setTimeScale(scale) {
        this.timeScale = Math.max(0, scale);
    }

    // Método para controlar a velocidade do movimento das estrelas
    setStarsSpeed(speed) {
        this.starsMovementSpeed = speed;
    }

    // Método para definir a direção do movimento das estrelas
    setStarsDirection(direction) {
        this.starsDirection.copy(direction).normalize();
    }

    generatePlanetTexture(baseColor, tipo = 'rochoso') { // Valor padrão para tipo
        const canvas = document.createElement('canvas');
        canvas.width = 256; // Reduzido para melhor performance
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        const color = new THREE.Color(baseColor);
        const hsl = {};
        color.getHSL(hsl);

        // Cores mais vibrantes
        const baseColors = Array(5).fill().map((_, i) => {
            return new THREE.Color().setHSL(
                hsl.h + (i - 2) * 0.1, // Mais variação no matiz
                Math.min(1, hsl.s * 1.2), // Aumentar saturação
                0.4 + (i * 0.1) // Mais variação no brilho
            ).getStyle();
        });

        // Preencher com padrões divertidos
        if (tipo === 'rochoso') {
            // Criar padrão de manchas coloridas
            ctx.fillStyle = baseColors[2];
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Adicionar manchas coloridas grandes
            for (let i = 0; i < 8; i++) {
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = baseColors[Math.floor(Math.random() * baseColors.length)];
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = 30 + Math.random() * 50;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Adicionar detalhes menores
            for (let i = 0; i < 20; i++) {
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = baseColors[Math.floor(Math.random() * baseColors.length)];
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = 5 + Math.random() * 15;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Planetas gasosos com padrões em listras
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            baseColors.forEach((color, i) => {
                gradient.addColorStop(i / (baseColors.length - 1), color);
            });
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Adicionar listras onduladas
            for (let i = 0; i < 5; i++) {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = baseColors[Math.floor(Math.random() * baseColors.length)];
                for (let y = 0; y < canvas.height; y += 2) {
                    const offset = Math.sin((y + i * 30) * 0.1) * 20;
                    ctx.fillRect(offset, y, canvas.width, 2);
                }
            }
        }

        ctx.globalAlpha = 1;
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    generateNormalMap() {
        // Simplificar o mapa normal para um visual mais cartunista
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

}