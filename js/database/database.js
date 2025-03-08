import { StateManager } from '../core/stateManager.js';

export class Database {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.apiUrl = null;
        this.maxRetries = 3;
        this.retryDelay = 2000;
        // Removendo servidores locais da lista inicial
        this.servers = [];
    }

    async initializeApiUrl() {
        try {
            console.log('🔄 Iniciando conexão com servidor...');
            
            // Primeiro tentar URL do ngrok
            try {
                const response = await fetch('http://localhost:3000/api/server-url', {
                    timeout: 5000,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                const data = await response.json();
                if (data.url) {
                    this.apiUrl = data.url;
                    console.log('✅ Usando URL Ngrok:', this.apiUrl);
                    return true;
                }
            } catch (e) {
                console.warn('⚠️ Ngrok não disponível, tentando conexões alternativas');
            }

            // URLs de fallback
            const fallbackUrls = [
                'http://localhost:3000',
                window.location.origin
            ];

            for (const url of fallbackUrls) {
                try {
                    console.log(`Testando conexão com: ${url}`);
                    // ADICIONAR ESTE LOG
                    console.log('🔍 Tentando conectar em:', url);
                    const response = await fetch(`${url}/api/health`, {
                        timeout: 5000,
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    const data = await response.json();
                    if (data.status === 'ok') {
                        this.apiUrl = url;
                        console.log('✅ Conectado ao servidor:', url);
                        return true;
                    }
                } catch (e) {
                    console.warn(`❌ Falha ao conectar em ${url}:`, e.message);
                }
            }
            throw new Error('Nenhum servidor disponível');
        } catch (error) {
            console.error('❌ Erro de conexão:', error);
            throw error;
        }
    }

    async request(endpoint, options = {}) {
        await this.ensureApiUrl();
        
        console.group('📡 Requisição ao Servidor');
        console.log('🎯 Endpoint:', endpoint);
        console.log('⚙️ Opções:', JSON.stringify(options, null, 2));
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const user = this.stateManager.getUser();
        if (user.token) {
            defaultOptions.headers['Authorization'] = `Bearer ${user.token}`;
            console.log('🔑 Token incluído na requisição');
        }

        try {
            console.log('📤 Enviando requisição para:', `${this.apiUrl}/api/${endpoint}`);
            const response = await fetch(
                `${this.apiUrl}/api/${endpoint}`,
                { ...defaultOptions, ...options }
            );

            const responseData = await response.json();
            console.log('📥 Resposta do servidor:', {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                data: responseData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.groupEnd();
            return responseData;
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            console.groupEnd();
            throw error;
        }
    }

    async query(endpoint, options = {}) {
        await this.ensureApiUrl();
        
        console.group('🔍 Query ao Servidor');
        console.log('URL:', `${this.apiUrl}/api/${endpoint}`);
        console.log('Método:', options.method || 'GET');
        
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.stateManager.getUser().token}`
            };
            
            // Remover header problemático do ngrok
            const response = await fetch(`${this.apiUrl}/api/${endpoint}`, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                },
                redirect: 'follow'
            });
            
            // Verificar se a resposta é HTML
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                // Tentar reconectar usando uma nova URL do ngrok
                console.warn('⚠️ Recebido HTML do ngrok, tentando reconectar...');
                await this.initializeApiUrl();
                // Tentar novamente com a nova URL
                return this.query(endpoint, options);
            }

            const responseText = await response.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
                console.log('📥 Resposta parseada:', responseData);
            } catch (parseError) {
                if (responseText.includes('ngrok')) {
                    throw new Error('Erro de conexão com ngrok - reconectando...');
                }
                console.error('❌ Erro ao processar resposta:', responseText);
                throw new Error('Resposta inválida do servidor');
            }

            if (!response.ok) {
                throw new Error(responseData.message || `Erro HTTP: ${response.status}`);
            }

            console.groupEnd();
            return responseData;

        } catch (error) {
            console.error('❌ Erro na query:', error);
            console.groupEnd();
            
            if (error.message.includes('Failed to fetch')) {
                // Tentar reconectar com servidor
                await this.initializeApiUrl();
                return this.query(endpoint, options);
            }
            
            throw error;
        }
    }

    async createUser(userData) {
        if (!userData?.username || !userData?.password) {
            return { 
                success: false,
                error: 'Dados de usuário incompletos' 
            };
        }

        try {
            console.log('📝 Criando usuário:', userData.username);

            // Usar a rota correta com tratamento de erro adequado
            const result = await this.query('users/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            }).catch(error => {
                console.error('Erro na requisição:', error);
                throw new Error(error.message || 'Erro ao criar usuário');
            });

            if (!result.success) {
                throw new Error(result.message || 'Falha ao criar usuário');
            }

            console.log('✅ Usuário criado:', result);
            return {
                success: true,
                user: result.user
            };

        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error);
            return { 
                success: false,
                error: error.message || 'Erro ao criar usuário'
            };
        }
    }

    async getUserByUsername(username, password = null) {
        await this.ensureApiUrl();
        
        try {
            if (password !== null) {
                console.log('🔑 Tentando login:', { username });
                
                const response = await fetch(`${this.apiUrl}/api/users/login`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                console.log('📥 Resposta do login:', data);

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Erro na autenticação');
                }

                if (!data.user || !data.user.token) {
                    throw new Error('Resposta inválida do servidor');
                }

                // Garantir que o token seja incluído
                const user = {
                    id: data.user.id,
                    username: data.user.username,
                    token: data.user.token
                };

                return { user };
            }

            // Verificar existência
            const response = await fetch(`${this.apiUrl}/api/users/exists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            return {
                exists: response.ok
            };
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return { error: error.message || 'Erro ao tentar fazer login' };
        }
    }

    getHeaders() {
        const stateManager = StateManager.getInstance();
        const user = stateManager.getUser();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (user.token) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }
        return headers;
    }

    async getCharactersByUserId(userId) {
        try {
            console.log('🎮 Buscando Personagens');
            console.log('ID do usuário:', userId);

            await this.ensureApiUrl(); // Garante que this.apiUrl esteja definido

            // ADICIONAR ESTE LOG
            console.log('🔍 this.apiUrl:', this.apiUrl);
            const url = `${this.apiUrl}/api/characters?userId=${userId}`; // Defina a variável url aqui

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Erro ao buscar personagens: ${response.status}`);
            }

            const data = await response.json();
            console.log('🔍 Query ao Servidor');
            console.log('URL:', url);
            console.log('Método: GET');
            console.log('📥 Resposta parseada:', data);

            if (data.success) {
                console.log(`✅ Personagens carregados via characters?userId=${userId}: ${data.characters.length}`);
                return data.characters;
            } else {
                console.warn('Nenhum personagem encontrado ou erro na resposta');
                return [];
            }
        } catch (error) {
            console.error('Erro ao buscar personagens:', error);
            throw error;
        }
    }

    processCharacterResponse(response) {
        if (!response || typeof response !== 'object') {
            throw new Error('Resposta inválida do servidor');
        }

        const charactersData = response.data || response.characters || [];
        const characters = Array.isArray(charactersData) ? charactersData : [charactersData];
        
        // Garantir que todos os campos estejam em camelCase
        return characters.map(char => ({
            id: char.id,
            userId: char.userId,
            name: char.name,
            mainColor: char.mainColor,
            skinColor: char.skinColor,
            accentColor: char.accentColor,
            topRadius: Number(char.topRadius),
            bottomRadius: Number(char.bottomRadius),
            faceExpression: string(char.faceExpression),
            equipment: typeof char.equipment === 'string' ? 
                JSON.parse(char.equipment) : (char.equipment || {}),
            createdAt: char.createdAt
        }));
    }

    async saveCharacter(characterData) {
        return this.characterOperation('create', characterData);
    }

    async deleteCharacter(character) {
        console.log('🗑️ Iniciando deleção do personagem:', character);

        if (!character?.id) {
            console.error('❌ ID do personagem não fornecido:', character);
            return { error: 'ID do personagem não fornecido' };
        }

        try {
            const result = await this.query(`characters/${character.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.stateManager.getUser().token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!result.success) {
                throw new Error('Falha ao deletar personagem');
            }

            console.log('✅ Personagem removido');
            return { success: true };

        } catch (error) {
            console.error('❌ Erro ao deletar personagem:', error);
            return { error: error.message };
        }
    }

    async characterOperation(operation, data) {
        const operations = {
            get: (id) => this.request(`characters/${id}`),
            create: (data) => this.request('characters', {
                method: 'POST',
                body: JSON.stringify(data)
            }),
            update: (id, data) => this.request(`characters/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            }),
            delete: (id) => this.request(`characters/${id}`, {
                method: 'DELETE'
            })
        };

        return operations[operation](data);
    }

    getCurrentUser() {
        return this.stateManager.getUser();
    }

    setCurrentUser(user) {
        this.stateManager.setUser(user);
    }

    clearCurrentUser() {
        this.stateManager.clearState();
    }

    async verifyUserCredentials(username, password) {
        try {
            const options = {
                method: 'POST',
                body: JSON.stringify({ username, password })
            };

            const user = await this.query('login', options);
            if (user.error) {
                return { valid: false };
            }

            StateManager.getInstance().setUser({
                ...user,
                token: `temp_token_${user.id}`
            });

            return {
                valid: true,
                userId: user.id,
                username: user.username
            };
        } catch (error) {
            console.error('Erro na verificação:', error);
            return { valid: false };
        }
    }

    async ensureApiUrl() {
        if (!this.apiUrl) {
            console.log('⚠️ Reconectando ao servidor...');
            let attempts = 0;
            while (attempts < this.maxRetries) {
                try {
                    const success = await this.initializeApiUrl();
                    if (success) {
                        console.log('✅ Reconexão bem sucedida');
                        return true;
                    }
                } catch (error) {
                    attempts++;
                    console.log(`Tentativa ${attempts} falhou:`, error);
                    await new Promise(r => setTimeout(r, this.retryDelay * attempts));
                }
            }
            throw new Error('Falha na conexão após várias tentativas');
        }
        return true;
    }
}
