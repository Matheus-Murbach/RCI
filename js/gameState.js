export const gameState = {
    currentCharacter: null,
    characters: [],
    scene: null,
    camera: null,
    renderer: null,

    loadCharacters() {
        try {
            const savedCharacters = localStorage.getItem('characters');
            this.characters = savedCharacters ? JSON.parse(savedCharacters) : [];
            return this.characters;
        } catch (error) {
            console.error('Erro ao carregar personagens:', error);
            return [];
        }
    },

    saveCharacter(character) {
        try {
            const existingIndex = this.characters.findIndex(c => c.name === character.name);
            
            if (existingIndex >= 0) {
                this.characters[existingIndex] = character;
            } else {
                this.characters.push(character);
            }
            
            localStorage.setItem('characters', JSON.stringify(this.characters));
            return true;
        } catch (error) {
            console.error('Erro ao salvar personagem:', error);
            return false;
        }
    },

    updateCharacterModel(character) {
        this.currentCharacter = character;
        // Implementação do update do modelo 3D aqui
    },

    initializeScene(canvas, container) {
        // Criar cena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Configurar câmera
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 5;

        // Configurar renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(width, height);
        
        // Configurar controles básicos
        this.controls = new THREE.OrbitControls(this.camera, canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Adicionar redimensionamento responsivo
        window.addEventListener('resize', () => this.handleResize(container));

        return true;
    },

    handleResize(container) {
        if (!this.camera || !this.renderer) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
};
