# Aplicação de Gestão de Comissões Comerciais

Aplicação web para gestão pessoal de comissões comerciais, com cálculo automático baseado no lucro real por artigo, controlo de boa cobrança e verificação de pagamentos.

## 🚀 Stack Tecnológica

- **Frontend**: Next.js 14+ (App Router) com TypeScript
- **Base de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **UI**: Tailwind CSS + Componentes customizados
- **Gráficos**: Recharts
- **Exportação**: jsPDF + xlsx
- **Idioma**: 100% Português de Portugal

## 📋 Pré-requisitos

- Node.js 18+ e npm
- Conta Supabase (gratuita)

## 🔧 Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Criar projeto no [Supabase](https://supabase.com)
2. Na dashboard do projeto, ir a **Settings** → **API**
3. Copiar:
   - **Project URL** (exemplo: `https://xyz.supabase.co`)
   - **anon/public key**

### 3. Configurar Variáveis de Ambiente

Criar ficheiro `.env.local` na raiz do projeto:

```bash
cp .env.local.example .env.local
```

Editar `.env.local` com as suas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 4. Executar Migração da Base de Dados

1. Na dashboard do Supabase, ir a **SQL Editor**
2. Copiar o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Executar o script

**Importante**: O script cria todas as tabelas, funções, triggers e políticas RLS automaticamente.

### 5. Executar Aplicação em Desenvolvimento

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) no browser.

## 📐 Estrutura do Projeto

```
c:/APP/comi/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Páginas de autenticação
│   │   ├── entrar/              # Login
│   │   └── registar/            # Registo
│   ├── (dashboard)/             # Páginas protegidas
│   │   ├── dashboard/           # Dashboard principal
│   │   ├── tipos-artigo/        # Gestão de tipos
│   │   ├── vendas/              # Gestão de vendas
│   │   ├── pagamentos/          # Pagamentos recebidos
│   │   └── relatorios/          # Relatórios e exportações
│   └── api/                     # API routes
├── components/                   # Componentes React
│   ├── ui/                      # Componentes base
│   ├── dashboard/               # Componentes do dashboard
│   ├── vendas/                  # Componentes de vendas
│   └── relatorios/              # Componentes de relatórios
├── lib/                         # Utilitários
│   ├── supabase/                # Cliente Supabase
│   ├── calculos/                # Lógica de cálculo
│   │   ├── lucro.ts            # Cálculo de lucro
│   │   └── comissao.ts         # Cálculo de comissão
│   └── validacoes/              # Validações
├── types/                        # TypeScript types
│   └── database.ts              # Tipos da BD
├── supabase/
│   └── migrations/              # Migrações SQL
└── public/                      # Assets estáticos
```

## 💡 Funcionalidades Principais

### ✅ Já Implementado

- ✅ Esquema de base de dados completo
- ✅ Sistema de tipos TypeScript
- ✅ Autenticação com Supabase
- ✅ Cálculo de lucro (3 métodos)
  - Lucro manual
  - Margem sobre custo
  - Margem sobre venda
- ✅ Cálculo de comissões
- ✅ Dashboard com resumo de comissões
- ✅ Gestão de tipos de artigo (CRUD completo)
- ✅ Componentes UI base

### 🚧 Em Desenvolvimento

- 🚧 Gestão de vendas
- 🚧 Gestão de clientes
- 🚧 Registo de pagamentos
- 🚧 Relatórios e exportação
- 🚧 Gráficos dinâmicos
- 🚧 Sistema de alertas

## 🧮 Métodos de Cálculo de Lucro

A aplicação suporta 3 métodos de cálculo de lucro, com prioridade automática:

### 1️⃣ Lucro Manual (Prioridade Máxima)
```
Lucro Total = Lucro Manual × Quantidade
```

### 2️⃣ Margem sobre Custo
```
Lucro Unitário = Preço Custo × (Percentagem ÷ 100)
Lucro Total = Lucro Unitário × Quantidade
```

### 3️⃣ Margem sobre Venda
```
Lucro Unitário = Preço Venda × (Percentagem ÷ 100)
Lucro Total = Lucro Unitário × Quantidade
```

### Cálculo de Comissão
```
Comissão = Lucro × (Percentagem do Tipo ÷ 100)
```

## 🔐 Segurança

- **Row Level Security (RLS)**: Cada utilizador acede apenas aos seus dados
- **Autenticação**: Email/password via Supabase Auth
- **Middleware**: Proteção de rotas no Next.js
- **Validações**: Client-side e server-side

## 📊 Boa Cobrança

Apenas vendas com estado **"Pago"** são consideradas para comissão validada. Isto garante que só recebe comissão de vendas efetivamente cobradas.

## 🛠️ Scripts Disponíveis

```bash
npm run dev       # Desenvolvimento
npm run build     # Build de produção
npm run start     # Servidor de produção
npm run lint      # Linting
```

## 📝 Próximos Passos

1. Completar páginas de vendas e clientes
2. Implementar sistema de pagamentos
3. Adicionar gráficos no dashboard
4. Criar exportação PDF/Excel
5. Sistema de alertas automáticos
6. Testes unitários

## 📖 Documentação Adicional

- [Decisões Técnicas](./docs/decisoes_tecnicas.md) (será criado)
- [Changelog](./docs/alteracoes.md) (será criado)
- [Plano de Implementação](./docs/implementation_plan.md) (na conversa anterior)

## 🆘 Suporte

Em caso de problemas:
1. Verificar se as variáveis de ambiente estão corretas
2. Confirmar que a migração SQL foi executada
3. Verificar logs do browser (F12)
4. Verificar logs do Supabase

## 📄 Licença

Uso pessoal
