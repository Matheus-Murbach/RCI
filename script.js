import { Character, DEFAULT_CHARACTER } from './js/character/character.js';

class Item {
    constructor(name, slot) {
        this.name = name;
        this.slot = slot; // 'head', 'leftHand', 'rightHand', 'back'
    }
}

const availableItems = [
    new Item("Chapéu", "head"),
    new Item("Capacete", "head"),
    new Item("Espada", "rightHand"),
    new Item("Escudo", "leftHand"),
    new Item("Cajado", "rightHand"),
    new Item("Mochila", "back"),
    new Item("Capa", "back")
];

const gameState = {
    characters: [],
    currentCharacter: null
}

// Remover variáveis duplicadas e usar as do DEFAULT_CHARACTER
let character3D = null; 

// Mover para o escopo global, antes de todas as outras funções
function createCharacter3D(options = {}) {
    const group = new THREE.Group();
    
    const {
        topRadius = DEFAULT_CHARACTER.topRadius,
        bottomRadius = DEFAULT_CHARACTER.bottomRadius,
        mainColor = DEFAULT_CHARACTER.mainColor,
        skinColor = DEFAULT_CHARACTER.skinColor
    } = options;
    
    // Corpo (cone)
    const bodyGeometry = new THREE.CylinderGeometry(
        topRadius,
        bottomRadius,
        2,
        32
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: mainColor
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.5;
    group.add(body);
    
    // Cabeça (esfera)
    const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({
        color: skinColor
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1;
    group.add(head);
    
    return group;
}

// Event Listeners
document.getElementById('startButton').addEventListener('click', () => {
    hideAllScreens();
    document.getElementById('characterSelect').classList.remove('hidden');
    loadCharacters();
});

document.getElementById('newCharacterButton').addEventListener('click', () => {
    hideAllScreens();
    document.getElementById('characterCreation').classList.remove('hidden');
    initCharacterPreview();
    resetCharacterCreation();
});

document.getElementById('saveCharacter').addEventListener('click', () => {
    const name = document.getElementById('charName').value;
    if (!name) {
        alert('Por favor, digite um nome para o personagem');
        return;
    }
    
    // Verificar se já existe um personagem com este nome
    const existingChar = gameState.characters.find(c => c.name === name);
    if (existingChar) {
        alert('Já existe um personagem com este nome. Por favor, escolha outro nome.');
        return;
    }
    
    const character = new Character(
        name,
        document.getElementById('mainColor').value,
        document.getElementById('skinColor').value,
        document.getElementById('accentColor').value
    );
    
    character.topRadius = topRadius;
    character.bottomRadius = bottomRadius;
    
    gameState.characters.push(character);
    localStorage.setItem('characters', JSON.stringify(gameState.characters));
    
    hideAllScreens();
    document.getElementById('characterSelect').classList.remove('hidden');
    loadCharacters();
});

document.getElementById('backButton').addEventListener('click', () => {
    hideAllScreens();
    document.getElementById('characterSelect').classList.remove('hidden');
    loadCharacters();
});

// Adicionar função auxiliar para esconder todas as telas
function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.add('hidden');
    });
}

function loadCharacters() {
    const savedCharacters = localStorage.getItem('characters');
    if (savedCharacters) {
        gameState.characters = JSON.parse(savedCharacters);
        displayCharacters();
    }
}

function displayCharacters() {
    const list = document.getElementById('characterList');
    list.innerHTML = '';
    
    gameState.characters.forEach(char => {
        const charDiv = document.createElement('div');
        charDiv.className = 'character-item';
        if (gameState.currentCharacter && gameState.currentCharacter.name === char.name) {
            charDiv.classList.add('selected');
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = char.name;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            showDeleteModal(char);
        };
        
        charDiv.onclick = () => selectCharacter(char);
        
        charDiv.appendChild(nameSpan);
        charDiv.appendChild(deleteBtn);
        list.appendChild(charDiv);
    });
}

function showDeleteModal(character) {
    const modal = document.getElementById('deleteModal');
    const charNameSpan = document.getElementById('charNameToDelete');
    const input = document.getElementById('confirmDeleteInput');
    
    charNameSpan.textContent = character.name;
    input.value = '';
    modal.classList.remove('hidden');
    
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn = document.getElementById('cancelDelete');
    
    const confirmHandler = () => {
        if (input.value === character.name) {
            gameState.characters = gameState.characters.filter(c => c.name !== character.name);
            localStorage.setItem('characters', JSON.stringify(gameState.characters));
            modal.classList.add('hidden');
            displayCharacters();
        } else {
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 500);
        }
    };
    
    const cancelHandler = () => {
        modal.classList.add('hidden');
    };
    
    // Remover listeners antigos e adicionar novos
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    
    document.getElementById('confirmDelete').addEventListener('click', confirmHandler);
    document.getElementById('cancelDelete').addEventListener('click', cancelHandler);
}

function initCharacterPreview() {
    const canvas = document.getElementById('characterPreview');
    const previewSection = document.querySelector('.preview-section');
    
    // Setup Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, previewSection.offsetWidth / previewSection.offsetHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    // Remover configuração antiga de luz e usar a mesma da SpaceScene
    const spaceScene = new SpaceScene(scene, camera);
    
    function resizeRenderer() {
        const width = previewSection.offsetWidth;
        const height = previewSection.offsetHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height, false);
    }
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', resizeRenderer);
    resizeRenderer();
    
    // Controles de câmera
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.z = 5;
    controls.update();
    
    let currentTopRadius = 0.75;    // Valor inicial médio
    let currentBottomRadius = 0.75; // Valor inicial médio
    
    character3D = createCharacter3D(); // Modifique esta linha para salvar a referência
    scene.add(character3D);
    
    // Configuração do controle 2D
    const slider2D = document.getElementById('radiusSlider2D');
    const handle = document.getElementById('radiusHandle');
    const topRadiusValue = document.getElementById('topRadiusValue');
    const bottomRadiusValue = document.getElementById('bottomRadiusValue');
    let isDragging = false;

    // Posição inicial do handle
    handle.style.left = '75%';
    handle.style.top = '25%';

    function updateRadiusFromPosition(x, y) {
        const rect = slider2D.getBoundingClientRect();
        const normalizedX = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
        const normalizedY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));

        currentTopRadius = 0.5 + (normalizedX * 0.5);
        currentBottomRadius = 0.5 + (normalizedY * 0.5);

        handle.style.left = `${normalizedX * 100}%`;
        handle.style.top = `${normalizedY * 100}%`;

        topRadiusValue.textContent = currentTopRadius.toFixed(2);
        bottomRadiusValue.textContent = currentBottomRadius.toFixed(2);

        updateCharacterBody(currentTopRadius, currentBottomRadius);
    }

    function updateCharacterBody(topRadius, bottomRadius) {
        if (character3D) {
            const body = character3D.children[0];
            const newGeometry = new THREE.CylinderGeometry(
                topRadius,
                bottomRadius,
                2,
                32
            );
            body.geometry.dispose();
            body.geometry = newGeometry;
        }
    }

    // Event listeners para o controle 2D
    slider2D.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateRadiusFromPosition(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateRadiusFromPosition(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    function createCharacter3D() {
        const group = new THREE.Group();
        
        // Corpo (cone) - usando as variáveis globais
        const bodyGeometry = new THREE.CylinderGeometry(
            currentTopRadius,
            currentBottomRadius,
            2,
            32
        );
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: document.getElementById('mainColor').value
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = -0.5;
        group.add(body);
        
        // Cabeça (esfera)
        const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: document.getElementById('skinColor').value
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1;
        group.add(head);
        
        return group;
    }
    
    function updateCharacter() {
        // Atualizar apenas as cores, mantendo a geometria
        const body = character3D.children[0];
        const head = character3D.children[1];
        
        body.material.color.setStyle(document.getElementById('mainColor').value);
        head.material.color.setStyle(document.getElementById('skinColor').value);
    }
    
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    
    ['mainColor', 'skinColor', 'accentColor'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateCharacter);
    });
    
    animate();
    setupEquipmentSlots();
}

function updateCharacterPreview() {
    if (!character3D) return;
    
    // Atualizar cores
    const body = character3D.children[0];
    const head = character3D.children[1];
    
    body.material.color.setStyle(document.getElementById('mainColor').value);
    head.material.color.setStyle(document.getElementById('skinColor').value);
    
    // Atualizar geometria
    const newBodyGeometry = new THREE.CylinderGeometry(
        topRadius,
        bottomRadius,
        2,
        32
    );
    
    body.geometry.dispose();
    body.geometry = newBodyGeometry;
}

function initCharacterCreation() {
    createItemsList();
    // ...resto do código existente...
}

function createItemsList() {
    const itemsContainer = document.getElementById('availableItems');
    availableItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'item';
        itemElement.textContent = item.name;
        itemElement.dataset.slot = item.slot;
        itemElement.draggable = true;
        
        itemElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify(item));
        });
        
        itemsContainer.appendChild(itemElement);
    });
}

function setupEquipmentSlots() {
    const slots = document.querySelectorAll('.equipment-slot');
    
    slots.forEach(slot => {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            const item = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (slot.dataset.slot === item.slot) {
                slot.textContent = item.name;
                // Aqui você pode atualizar o modelo 3D
            }
        });
    });
}

function resetCharacterCreation() {
    document.getElementById('mainColor').value = DEFAULT_CHARACTER.mainColor;
    document.getElementById('skinColor').value = DEFAULT_CHARACTER.skinColor;
    document.getElementById('accentColor').value = DEFAULT_CHARACTER.accentColor;
    document.getElementById('charName').value = DEFAULT_CHARACTER.name;
    
    topRadius = DEFAULT_CHARACTER.topRadius;
    bottomRadius = DEFAULT_CHARACTER.bottomRadius;
    
    // Reset dos inputs visuais
    document.getElementById('mainColor').value = mainColor;
    document.getElementById('skinColor').value = skinColor;
    document.getElementById('accentColor').value = accentColor;
    document.getElementById('charName').value = '';
    
    // Reset do slider de raios
    const handle = document.getElementById('radiusHandle');
    if (handle) {
        handle.style.left = '50%';
        handle.style.top = '50%';
    }
    
    // Atualizar os valores mostrados
    document.getElementById('topRadiusValue').textContent = topRadius.toFixed(1);
    document.getElementById('bottomRadiusValue').textContent = bottomRadius.toFixed(1);
    
    // Limpar slots de equipamento
    const slots = document.querySelectorAll('.equipment-slot');
    slots.forEach(slot => {
        slot.innerHTML = slot.getAttribute('data-slot');
        slot.classList.remove('equipped');
    });
    
    // Atualizar preview do personagem apenas se já estiver inicializado
    if (character3D) {
        updateCharacterPreview();
    }
}

function selectCharacter(character) {
    gameState.currentCharacter = character;
    document.getElementById('playButton').disabled = false;
    displayCharacters(); // Atualiza a seleção visual
    updateCharacterPreview(character);
}

let previewCharacter3D = null;

function updateCharacterPreview(character = null) {
    if (!previewCharacter3D) {
        initializePreviewScene();
    }
    
    const body = previewCharacter3D.children[0];
    const head = previewCharacter3D.children[1];
    
    if (character) {
        // Se um personagem foi fornecido, use suas cores e dimensões
        body.material.color.setStyle(character.mainColor);
        head.material.color.setStyle(character.skinColor);
        
        const newBodyGeometry = new THREE.CylinderGeometry(
            character.topRadius || 0.75,
            character.bottomRadius || 0.75,
            2,
            32
        );
        body.geometry.dispose();
        body.geometry = newBodyGeometry;
    } else {
        // Se não houver personagem, use os valores padrão globais
        body.material.color.setStyle(mainColor);
        head.material.color.setStyle(skinColor);
        
        const newBodyGeometry = new THREE.CylinderGeometry(
            topRadius,
            bottomRadius,
            2,
            32
        );
        body.geometry.dispose();
        body.geometry = newBodyGeometry;
    }
}

function initializePreviewScene() {
    const canvas = document.getElementById('characterSelectPreview');
    const container = canvas.parentElement;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true,
        alpha: true
    });
    
    // Configurar renderer
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Configurar câmera
    camera.position.z = 5;
    camera.position.y = 0.5;
    
    // Remover configuração antiga de luz e usar a mesma da SpaceScene
    const spaceScene = new SpaceScene(scene, camera);
    
    // Criar controles de órbita
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableZoom = true;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    
    previewCharacter3D = createCharacter3D();
    scene.add(previewCharacter3D);
    
    let animationFrame;
    function animate() {
        animationFrame = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    // Ajustar tamanho quando a janela for redimensionada
    function handleResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    
    window.addEventListener('resize', handleResize);
    
    // Limpar eventos quando a cena for destruída
    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrame);
        controls.dispose();
    };
}

// Adicionar evento para o botão de jogar
document.getElementById('playButton').addEventListener('click', () => {
    if (gameState.currentCharacter) {
        // Aqui você implementará a lógica para iniciar o jogo
        console.log('Iniciando jogo com:', gameState.currentCharacter);
    }
});
