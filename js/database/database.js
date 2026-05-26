import { StateManager } from '../core/stateManager.js';

export class Database {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.apiUrl = null;
        this.maxRetries = 3;
        this.retryDelay = 2000;
    }

    async initializeApiUrl() {
        const fallbackUrls = [
            'http://localhost:3000',
            window.location.origin
        ];

        for (const url of fallbackUrls) {
            try {
                const response = await fetch(`${url}/api/health`, {
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    this.apiUrl = url;
                    console.log('✅ Conexão estabelecida com:', this.apiUrl);
                    return true;
                }
            } catch (e) {
                console.warn(`⚠️ Não foi possível conectar a ${url}:`, e.message);
            }
        }

        throw new Error('Não foi possível estabelecer conexão com o servidor');
    }

    async ensureApiUrl() {
        if (this.apiUrl) return true;

        let attempts = 0;
        while (attempts < this.maxRetries) {
            try {
                const success = await this.initializeApiUrl();
                if (success) return true;
            } catch (error) {
                attempts++;
                if (attempts >= this.maxRetries) break;
                await new Promise(r => setTimeout(r, this.retryDelay * attempts));
            }
        }
        throw new Error('Falha na conexão após várias tentativas');
    }

    getHeaders() {
        const user = this.stateManager.getUser();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (user.token) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }
        return headers;
    }

    async query(endpoint, options = {}) {
        await this.ensureApiUrl();

        try {
            const response = await fetch(`${this.apiUrl}/api/${endpoint}`, {
                ...options,
                headers: {
                    ...this.getHeaders(),
                    ...options.headers
                },
                redirect: 'follow'
            });

            const responseText = await response.text();
            let responseData;

            try {
                responseData = JSON.parse(responseText);
            } catch {
                throw new Error('Resposta inválida do servidor');
            }

            if (!response.ok) {
                throw new Error(responseData.message || `Erro HTTP: ${response.status}`);
            }

            return responseData;
        } catch (error) {
            console.error('❌ Erro na query:', error);
            throw error;
        }
    }

    async createUser(userData) {
        if (!userData?.username || !userData?.password) {
            return { success: false, error: 'Dados de usuário incompletos' };
        }

        try {
            const result = await this.query('users/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (!result.success) {
                throw new Error(result.message || 'Falha ao criar usuário');
            }

            return { success: true, user: result.user };
        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error);
            return { success: false, error: error.message || 'Erro ao criar usuário' };
        }
    }

    async getUserByUsername(username, password = null) {
        await this.ensureApiUrl();

        try {
            if (password !== null) {
                const response = await fetch(`${this.apiUrl}/api/users/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Erro na autenticação');
                }

                if (!data.user || !data.user.token) {
                    throw new Error('Resposta inválida do servidor');
                }

                return {
                    user: {
                        id: data.user.id,
                        username: data.user.username,
                        token: data.user.token
                    }
                };
            }

            const response = await fetch(`${this.apiUrl}/api/users/exists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            return { exists: response.ok };
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return { error: error.message || 'Erro ao tentar fazer login' };
        }
    }

    async getCharactersByUserId(userId) {
        await this.ensureApiUrl();

        const url = `${this.apiUrl}/api/characters?userId=${userId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar personagens: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            return data.characters;
        }

        return [];
    }

    async saveCharacter(characterData) {
        return this.query('characters', {
            method: 'POST',
            body: JSON.stringify(characterData)
        });
    }

    async deleteCharacter(character) {
        if (!character?.id) {
            return { error: 'ID do personagem não fornecido' };
        }

        const userId = this.stateManager.getUser().id;
        if (!userId) {
            return { error: 'Usuário não autenticado' };
        }

        try {
            const result = await this.query(`characters/${character.id}`, {
                method: 'DELETE',
                body: JSON.stringify({ userId })
            });

            if (!result.success) {
                throw new Error('Falha ao deletar personagem');
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao deletar personagem:', error);
            return { error: error.message };
        }
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
}
