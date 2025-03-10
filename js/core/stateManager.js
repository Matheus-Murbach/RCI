export class StateManager {
    static instance = null;

    constructor() {
        if (StateManager.instance) {
            return StateManager.instance;
        }
        StateManager.instance = this;
        
        this.state = {
            user: {
                id: null,
                username: null,
                token: null
            },
            characters: [],
            currentCharacter: null,
            redirectUrl: null,
            settings: {
                graphics: {
                    quality: 'high',
                    enableEffects: true
                },
                controls: {
                    cinematicMode: true
                }
            }
        };

        this.listeners = new Map();
        this.initialize();

        // Tentar restaurar estado da sessão
        this.loadState();

        this.gameMode = null;
    }

    initialize() {
        // Inicializar com estado vazio
        if (!this.state) {
            this.state = {
                user: {id: null, username: null, token: null},
                characters: [],
                currentCharacter: null,
                redirectUrl: null,
                settings: {
                    graphics: { quality: 'high', enableEffects: true },
                    controls: { cinematicMode: true }
                }
            };
        }
    }

    static getInstance() {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    // Getters
    getUser() {
        return this.state.user;
    }

    getCharacters() {
        return this.state.characters;
    }

    getCurrentCharacter() {
        return this.state.currentCharacter;
    }

    hasCurrentCharacter() {
        try {
            const char = this.state.currentCharacter;
            const hasCharacter = char !== null && 
                               typeof char === 'object' &&
                               char.hasOwnProperty('id') &&
                               char.hasOwnProperty('name');
            
            console.log('🔍 Verificação de personagem:', {
                exists: !!char,
                isValid: hasCharacter,
                character: char
            });
            
            return hasCharacter;
            
        } catch (error) {
            console.error('❌ Erro ao verificar personagem:', error);
            return false;
        }
    }

    getSettings() {
        if (!this.state.settings) {
            this.state.settings = {};
        }
        
        // Carregar tema do localStorage se necessário
        if (!this.state.settings.theme) {
            this.state.settings.theme = localStorage.getItem('theme');
            if (this.state.settings.theme) {
                this.state.settings.loaded = true;
            }
        }
        
        return this.state.settings;
    }

    getRedirectUrl() {
        return this.state.redirectUrl;
    }

    getGameMode() {
        if (!this.gameMode) {
            this.gameMode = localStorage.getItem('gameMode');
        }
        return this.gameMode;
    }

    // Setters com notificação de mudanças
    setUser(userData) {
        this.state.user = userData;
        this.saveState(); // Salvar ao atualizar usuário
        this.notifyListeners('user');
    }

    setCharacters(characters) {
        this.state.characters = characters;
        this.notifyListeners('characters');
    }

    setCurrentCharacter(character) {
        if (!character) {
            console.warn('⚠️ Tentativa de definir personagem nulo');
            return;
        }
        this.state.currentCharacter = character;
        this.notifyListeners('currentCharacter');
    }

    updateSettings(settings) {
        this.state.settings = {...this.state.settings, ...settings};
        
        // Persistir tema
        if (settings.theme) {
            localStorage.setItem('theme', settings.theme);
        }
        
        this.notifyListeners('settings');
    }

    setRedirectUrl(url) {
        this.state.redirectUrl = url;
        this.notifyListeners('redirectUrl');
    }

    setGameMode(mode) {
        console.log('🎮 Definindo modo de jogo:', mode);
        this.gameMode = mode;
        localStorage.setItem('gameMode', mode);
    }

    // Sistema de observadores
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    removeListener(key, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);
        }
    }

    notifyListeners(key) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                callback(this.state[key]);
            });
        }
    }

    // Adicionar métodos para persistência
    saveState() {
        const stateToSave = {
            user: this.state.user,
            currentCharacter: this.state.currentCharacter,
            redirectUrl: this.state.redirectUrl
        };
        
        console.log('💾 Salvando estado:', stateToSave);
        sessionStorage.setItem('appState', JSON.stringify(stateToSave));
    }

    loadState() {
        try {
            const savedState = sessionStorage.getItem('appState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                this.state = {
                    ...this.state,
                    user: parsedState.user || this.state.user,
                    currentCharacter: parsedState.currentCharacter || null,
                    redirectUrl: parsedState.redirectUrl
                };
                console.log('📥 Estado restaurado:', this.state);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar estado:', error);
        }
    }

    // Limpar estado
    clearState() {
        this.state = {
            user: {id: null, username: null, token: null},
            characters: [],
            currentCharacter: null,
            redirectUrl: null,
            settings: this.state.settings
        };
        sessionStorage.removeItem('appState'); // Limpar estado salvo
        this.notifyListeners('user');
        this.notifyListeners('characters');
        this.notifyListeners('currentCharacter');
        this.notifyListeners('redirectUrl');
        this.notifyListeners('settings');
    }
}
