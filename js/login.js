import { authGuard } from './auth/authGuard.js';
import { StateManager } from './core/stateManager.js';

class LoginManager {
    constructor() {
        this.stateManager = StateManager.getInstance();
        this.initializeElements();
        this.addEventListeners();
        this.setupNotificationContainer();

        // Adicionar elementos dos termos
        this.termsModal = document.getElementById('termsModal');
        this.showTermsBtn = document.getElementById('showTermsBtn');
        this.closeTermsBtn = document.getElementById('closeTermsBtn');

        // Adicionar event listeners dos termos
        if (this.showTermsBtn) {
            this.showTermsBtn.addEventListener('click', () => this.showTerms());
        }
        if (this.closeTermsBtn) {
            this.closeTermsBtn.addEventListener('click', () => this.hideTerms());
        }

        this.lastRegisteredCredentials = null; // Adicionar esta linha
    }

    initializeElements() {
        // Elementos principais
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.formsContainer = document.querySelector('.forms-container');
        this.loginBtn = document.querySelector('.btn-login');
        this.registerBtn = document.querySelector('.btn-register');
        this.backBtns = document.querySelectorAll('.btn-back');
        this.titleContainer = document.querySelector('.title-container');

        // Elementos do formulário de login
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
    }

    addEventListeners() {
        // Login
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => {
                this.showLoginForm();
            });
        }

        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Registro
        if (this.registerBtn) {
            this.registerBtn.addEventListener('click', () => this.showRegisterForm());
        }

        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Botões de voltar
        this.backBtns.forEach(btn => {
            btn.addEventListener('click', () => this.hideforms());
        });
    }

    showLoginForm() {
        if (this.titleContainer) {
            this.titleContainer.style.display = 'none';
            this.formsContainer.classList.remove('hidden');
            setTimeout(() => {
                this.formsContainer.classList.add('visible');
                this.loginForm.classList.add('active');
            }, 50);
        }
    }

    showRegisterForm() {
        if (this.titleContainer) {
            this.titleContainer.style.display = 'none';
            this.formsContainer.classList.remove('hidden');
            setTimeout(() => {
                this.formsContainer.classList.add('visible');
                this.registerForm.classList.add('active');
            }, 50);
        }
    }

    hideforms() {
        if (this.formsContainer) {
            this.formsContainer.classList.remove('visible');
            setTimeout(() => {
                this.formsContainer.classList.add('hidden');
                this.titleContainer.style.display = 'block';
                this.loginForm?.classList.remove('active');
                this.registerForm?.classList.remove('active');
            }, 300);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        let submitButton;
        
        try {
            const username = this.usernameInput.value.trim();
            const password = this.passwordInput.value.trim();

            if (!username || !password) {
                this.showError('Preencha todos os campos');
                return;
            }

            submitButton = this.loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            const result = await authGuard.login(username, password);
            console.log('Resultado do login:', result);
            
            if (result.success) {
                this.showSuccess('Login realizado com sucesso!');
                console.log('Estado após login:', {
                    user: this.stateManager.getUser(),
                    isActive: authGuard.isUserActive()
                });
                
                setTimeout(() => {
                    const redirectUrl = this.stateManager.getRedirectUrl() || '/pages/select.html';
                    this.stateManager.setRedirectUrl(null);
                    window.location.replace(redirectUrl);
                }, 1000);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError('Erro ao tentar fazer login');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const termsCheck = document.getElementById('termsCheck');

        // Validação dos termos
        if (!termsCheck.checked) {
            this.showError('Você precisa aceitar os termos de uso');
            return;
        }

        try {
            // Desabilitar botão durante o processo
            const submitButton = e.target.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;

            const result = await authGuard.register({ username, password });

            if (result.success) {
                this.showSuccess(result.message);
                // Armazenar credenciais para auto-preenchimento
                this.lastRegisteredCredentials = { username, password };
                
                // Aguardar a notificação e mudar para o form de login
                setTimeout(() => {
                    this.hideforms();
                    setTimeout(() => {
                        this.showLoginForm();
                        // Auto-preencher campos do login
                        document.getElementById('username').value = username;
                        document.getElementById('password').value = password;
                    }, 300);
                }, 1500);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            console.error('❌ Erro no registro:', error);
            this.showError('Erro ao criar conta. Tente novamente.');
        } finally {
            // Re-habilitar botão
            const submitButton = e.target.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = false;
        }
    }

    // Método auxiliar para mapear campos da API para IDs do formulário
    getFieldId(apiField) {
        const fieldMap = {
            'name': 'regUsername',
            'password': 'regPassword'
        };
        return fieldMap[apiField] || apiField;
    }

    validateRegistration(username, password, termsAccepted) {
        let isValid = true;

        if (!termsAccepted) {
            this.showError('Você precisa aceitar os termos de uso');
            isValid = false;
        }

        const validations = {
            username: [
                { test: v => v.length >= 3, message: 'Nome de usuário deve ter no mínimo 3 caracteres' }
            ],
            password: [
                { test: v => v.length >= 4, message: 'A senha deve ter no mínimo 4 caracteres' }
            ]
        };

        Object.entries(validations).forEach(([field, rules]) => {
            const input = document.getElementById(`reg${field.charAt(0).toUpperCase() + field.slice(1)}`);
            if (input && !this.validateField(input, rules)) {
                isValid = false;
            }
        });

        return isValid;
    }

    showTerms() {
        if (this.termsModal) {
            this.termsModal.classList.remove('hidden');
        } else {
            console.error('Modal de termos não encontrado');
        }
    }

    hideTerms() {
        if (this.termsModal) {
            this.termsModal.classList.add('hidden');
        }
    }

    validateInputs() {
        return this.usernameInput?.value.trim() && this.passwordInput?.value.trim();
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    clearInputs() {
        if (this.usernameInput) this.usernameInput.value = '';
        if (this.passwordInput) this.passwordInput.value = '';
    }

    setupNotificationContainer() {
        // Criar container de notificações se não existir
        if (!document.querySelector('.notification-container')) {
            const container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.querySelector('.notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = 'info';
        if (type === 'success') icon = 'check_circle';
        if (type === 'error') icon = 'error';

        notification.innerHTML = `
            <span class="material-icons icon">${icon}</span>
            <span class="message">${message}</span>
            <button class="close-btn">
                <span class="material-icons">close</span>
            </button>
        `;

        container.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 10);

        // Configurar botão de fechar
        const closeBtn = notification.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.removeNotification(notification));

        // Auto-remover após 5 segundos
        setTimeout(() => this.removeNotification(notification), 5000);
    }

    removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }

    validateField(input, validationRules) {
        const formGroup = input.closest('.form-group');
        const value = input.value.trim();
        let isValid = true;
        let message = '';

        for (const rule of validationRules) {
            if (!rule.test(value)) {
                isValid = false;
                message = rule.message;
                break;
            }
        }

        formGroup.classList.remove('valid', 'invalid');
        formGroup.classList.add(isValid ? 'valid' : 'invalid');

        if (!isValid && input === document.activeElement) {
            this.showNotification(message, 'error');
        }

        return isValid;
    }

    handleRegistrationError(result) {
        const usernameInput = document.getElementById('regUsername');
        const passwordInput = document.getElementById('regPassword');
        
        // Limpar estados anteriores
        [usernameInput, passwordInput].forEach(input => {
            if (input) {
                input.closest('.form-group').classList.remove('valid', 'invalid');
            }
        });

        if (result.status === 400) {
            if (result.message?.toLowerCase().includes('já existente')) {
                usernameInput.closest('.form-group').classList.add('invalid');
                this.showError('Este nome de usuário já está em uso');
                return;
            }

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, messages]) => {
                    const fieldId = this.getFieldId(field);
                    const element = document.getElementById(fieldId);
                    if (element) {
                        element.closest('.form-group').classList.add('invalid');
                        this.showError(Array.isArray(messages) ? messages[0] : messages);
                    }
                });
                return;
            }
        }

        this.showError(result.message || 'Erro no registro');
    }

    async handleLoginSuccess(result) {
        if (result.success) {
            const redirectUrl = this.stateManager.getRedirectUrl();
            this.stateManager.setRedirectUrl(null);
            window.location.href = redirectUrl || '/pages/select.html';
            return true;
        }
        return false;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.loginManager = new LoginManager(); // Permite acesso via console para debug
});
