# CLAUDE.md — RCI: Regras de Desenvolvimento
> Leia este arquivo antes de qualquer ação. Sem exceção.

---

## CONTEXTO DO PROJETO

**RCI** é uma aplicação web de RPG de mesa com personagens 3D.
- **Frontend:** Vanilla JS + Three.js (sem bundler)
- **Backend:** Node.js + Express + SQLite3
- **Objetivo atual:** Remover gameplay, finalizar fluxo Login → Criação → Seleção de Personagem

**Como rodar:**
```bash
cd server && npm install && npm start   # servidor na porta 3000
# abrir pages/login.html no browser
```

**Não há test runner configurado.** Validação é comportamental: rodar o servidor e testar o fluxo manualmente após cada ticket. Cada ticket documenta o comportamento esperado a ser verificado.

---

## 🤖 INSTRUÇÕES PARA O AGENTE
```
1. Leia este arquivo completo antes de qualquer ação
2. Consulte a documentação relevante ao ticket atual
3. Siga os 10 mandamentos sem exceção
4. Valide o comportamento esperado após cada implementação
5. Nunca trabalhe em mais de um ticket por sessão
6. Termine a sessão com todos os tickets concluídos passando na validação
7. Se encontrar ambiguidade, pergunte antes de implementar
```

---

## ⚖️ OS 10 MANDAMENTOS
```
1.  Leia o CLAUDE.md antes de qualquer coisa
2.  Entenda o que vai ser feito
3.  Descreva o comportamento esperado antes de implementar
4.  Confirme que a mudança quebra o comportamento errado
5.  Implemente
6.  Comportamento correto confirmado → só então avança
7.  Nunca implemente sem entender o comportamento esperado
8.  Nunca escreva código para mascarar um bug — corrija a causa raiz
9.  Se mudar algo, valide o fluxo completo antes de continuar
10. Se algo quebrar, entenda o porquê antes de corrigir
```

---

## PADRÕES DE CÓDIGO
```
Geral:   fn faz 1 coisa · nomes descritivos · sem abreviações obscuras
         sem números mágicos → constante nomeada sempre
         comentário = PORQUÊ não O QUÊ · fn pública → JSDoc quando complexa
         imports: externos primeiro, internos depois
         nunca commitar código comentado — se não usa, deleta
Tamanho: 100–400 linhas por arquivo · 1 responsabilidade por arquivo

JS:  camelCase (vars/fns) · PascalCase (classes) · sem any implícito
     sem console.log de debug no código final — apenas erros reais
```

---

## PADRÕES DE DADOS
```
- Tipo explícito em todo campo
- Campo opcional tem valor default — nunca null sem motivo
- Paths sempre absolutos — nunca relativos ao diretório atual da página
- Datas sempre em ISO 8601
- Nunca salvar estado temporário — só o que importa persistir
- Arquivos de dados legíveis por humano — indentados, sem minificação
```

---

## PADRÕES DE API
```
REST:  URLs = recursos · verbos HTTP = ações
Resp:  envelope único { success, data, error } em toda resposta
HTTP:  200 ok · 201 criado · 400 input inválido · 404 não encontrado · 500 interno
Erros: nunca expor stack trace · código + mensagem amigável ao usuário
Input: sempre validar antes de processar — nunca confiar no cliente

Nunca: misturar responsabilidades numa rota
       retornar formatos diferentes na mesma rota
```

---

## FILOSOFIA DE ERROS
```
- Nunca falhar silenciosamente — sempre logar e comunicar
- Mensagem de erro = o que aconteceu + o que o usuário pode fazer
- Validar inputs no início — não no meio do processo
- Fail fast — detectar problema cedo, não tarde
```

---

## TICKETS
> ✅ = feito · 🔄 = em andamento · ⬜ = pendente

```
✅ #000 — Análise e documentação do projeto (PLANO_FINALIZACAO.md)

✅ #001 — Deletar 15 arquivos de gameplay
          Comportamento esperado: nenhum dos arquivos deletados pode ser
          importado ou referenciado por código que permanece no projeto.

✅ #002 — Corrigir select.html
          - Remover <script> tags de LODController.js e gameState.js
          - Remover botão "Jogar" do HTML
          - Garantir que o modal #deleteModal está estruturalmente correto
          Comportamento esperado: página carrega sem erros de 404 no console.

✅ #003 — Corrigir js/select.js
          - Remover handler do botão playButton
          - Corrigir path '../pages/create.html' → 'create.html'
          - Conectar showDeleteConfirmation() ao modal #deleteModal
          - Remover processCharacters() e checkDatabase() (código morto)
          Comportamento esperado: criar/deletar/visualizar personagem
          funciona sem usar confirm() nativo.

✅ #004 — Corrigir js/create.js
          - Remover animate(), setupResizeHandler(), updateMaterials(),
            resetCharacterCreation() (métodos mortos)
          - Remover handler duplicado de toggleOrbit (linhas 251–263)
          - Corrigir logout: remover window.location.href redundante
          Comportamento esperado: criar personagem funciona, câmera
          toggle funciona, logout redireciona corretamente.

✅ #005 — Corrigir js/database/database.js
          - Fix String() em processCharacterResponse() linha 314
          - Remover verifyUserCredentials() (morto)
          - Remover processCharacterResponse() (morto — nunca chamado)
          - Remover request() e characterOperation() (morto)
          - Corrigir loop recursivo em query() no handler 'Failed to fetch'
          Comportamento esperado: carregar personagens funciona sem crash.

✅ #006 — Corrigir server/server.js
          - Remover dbChar?.close() de SIGTERM e SIGINT
          - Remover rota DELETE /api/character-refs/:refId (tabela errada)
          - Remover rota GET /api/characters/:userId (usa characterRefs, nunca populada)
          - Remover rota GET /api/verify-character/:id (não usada)
          - Remover rota GET /api/character-exists/:id (não usada)
          - Remover rota POST /api/users/exists (não usada pelo cliente)
          - Remover rota POST /api/users (duplicata de /api/users/register)
          - Remover criação do usuário test/test em initDatabase()
          - Remover CREATE TABLE characterRefs (nunca usada)
          Comportamento esperado: servidor sobe e encerra sem erros,
          todas as rotas necessárias respondem corretamente.

✅ #007 — Corrigir js/core/stateManager.js
          - Remover getGameMode() e setGameMode()
          - Remover settings.graphics e settings.controls (gameplay)
          Comportamento esperado: state manager funciona normalmente
          para user, characters e currentCharacter.

✅ #008 — Segurança mínima
          - Hash de senhas com bcrypt no servidor
          - Token: trocar temp_token_{id} por crypto.randomUUID()
          - Validar ownership: DELETE /api/characters/:id só deleta se
            o personagem pertence ao userId do token
          Comportamento esperado: login/cadastro funcionam com senhas
          hasheadas; token não é previsível; usuário não consegue
          deletar personagem de outro usuário.
```

> Cada ticket = 1 objetivo claro + validação de comportamento + commit.
> Nunca feche uma sessão com ticket incompleto.
