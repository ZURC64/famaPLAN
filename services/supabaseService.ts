
import { createClient } from '@supabase/supabase-js';
import { BusinessPlanData } from '../types';

const SUPABASE_URL = 'https://fvyyfrkorbmwqtctssgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eXlmcmtvcmJtd3F0Y3Rzc2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjMyMjMsImV4cCI6MjA4NDM5OTIyM30.51GgIKBe0jR0Uvk9xUNWESNuuaeJG554cZ5WCdv88yw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SupabasePlan {
  id: string;
  name: string;
  data: BusinessPlanData;
  updated_at: string;
}

/**
 * SQL PARA CRIAÇÃO DA TABELA:
 * 
 * CREATE TABLE business_plans (
 *   id TEXT PRIMARY KEY,
 *   name TEXT,
 *   sumario_executivo JSONB DEFAULT '{}',
 *   identificacao JSONB DEFAULT '{}',
 *   analise_mercado JSONB DEFAULT '{}',
 *   projeto_negocio JSONB DEFAULT '{}',
 *   recursos_humanos JSONB DEFAULT '{}',
 *   estrategia JSONB DEFAULT '{}',
 *   swot JSONB DEFAULT '{}',
 *   investimento JSONB DEFAULT '{}',
 *   financiamento JSONB DEFAULT '{}',
 *   projecoes JSONB DEFAULT '{}',
 *   rececao JSONB DEFAULT '{}',
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */

export const supabaseService = {
  async savePlan(id: string, name: string, data: BusinessPlanData) {
    const payload = {
      name: name || 'Projeto sem Nome',
      sumario_executivo: data.sumarioExecutivo,
      identificacao: data.identificacao,
      analise_mercado: data.analiseMercado,
      projeto_negocio: data.projetoNegocio,
      recursos_humanos: data.recursosHumanos,
      estrategia: data.estrategia,
      swot: data.swot,
      investimento: data.investimento,
      financiamento: data.financiamento,
      projecoes: data.projecoes,
      rececao: data.rececao,
      updated_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
      .from('business_plans')
      .upsert({ 
        id: id?.startsWith('PN') ? id : undefined, 
        ...payload 
      }, { onConflict: 'id' })
      .select();

    if (error) throw error;
    return this.mapRowToPlan(result[0]);
  },

  mapRowToPlan(row: any): SupabasePlan {
    // Garante que o ID da linha (que é o planId formatado) seja preservado dentro do objeto Identificação
    const planData = {
      sumarioExecutivo: row.sumario_executivo,
      identificacao: { ...row.identificacao, planId: row.id },
      analiseMercado: row.analise_mercado,
      projetoNegocio: row.projeto_negocio,
      recursosHumanos: row.recursos_humanos,
      estrategia: row.estrategia,
      swot: row.swot,
      investimento: row.investimento,
      financiamento: row.financiamento,
      projecoes: row.projecoes,
      rececao: row.rececao
    } as BusinessPlanData;

    return {
      id: row.id,
      name: row.name,
      updated_at: row.updated_at,
      data: planData
    };
  },

  async getAllPlans() {
    const { data, error } = await supabase
      .from('business_plans')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data.map(row => this.mapRowToPlan(row));
  },

  async deletePlan(id: string) {
    const { error } = await supabase
      .from('business_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
