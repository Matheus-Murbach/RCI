# RCI — Tabletop RPG

Projeto de treino full-stack com foco em renderização 3D no browser.
Fluxo completo de autenticação, criação e seleção de personagens com preview 3D em tempo real.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vanilla JS + Three.js r157 |
| Backend | Node.js + Express |
| Banco | SQLite3 |
| 3D | WebGL via Three.js (sem bundler) |

---

## Funcionalidades

### Login / Cadastro
<!-- imagem aqui -->

- Registro com validação de usuário único
- Senhas hasheadas com bcrypt
- Sessão mantida via sessionStorage

---

### Criação de Personagem
<!-- imagem aqui -->

- Preview 3D em tempo real com Three.js
- Customização de cores (corpo, pele, detalhe)
- Expressão facial via texto/emoji renderizado em canvas
- Controle de forma 2D (slider de raio topo/base)
- Câmera cinemática com toggle para órbita livre

---

### Seleção de Personagem
<!-- imagem aqui -->

- Lista de personagens do usuário
- Preview 3D do personagem selecionado
- Exclusão com modal de confirmação por nome
- Cena espacial 3D com planetas, sol e poeira cósmica

---

## Como rodar

```bash
cd server
npm install
npm start
```

Abrir `pages/login.html` no browser.

> Servidor sobe na porta `3000`. Banco SQLite criado automaticamente em `js/database/`.

---

## Estrutura

```
pages/          → login.html · create.html · select.html
js/
  auth/         → authGuard.js
  character/    → character.js · characterPreviewController.js
  core/         → stateManager · renderSystem · materialSystem · lightSystem
  database/     → database.js (cliente HTTP)
  map/          → spaceScene.js · baseScene.js
css/            → styles.css · create.css
server/         → server.js (Express + SQLite)
```

---

## Aprendizados aplicados

- Módulos ES6 nativos sem bundler
- Renderização 3D com Three.js (geometria, materiais, shaders, partículas)
- Singleton pattern para sistemas globais (RenderSystem, StateManager)
- REST API com Express e SQLite
- Hash de senhas com bcrypt
- Canvas 2D para textura facial procedural
