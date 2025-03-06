import { CHARACTER_CONFIG } from '../character/character.js';

export class Database {
    constructor() {
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
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const token = localStorage.getItem('userToken');
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(
                `${this.apiUrl}/api/${endpoint}`,
                { ...defaultOptions, ...options }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            throw error;
        }
    }

    async query(endpoint, options = {}) {
        await this.ensureApiUrl();

        const url = `${this.apiUrl}/api/${endpoint}`;
        console.log('🔍 Fazendo requisição para:', url);

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro na resposta:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('📥 Resposta:', data);
            return data;

        } catch (error) {
            console.error('❌ Erro na requisição:', error);
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
                console.log('🔑 Tentando login:', { username, apiUrl: this.apiUrl });
                
                const response = await fetch(`${this.apiUrl}/api/users/login`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password }),
                    timeout: 10000 // Aumentar timeout para redes móveis
                });

                const data = await response.json();
                console.log('📥 Resposta do login:', data);

                if (!response.ok) {
                    throw new Error(data.message || 'Erro na autenticação');
                }

                if (!data.success || !data.user) {
                    throw new Error('Resposta inválida do servidor');
                }

                localStorage.setItem('userToken', data.user.token);
                return { user: data.user };
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

    async getCharactersByUserId(userId) {
        try {
            console.log('🔍 Buscando personagens no banco para usuário:', userId);
            
            const response = await this.query(`characters?userId=${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                }
            });

            console.log('📊 Dados brutos do servidor:', response);

            const charactersData = response.data || response.characters || [];
            const characters = Array.isArray(charactersData) ? charactersData : [charactersData];
            
            const mappedCharacters = characters.map(char => {
                console.log('🔍 Dados brutos recebidos do banco:', char.face_expression);

                // Converter camelCase para snake_case
                const mapped = {
                    id: char.id,
                    user_id: char.userId || userId,
                    name: char.name,
                    main_color: char.mainColor || char.main_color,
                    skin_color: char.skinColor || char.skin_color,
                    accent_color: char.accentColor || char.accent_color,
                    top_radius: char.topRadius || char.top_radius,
                    bottom_radius: char.bottomRadius || char.bottom_radius,
                    face_expression: char.faceExpression || char.face_expression,
                    equipment: char.equipment
                };

                // Validar e aplicar valores padrão
                Object.entries(mapped).forEach(([key, value]) => {
                    if (value === undefined || value === null) {
                        console.warn(`⚠️ Campo ${key} indefinido, usando valor padrão`);
                        const defaultKey = key
                            .split('_')
                            .map((part, i) => i > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part)
                            .join('');
                        mapped[key] = CHARACTER_CONFIG[defaultKey];
                    }
                });

                console.log('✨ Dados mapeados para snake_case:', mapped);
                return mapped;
            });

            console.log('✅ Personagens processados:', mappedCharacters);
            return mappedCharacters;

        } catch (error) {
            console.error('❌ Erro ao buscar personagens:', error);
            throw error;
        }
    }

    async saveCharacter(characterData) {
        console.log('💾 Iniciando salvamento do personagem:', characterData);

        try {
            // Validar campos obrigatórios usando snake_case
            const requiredFields = {
                user_id: 'ID do usuário',
                name: 'Nome do personagem',
                face_expression: 'Expressão facial',
                main_color: 'Cor principal',
                skin_color: 'Cor da pele',
                accent_color: 'Cor do rosto',
                top_radius: 'Raio superior',
                bottom_radius: 'Raio inferior'
            };

            // Verificar campos nulos ou undefined
            for (const [field, label] of Object.entries(requiredFields)) {
                if (!characterData[field]) {
                    throw new Error(`Campo ${label} não pode ser vazio`);
                }
            }

            // Converter números e garantir formato correto
            const formattedData = {
                userId: characterData.user_id,
                name: characterData.name,
                mainColor: characterData.main_color,
                skinColor: characterData.skin_color,
                accentColor: characterData.accent_color,
                topRadius: Number(characterData.top_radius),
                bottomRadius: Number(characterData.bottom_radius),
                faceExpression: characterData.face_expression,
                equipmentData: characterData.equipment_data || '{}'
            };

            // Validar números
            if (isNaN(formattedData.topRadius) || isNaN(formattedData.bottomRadius)) {
                throw new Error('Valores de raio inválidos');
            }

            console.log('📤 Dados formatados para envio:', formattedData);

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify(formattedData)
            };

            const result = await this.query('characters', options);
            return result;

        } catch (error) {
            console.error('❌ Erro detalhado ao salvar:', error);
            throw error;
        }
    }

    async deleteCharacter(character) {
        console.log('🗑️ Iniciando deleção do personagem:', character);

        if (!character?.id) {
            console.error('❌ ID do personagem não fornecido:', character);
            return { error: 'ID do personagem não fornecido' };
        }

        try {
            // Deletar personagem diretamente
            const result = await this.query(`characters/${character.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
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
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                console.log('Dados do usuário recuperados do localStorage:', user);
                return user;
            }
            console.log('Nenhum dado de usuário encontrado no localStorage');
            return null;
        } catch (error) {
            console.error('Erro ao recuperar dados do usuário:', error);
            return null;
        }
    }

    setCurrentUser(user) {
        try {
            console.log('Salvando dados do usuário:', user);
            localStorage.setItem('currentUser', JSON.stringify(user));
        } catch (error) {
            console.error('Erro ao salvar dados do usuário:', error);
        }
    }

    clearCurrentUser() {
        localStorage.removeItem('currentUser');
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

            localStorage.setItem('userToken', `temp_token_${user.id}`);

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
