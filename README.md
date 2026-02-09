
# 🧠 NeuroStudy AI - Plataforma Educacional de Alta Performance

![Project Status](https://img.shields.io/badge/status-production_ready-emerald?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/stack-React_|_TypeScript_|_Firebase-blue?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-OpenAI_GPT_4o-purple?style=for-the-badge)

> **Uma solução EdTech completa que une Gamificação, Inteligência Artificial e Gestão de Negócios em um ecossistema imersivo.**

---

## 🚀 Sobre o Projeto

O **NeuroStudy AI** não é apenas um site de cursos; é um **SaaS (Software as a Service) educacional completo**. O projeto foi concebido para resolver três dores principais do ensino online: falta de engajamento (resolvido via Gamificação), falta de personalização (resolvido via Tutoria por IA) e gestão de vendas (resolvido via Painel Administrativo integrado e Pixel Tracking).

A aplicação utiliza uma arquitetura moderna, focada em performance, escalabilidade e uma UX (Experiência do Usuário) premium baseada em Glassmorphism.

---

## 🛠️ Tech Stack & Arquitetura

O projeto segue os princípios de **Clean Code** e **Separation of Concerns**.

### Frontend Core
- **React 18 & TypeScript**: Tipagem estrita para robustez e manutenibilidade.
- **Vite**: Build tool de próxima geração para performance extrema.
- **Tailwind CSS**: Estilização utilitária com configuração personalizada de temas e animações.
- **Lucide React**: Iconografia otimizada e consistente.

### Backend & Serviços (Serverless)
- **Firebase Authentication**: Gestão segura de identidades e controle de acesso baseado em cargos (RBAC).
- **Firebase Realtime Database**: Sincronização de dados em tempo real (Chats, Gamificação, Leads).
- **OpenAI API (GPT-4o-mini & Vision)**: Motor de inteligência para o Chat Tutor e Correção de Redação via OCR.
- **Vercel Serverless Functions**: API routes para processamento seguro de requisições sensíveis.

### Padrões de Projeto Utilizados
- **Service Layer Pattern**: Lógica de negócios isolada em serviços (`databaseService`, `authService`, `aiService`), desacoplando a UI dos dados.
- **Optimistic UI Updates**: Atualizações instantâneas de interface (ex: Likes, XP) antes da confirmação do servidor para sensação de rapidez.
- **Componentização Atômica**: Componentes reutilizáveis e isolados.
- **Lazy Loading**: Carregamento sob demanda de módulos pesados.

---

## ✨ Funcionalidades Principais

### 1. 🎓 Ambiente de Estudo Imersivo (LMS)
- **Player de Vídeo Otimizado**: Integração com YouTube com controle de estado.
- **Material de Apoio & Markdown**: Renderização profissional de textos e resumos.
- **Sistema de Tópicos e Subtópicos**: Navegação hierárquica complexa entre matérias.

### 2. 🎮 Gamificação Avançada
- **Sistema de XP e Níveis**: Algoritmo de progressão com 20+ patamares (Bronze a Grande Mestre).
- **Ranking Competitivo**: Leaderboard Semanal (com reset automático) e Geral.
- **Streak & Recompensas**: Incentivo ao login diário e consistência.
- **Feedback Visual**: Animações de "Level Up" e toasts de conquista de XP.

### 3. 🤖 Inteligência Artificial (NeuroAI)
- **Tutor Contextual**: Chatbot que sabe exatamente qual aula o aluno está assistindo para tirar dúvidas específicas (RAG simplificado).
- **Correção de Redação via Visão Computacional**: O aluno envia uma foto do texto manuscrito, e a IA transcreve, corrige gramática, analisa coerência com base nas competências do ENEM e atribui nota.
- **Explicação de Erros**: Ao errar uma questão, a IA explica o raciocínio correto personalizado para a escolha do aluno.

### 4. 💼 Gestão de Negócios & Admin
- **Funil de Vendas Integrado**: Landing Page com VSL (Video Sales Letter) e captura de Leads.
- **Checkout & Financeiro**: Integração com links de pagamento (Kirvano) e gerador de **QR Code PIX Dinâmico** (algoritmo CRC16 implementado manualmente).
- **Gestão de Leads (CRM)**: Pipeline visual de aprovação de alunos (Lead -> Aluno) com controle de planos e vencimentos.
- **CMS de Conteúdo**: Criação e edição de Aulas, Questões e Simulados diretamente na plataforma.
- **Pixel Tracking**: Serviço de rastreamento de eventos (PageView, InitiateCheckout, Purchase) para campanhas de marketing (Meta Ads).

---

## 📸 Previews

| Dashboard do Aluno | Correção de Redação IA |
|:------------------:|:----------------------:|
| *Visualização de métricas e progresso* | *Análise de manuscrito e feedback* |

| Ranking Competitivo | Painel Administrativo |
|:-------------------:|:---------------------:|
| *Leaderboard semanal e geral* | *Gestão de usuários e conteúdo* |

---

## ⚙️ Instalação e Execução

Este projeto utiliza Node.js e NPM/Yarn.

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/neurostudy-platform.git

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente (.env)
# VITE_FIREBASE_API_KEY=...
# VITE_OPENAI_API_KEY=...

# 4. Execute o servidor de desenvolvimento
npm run dev
```

---

## 💡 Destaques de Código

### Algoritmo de Geração de PIX (Interoperabilidade Bancária)
Implementação pura em TypeScript do padrão EMV (CRC16-CCITT) para geração de payloads "Copia e Cola" sem dependências externas pesadas.

```typescript
// services/pixService.ts (Snippet)
getCRC16: (payload: string): string => {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    // ... bitwise operations ...
    return crc.toString(16).toUpperCase().padStart(4, '0');
}
```

### Otimização de Performance
Uso de `React.memo` e virtualização de listas para renderizar bancos de questões e rankings com milhares de entradas sem travar a thread principal.

---

## 🔮 Futuro do Projeto

- [ ] Implementação de **Testes Unitários** (Jest/Testing Library).
- [ ] Integração com **WebSockets** para multiplayer em tempo real nos simulados.
- [ ] Versão **PWA (Progressive Web App)** para instalação nativa em mobile.
- [ ] Migração para **Next.js** para otimização de SEO na Landing Page (SSR).

---

## 👨‍💻 Autor

Desenvolvido com foco em excelência técnica e impacto de produto.

**[Seu Nome]**
*Senior Frontend Engineer*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/seu-perfil)
[![Portfolio](https://img.shields.io/badge/Portfolio-000000?style=for-the-badge&logo=About.me&logoColor=white)](https://seu-portfolio.com)
