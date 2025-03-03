export class SpaceScene {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.characterModel = null;
        this.init();
    }

    init() {
        this.lodController = null;
        this.initLODController();
        
        // Adicionar controle de velocidade global
        this.baseSpeed = 0.0005;
        this.timeScale = 1.0;
        
        // Adicionar iluminação padrão
        this.setupLighting();
        
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
    }

    // Novo método para calcular velocidade relativa
    calculateSpeed(distance) {
        const baseSpeed = this.baseSpeed * this.timeScale * (1000 / distance);
        
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

    setupLighting() {
        // Luz ambiente para iluminação base
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);

        // Luz direcional principal (sol)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 5, 5);
        this.scene.add(mainLight);

        // Luz direcional secundária (preenchimento)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        // Luz hemisférica para melhorar a iluminação global
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
        this.scene.add(hemiLight);
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
        const spread = 3000;
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
        const particleCount = 300;
        const spread = 100;

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
        const sunGroup = new THREE.Group();
        
        // Núcleo do sol com geometria complexa
        const sunCoreGeometry = new THREE.IcosahedronGeometry(50, 4);
        const sunCoreMaterial = new THREE.MeshBasicMaterial({ // Mudado para MeshBasicMaterial
            color: 0xff6600,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending, // Adicionado blending aditivo
            depthWrite: false // Desativado depth write para evitar artefatos visuais
        });
        const sunCore = new THREE.Mesh(sunCoreGeometry, sunCoreMaterial);
        
        // Sistema de partículas para efeito de plasma
        const plasmaParticles = new THREE.BufferGeometry();
        const plasmaCount = 20000; // Dobrado o número de partículas
        const plasmaPositions = new Float32Array(plasmaCount * 3);
        const plasmaSizes = new Float32Array(plasmaCount);
        const plasmaColors = new Float32Array(plasmaCount * 3); // Novo array para cores
        
        // Função auxiliar para distribuição uniforme em esfera
        const randomSpherePoint = () => {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const radius = 50 + (Math.random() * 5); // Aumentado variação do raio
            
            return {
                x: radius * Math.sin(phi) * Math.cos(theta),
                y: radius * Math.sin(phi) * Math.sin(theta),
                z: radius * Math.cos(phi)
            };
        };

        // Cores para interpolação - ajustadas para cores mais solares
        const color1 = new THREE.Color(0xffdd44); // Amarelo mais quente
        const color2 = new THREE.Color(0xff4400); // Laranja-avermelhado
        
        for (let i = 0; i < plasmaCount; i++) {
            const point = randomSpherePoint();
            const i3 = i * 3;
            
            // Posições
            plasmaPositions[i3] = point.x;
            plasmaPositions[i3 + 1] = point.y;
            plasmaPositions[i3 + 2] = point.z;
            
            // Tamanhos - mais variação
            plasmaSizes[i] = 2 + Math.random() * 4;
            
            // Cores - variação radial
            const distFromCenter = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
            const heightInfluence = (point.y + 50) / 100; // Componente vertical
            const radialInfluence = (distFromCenter - 45) / 10; // Componente radial
            const mix = (heightInfluence + radialInfluence) * 0.5; // Combina os dois efeitos
            const color = new THREE.Color().lerpColors(color2, color1, mix);
            
            plasmaColors[i3] = color.r;
            plasmaColors[i3 + 1] = color.g;
            plasmaColors[i3 + 2] = color.b;
        }

        plasmaParticles.setAttribute('position', new THREE.BufferAttribute(plasmaPositions, 3));
        plasmaParticles.setAttribute('size', new THREE.BufferAttribute(plasmaSizes, 1));
        plasmaParticles.setAttribute('color', new THREE.BufferAttribute(plasmaColors, 3));
        
        const plasmaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec3 pos = position;
                    
                    // Movimento do plasma melhorado
                    float noise = sin(time * 2.0 + pos.x * 0.7) * 
                                cos(time * 1.5 + pos.y * 0.7) * 
                                sin(time * 1.0 + pos.z * 0.7) * 0.7;
                                
                    // Adicionar efeito de pulso
                    float pulse = sin(time * 0.5) * 0.1 + 1.0;
                    
                    vec3 newPos = pos + normalize(pos) * (noise * 3.0 + pulse);
                    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
                    gl_PointSize = size * (1200.0 / -mvPosition.z) * pulse;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5));
                    if (r > 0.5) discard;
                    
                    float intensity = 1.0 - (r * 2.0);
                    gl_FragColor = vec4(vColor, intensity);
                }
            `,
            transparent: true,
            depthWrite: false
        });
        
        const plasma = new THREE.Points(plasmaParticles, plasmaMaterial);
        
        // Adicionar luzes
        const sunLight = new THREE.PointLight(0xff7700, 2.0, 1000); // Reduzida intensidade
        const glowLight = new THREE.PointLight(0xff5500, 1.5, 500); // Reduzida intensidade
        
        // Montar o grupo do sol
        sunGroup.add(sunCore);
        sunGroup.add(plasma);
        sunGroup.add(sunLight);
        sunGroup.add(glowLight);
        
        sunGroup.position.set(-200, 100, -500);
        this.scene.add(sunGroup);
        
        // Guardar referências para animação
        this.sun = sunGroup;
        this.sunPlasma = plasma;
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
            { minDist:  500, maxDist: 1000, count:  5, minSize:  1, maxSize: 10 },
            { minDist: 1000, maxDist: 1500, count: 10, minSize: 10, maxSize: 50 },
            { minDist: 1500, maxDist: 2000, count: 15, minSize: 50, maxSize: 100},

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
        
        // Criar texturas diretamente
        const texture = this.generatePlanetTexture(data.color, data.tipo);
        const normalMap = this.generateNormalMap();

        const planetMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(2, 2),
            roughness: 0.7,
            metalness: 0.1
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
                    const innerRadius = data.radius * (1.3 + i * 0.15);
                    const outerRadius = innerRadius * (1.1 + Math.random() * 0.1);
                    
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
                    data.radius * 1.4,
                    data.radius * 1.8,
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
            const atmosphereGeometry = new THREE.SphereGeometry(data.radius * 1.2, 32, 32);
            const atmosphereMaterial = new THREE.MeshPhongMaterial({
                color: data.color,
                transparent: true,
                opacity: 0.3
            });
            const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            planetGroup.add(atmosphere);
        }

        if (data.crystalline) {
            for (let i = 0; i < 8; i++) {
                const spikeGeometry = new THREE.ConeGeometry(data.radius * 0.2, data.radius * 0.5, 4);
                const spikeMaterial = new THREE.MeshPhongMaterial({
                    color: data.color,
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
                    planetGroup.userData.originalScale * (1000 / distance)
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
        // Atualizar o sol
        if (this.sunPlasma) {
            this.sunPlasma.material.uniforms.time.value += 0.01 * this.timeScale;
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
            const spread = 3000;
            
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

        // Animações ou atualizações contínuas aqui
        if (this.characterModel) {
            this.characterModel.rotation.y += 0.01;
        }
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

        // Pré-calcular cores para reutilização
        const baseColors = Array(5).fill().map((_, i) => {
            return new THREE.Color().setHSL(
                hsl.h + (i - 2) * 0.02,
                hsl.s,
                hsl.l * (0.8 + i * 0.05)
            ).getStyle();
        });

        // Preencher com cor base
        ctx.fillStyle = baseColors[2];
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Adicionar detalhes com padrões otimizados
        if (tipo === 'rochoso') {
            // Usar padrões maiores para menos operações
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = 5 + Math.random() * 15;
                
                ctx.fillStyle = baseColors[Math.floor(Math.random() * baseColors.length)];
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Padrão para planetas gasosos - usando gradientes
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            baseColors.forEach((color, i) => {
                gradient.addColorStop(i / (baseColors.length - 1), color);
            });
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    generateNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Criar padrão de normal map mais eficiente
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        // Usar um padrão de Perlin Noise simplificado
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            
            const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
            
            data[i] = 128 + noise * 127;     // R
            data[i + 1] = 128 + noise * 127; // G
            data[i + 2] = 255;               // B
            data[i + 3] = 255;               // A
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    updateCharacterModel(character) {
        console.log('🎮 Atualizando modelo do personagem:', character);

        try {
            // Validar e converter dados do personagem
            const config = {
                topRadius: parseFloat(character.topRadius || 0.75),
                bottomRadius: parseFloat(character.bottomRadius || 0.75),
                mainColor: character.mainColor || '#FF0000',
                skinColor: character.skinColor || '#FFA07A',
                accentColor: character.accentColor || '#0000FF'
            };

            console.log('Configurações validadas:', config);

            // Remover modelo anterior se existir
            if (this.characterModel) {
                this.scene.remove(this.characterModel);
            }

            // Criar novo modelo com as configurações corretas
            const group = new THREE.Group();
            
            // Corpo (cilindro) com configurações validadas
            const bodyGeometry = new THREE.CylinderGeometry(
                config.topRadius,
                config.bottomRadius,
                2,
                32
            );
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(config.mainColor)
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = -0.5;
            group.add(body);
            
            // Cabeça (esfera) com cor correta
            const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
            const headMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(config.skinColor)
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 1;
            group.add(head);

            // Adicionar à cena
            this.characterModel = group;
            this.scene.add(this.characterModel);

            console.log('✅ Modelo atualizado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao atualizar modelo:', error);
        }
    }
}