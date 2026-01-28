// =====================================================
// TIPOS DA BASE DE DADOS
// Gerado automaticamente a partir do esquema Supabase
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =====================================================
// ENUMS
// =====================================================

export type EstadoVenda = 'pendente' | 'parcial' | 'pago'

export type MetodoCalculo = 'manual' | 'margem_custo' | 'margem_venda'

export type TipoAlerta = 'divergencia' | 'cobranca' | 'previsao'

// =====================================================
// TABELAS
// =====================================================

export interface Utilizador {
  id: string
  nome: string
  email: string
  criado_em: string
  atualizado_em: string
}

export interface TipoArtigo {
  id: string
  utilizador_id: string
  nome: string
  percentagem_comissao: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface HistoricoRegraComissao {
  id: string
  tipo_artigo_id: string
  percentagem_antiga: number | null
  percentagem_nova: number
  alterado_em: string
  utilizador_id: string
}

export interface Cliente {
  id: string
  utilizador_id: string
  nome: string
  nif: string | null
  email: string | null
  telefone: string | null
  morada: string | null
  criado_em: string
  atualizado_em: string
}

export interface Venda {
  id: string
  utilizador_id: string
  cliente_id: string
  numero_fatura: string
  data_venda: string
  observacoes: string | null
  estado: EstadoVenda
  valor_total: number
  lucro_total: number
  comissao_total: number
  periodo_comissao_recebida: string | null
  comissao_recebida_paga: boolean
  criado_em: string
  atualizado_em: string
}

export interface LinhaVenda {
  id: string
  venda_id: string
  artigo: string
  tipo_artigo_id: string
  quantidade: number
  metodo_calculo: MetodoCalculo
  
  // Campos para lucro manual
  lucro_manual: number | null
  
  // Campos para margem sobre custo
  preco_custo: number | null
  percentagem_custo: number | null
  
  // Campos para margem sobre venda
  preco_venda: number | null
  percentagem_venda: number | null
  
  // Snapshot da percentagem de comissão
  percentagem_comissao_snapshot: number
  
  // Desconto aplicado (0-100)
  percentagem_desconto: number
  
  // Campos calculados
  lucro_calculado: number
  comissao_calculada: number
  
  criado_em: string
  atualizado_em: string
}

export interface PagamentoRecebido {
  id: string
  utilizador_id: string
  data_pagamento: string
  valor: number
  periodo_referencia: string
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export interface Alerta {
  id: string
  utilizador_id: string
  tipo: TipoAlerta
  mensagem: string
  dados_contexto: Json | null
  lido: boolean
  criado_em: string
}

// =====================================================
// TIPOS DE INPUT (para criação/edição)
// =====================================================

export interface TipoArtigoInput {
  nome: string
  percentagem_comissao: number
  ativo?: boolean
}

export interface ClienteInput {
  nome: string
  nif?: string
  email?: string
  telefone?: string
  morada?: string
}

export interface VendaInput {
  cliente_id: string
  numero_fatura: string
  data_venda: string
  observacoes?: string
  estado?: EstadoVenda
  periodo_comissao_recebida?: string | null
  comissao_recebida_paga?: boolean
}

export interface LinhaVendaInput {
  venda_id: string
  artigo: string
  tipo_artigo_id: string
  quantidade: number
  metodo_calculo: MetodoCalculo
  
  // Campos opcionais conforme método
  lucro_manual?: number
  preco_custo?: number
  percentagem_custo?: number
  preco_venda?: number
  percentagem_venda?: number
  
  percentagem_comissao_snapshot: number
  percentagem_desconto?: number
}

export interface PagamentoRecebidoInput {
  data_pagamento: string
  valor: number
  periodo_referencia: string
  observacoes?: string
}

// =====================================================
// TIPOS COMPOSTOS (com relações)
// =====================================================

export interface VendaCompleta extends Venda {
  cliente: Cliente
  linhas: LinhaVendaComTipo[]
}

export interface LinhaVendaComTipo extends LinhaVenda {
  tipo_artigo: TipoArtigo
}

// =====================================================
// TIPOS DE VIEW/AGREGADOS
// =====================================================

export interface ResumoComissoes {
  pendente: number
  validada: number
  recebida: number
  diferenca: number
}

export interface ComissaoPorTipo {
  tipo_artigo_id: string
  tipo_artigo_nome: string
  total_vendas: number
  total_lucro: number
  total_comissao: number
  percentagem_media: number
}

export interface ComissaoMensal {
  mes: string
  ano: number
  total_vendas: number
  total_comissao: number
  taxa_cobranca: number
}

// =====================================================
// TIPOS DO SUPABASE CLIENT
// =====================================================

export interface Database {
  public: {
    Tables: {
      utilizadores: {
        Row: Utilizador
        Insert: Omit<Utilizador, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<Utilizador, 'id' | 'criado_em' | 'atualizado_em'>>
      }
      tipos_artigo: {
        Row: TipoArtigo
        Insert: Omit<TipoArtigo, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<TipoArtigo, 'id' | 'utilizador_id' | 'criado_em' | 'atualizado_em'>>
      }
      clientes: {
        Row: Cliente
        Insert: Omit<Cliente, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<Cliente, 'id' | 'utilizador_id' | 'criado_em' | 'atualizado_em'>>
      }
      vendas: {
        Row: Venda
        Insert: Omit<Venda, 'id' | 'valor_total' | 'lucro_total' | 'comissao_total' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<Venda, 'id' | 'utilizador_id' | 'criado_em' | 'atualizado_em'>>
      }
      linhas_venda: {
        Row: LinhaVenda
        Insert: Omit<LinhaVenda, 'id' | 'lucro_calculado' | 'comissao_calculada' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<LinhaVenda, 'id' | 'venda_id' | 'criado_em' | 'atualizado_em'>>
      }
      pagamentos_recebidos: {
        Row: PagamentoRecebido
        Insert: Omit<PagamentoRecebido, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<PagamentoRecebido, 'id' | 'utilizador_id' | 'criado_em' | 'atualizado_em'>>
      }
      alertas: {
        Row: Alerta
        Insert: Omit<Alerta, 'id' | 'criado_em'>
        Update: Partial<Omit<Alerta, 'id' | 'utilizador_id' | 'criado_em'>>
      }
    }
    Views: {}
    Functions: {
      calcular_lucro_linha: {
        Args: { linha: LinhaVenda }
        Returns: number
      }
      calcular_comissao_linha: {
        Args: { linha: LinhaVenda }
        Returns: number
      }
    }
    Enums: {
      estado_venda: EstadoVenda
      metodo_calculo: MetodoCalculo
      tipo_alerta: TipoAlerta
    }
  }
}
