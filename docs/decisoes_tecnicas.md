# Decisões Técnicas do Projeto

Este ficheiro documenta todas as decisões técnicas e de negócio tomadas durante o desenvolvimento.

---

## Decisões de Arquitetura

### Stack Tecnológica
**Data:** 2026-01-21  
**Decisão:** Next.js 16 + Supabase + TypeScript  
**Justificação:**
- Next.js oferece SSR, otimização automática e App Router moderno
- Supabase providencia base de dados PostgreSQL com autenticação integrada e RLS
- TypeScript garante type safety e melhor manutenibilidade
- Ecossistema completo para aplicações web modernas

**Alternativas Consideradas:**
- React + Node.js + PostgreSQL (mais complexo de configurar)
- PHP + MySQL (menos moderno, sem type safety)

---

### Interface de Utilizador
**Data:** 2026-01-21  
**Decisão:** Tailwind CSS + shadcn/ui  
**Justificação:**
- Tailwind permite customização rápida e consistente
- shadcn/ui oferece componentes acessíveis e personalizáveis
- Design system moderno e responsivo

---

## Decisões de Negócio

### Pagamentos Parciais
**Data:** 2026-01-21  
**Decisão:** Aguardar aprovação do utilizador  
**Estado:** PENDENTE  
**Opções:**
1. Desbloquear comissão proporcionalmente ao pagamento
2. Aguardar pagamento total antes de validar comissão

**Impacto:** 
- Opção 1: Permite receber comissões mais cedo, mas requer cálculos proporcionais
- Opção 2: Mais simples, mas atrasa validação de comissões

---

### Alteração de Percentagens de Comissão
**Data:** 2026-01-21  
**Decisão:** Apenas afeta vendas futuras  
**Justificação:**
- Evita recalcular comissões já acordadas
- Mantém histórico de percentagens por tipo de artigo
- Transparência e consistência

**Implementação:**
- Tabela `historico_regras_comissao` guarda todas as alterações
- Cada venda guarda a percentagem vigente no momento da criação

---

### Prioridade de Métodos de Cálculo
**Data:** 2026-01-21  
**Decisão:** Manual > Margem Custo > Margem Venda  
**Justificação:**
- Lucro manual é o mais preciso (inserido diretamente)
- Margem sobre custo é mais comum em vendas B2B
- Margem sobre venda é backup para casos específicos

**Implementação:**
```typescript
if (lucro_manual) return lucro_manual;
if (preco_custo && percentagem_custo) return calcularMargemCusto();
if (preco_venda && percentagem_venda) return calcularMargemVenda();
return 0;
```

---

### Segurança e Isolamento de Dados
**Data:** 2026-01-21  
**Decisão:** Row Level Security (RLS) em todas as tabelas  
**Justificação:**
- Cada utilizador vê apenas os seus dados
- Proteção a nível de base de dados (não apenas aplicação)
- Suporte nativo do Supabase

**Implementação:**
```sql
CREATE POLICY "isolamento_utilizador"
  ON [tabela] FOR ALL
  USING (utilizador_id = auth.uid());
```

---

### Exportação de Dados
**Data:** 2026-01-21  
**Decisão:** PDF (relatórios) + Excel (dados detalhados)  
**Justificação:**
- PDF para apresentações e arquivo
- Excel para análise e manipulação de dados
- Formatos universais e compatíveis

---

## Regras de Negócio

### Boa Cobrança
**Regra:** Comissão só é validada quando venda está "Pago"  
**Exceção:** Configuração futura pode permitir validação parcial  
**Razão:** Garantir que comissões correspondem a vendas efetivamente cobradas

### Cálculo de Comissão
**Fórmula:** `Comissão = Lucro × (Percentagem do Tipo de Artigo / 100)`  
**Aplicação:** Por linha de venda, depois agregado por venda  
**Validação:** Percentagem entre 0-100%

### Alertas de Divergência
**Trigger:** Diferença > ±5% entre comissão esperada e pagamento recebido  
**Ação:** Criar alerta automático  
**Objetivo:** Identificar discrepâncias para regularização

---

## Convenções de Código

### Nomenclatura
- **Ficheiros:** kebab-case (ex: `tipos-artigo.tsx`)
- **Componentes:** PascalCase (ex: `TiposArtigoForm`)
- **Funções:** camelCase (ex: `calcularComissao`)
- **Constantes:** UPPER_SNAKE_CASE (ex: `MAX_PERCENTAGE`)

### Idioma
- **Código:** Português de Portugal
- **Comentários:** Português de Portugal
- **Commits:** Português de Portugal
- **Documentação:** Português de Portugal

### Base de Dados
- **Tabelas:** snake_case no plural (ex: `tipos_artigo`)
- **Colunas:** snake_case (ex: `utilizador_id`)
- **Enums:** snake_case (ex: `'pendente'`, `'pago'`)

---

## Histórico de Revisões

| Data | Secção | Alteração | Autor |
|------|--------|-----------|-------|
| 2026-01-21 | Todas | Criação inicial | Sistema |

