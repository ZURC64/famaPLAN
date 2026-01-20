
import { GoogleGenAI, Type } from "@google/genai";
import { dbService } from "./dbService";
import { BusinessPlanData } from "../types";

// Assistant function for business writing using Gemini API
export async function assistWriting(sectionTitle: string, userPrompt: string): Promise<string> {
  // Always initialize a new GoogleGenAI instance before making a call to ensure fresh configuration
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Atua como um consultor de negócios sénior. 
      Ajuda o utilizador a redigir a secção "${sectionTitle}" de um plano de negócios oficial para a Câmara de Famalicão.
      O utilizador deu as seguintes notas: "${userPrompt}". 
      Escreve um texto profissional, conciso e estruturado em Português de Portugal.`,
      config: {
        temperature: 0, 
        seed: 42       
      }
    });

    // Directly access the .text property of the GenerateContentResponse object
    return response.text || "Não foi possível gerar sugestão.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao comunicar com o assistente de IA.";
  }
}

// Generate a professional email summary for investors/partners
export async function generateEmailBody(planData: any): Promise<string> {
  // Always initialize a new GoogleGenAI instance before making a call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base neste plano de negócios para "${planData.identificacao.nomePromotor}", escreve um email profissional de apresentação. 
      O email deve ser dirigido a um potencial investidor ou parceiro, resumindo a atividade principal, os objetivos estratégicos e o montante de investimento necessário.
      O tom deve ser formal, entusiasta e focado em resultados. Usa Português de Portugal.
      Plano: ${JSON.stringify(planData.sumarioExecutivo)}`,
      config: { temperature: 0.7 }
    });
    // Directly access the .text property
    return response.text || "";
  } catch (error) {
    return "Olá, em anexo envio o Plano de Negócios gerado no famaPLAN.";
  }
}

// Function to generate detailed financial projections based on the FULL plan data
export async function generateFinancialProjections(fullData: BusinessPlanData): Promise<any> {
  // Always initialize a new GoogleGenAI instance before making a call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const schema = {
    type: Type.OBJECT,
    properties: {
      vendas: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      prestacaoServicos: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      cmvmc: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      fse: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      gastosPessoal: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      outrosGastos: { type: Type.ARRAY, items: { type: Type.NUMBER } }
    },
    required: ["vendas", "prestacaoServicos", "cmvmc", "fse", "gastosPessoal", "outrosGastos"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Atua como um CFO/Analista Financeiro. Analisa os seguintes dados do plano de negócios e gera projeções financeiras para os próximos 3 anos (Ano 1, Ano 2, Ano 3).
      
      DADOS DO PLANO:
      - Atividade: ${fullData.sumarioExecutivo.atividades}
      - Investimento Total Previsto: ${Object.values(fullData.investimento).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0)}€
      - Equipa e Salários (RH): ${fullData.recursosHumanos.descricao}. Gastos mensais base em salários: ${fullData.recursosHumanos.membros.reduce((a: number, b) => a + parseFloat(b.salario || "0"), 0)}€
      - Estratégia de Preço: ${fullData.estrategia.preco}
      
      REGRAS:
      1. Os Gastos de Pessoal devem ser coerentes com os membros inseridos (multiplicar o total mensal por 14 meses para estimativa anual).
      2. As vendas devem crescer gradualmente do ano 1 para o ano 3 (ex: +15-20% ao ano).
      3. O CMVMC deve ser uma percentagem lógica das vendas dependendo do setor.
      4. FSE (Fornecedores de Serviços Externos) deve incluir rendas, marketing e energia.
      
      Retorna APENAS o JSON com arrays de 3 números para cada campo.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1
      }
    });

    // Directly access .text property and trim before parsing JSON
    const text = response.text?.trim();
    if (!text) throw new Error("API returned an empty response.");
    return JSON.parse(text);
  } catch (error) {
    console.error("Projections IA Error:", error);
    throw error;
  }
}

// Function to automatically populate all sections based on the Executive Summary
export async function distillPlanFromSummary(summary: string): Promise<any> {
  const cached = await dbService.getCachedResponse(summary);
  if (cached) return cached;

  // Always initialize a new GoogleGenAI instance before making a call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const schema = {
    type: Type.OBJECT,
    properties: {
      analiseMercado: {
        type: Type.OBJECT,
        properties: {
          necessidades: { type: Type.STRING },
          expectativas: { type: Type.STRING },
          criteriosCompra: { type: Type.STRING },
          concorrentes: { type: Type.STRING }
        },
        required: ["necessidades", "expectativas", "criteriosCompra", "concorrentes"]
      },
      projetoNegocio: {
        type: Type.OBJECT,
        properties: {
          objetivos: { type: Type.STRING },
          acoes: { type: Type.STRING },
          processo: { type: Type.STRING },
          instalacoes: { type: Type.STRING }
        },
        required: ["objetivos", "acoes", "processo", "instalacoes"]
      },
      recursosHumanos: {
        type: Type.OBJECT,
        properties: {
          descricao: { type: Type.STRING },
          membros: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                funcao: { type: Type.STRING },
                condicao: { type: Type.STRING },
                salario: { type: Type.STRING }
              },
              required: ["nome", "funcao", "condicao", "salario"]
            }
          }
        },
        required: ["descricao", "membros"]
      },
      estrategia: {
        type: Type.OBJECT,
        properties: {
          fundamentacao: { type: Type.STRING },
          produto: { type: Type.STRING },
          preco: { type: Type.STRING },
          distribuicao: { type: Type.STRING },
          comunicacao: { type: Type.STRING }
        },
        required: ["fundamentacao", "produto", "preco", "distribuicao", "comunicacao"]
      },
      swot: {
        type: Type.OBJECT,
        properties: {
          pontosFortes: { type: Type.ARRAY, items: { type: Type.STRING } },
          pontosFracos: { type: Type.ARRAY, items: { type: Type.STRING } },
          oportunidades: { type: Type.ARRAY, items: { type: Type.STRING } },
          ameacas: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["pontosFortes", "pontosFracos", "oportunidades", "ameacas"]
      },
      investimento: {
        type: Type.OBJECT,
        properties: {
          propriedadesTerrenos: { type: Type.NUMBER },
          propriedadesEdificios: { type: Type.NUMBER },
          equipamentoBasico: { type: Type.NUMBER },
          transporte: { type: Type.NUMBER },
          administrativo: { type: Type.NUMBER },
          biologico: { type: Type.NUMBER },
          goodwill: { type: Type.NUMBER },
          desenvolvimento: { type: Type.NUMBER },
          software: { type: Type.NUMBER },
          propriedadeIndustrial: { type: Type.NUMBER },
          diversos: { type: Type.NUMBER },
          fundoManeio: { type: Type.NUMBER }
        },
        required: ["propriedadesTerrenos", "propriedadesEdificios", "equipamentoBasico", "transporte", "administrativo", "biologico", "goodwill", "desenvolvimento", "software", "propriedadeIndustrial", "diversos", "fundoManeio"]
      },
      financiamento: {
        type: Type.OBJECT,
        properties: {
          capitalProprio: { type: Type.NUMBER },
          bancario7Anos: { type: Type.NUMBER },
          subsidioDesemprego: { type: Type.NUMBER },
          outros: { type: Type.NUMBER }
        },
        required: ["capitalProprio", "bancario7Anos", "subsidioDesemprego", "outros"]
      },
      projecoes: {
        type: Type.OBJECT,
        properties: {
          vendas: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          prestacaoServicos: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          cmvmc: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          fse: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          gastosPessoal: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          outrosGastos: { type: Type.ARRAY, items: { type: Type.NUMBER } }
        },
        required: ["vendas", "prestacaoServicos", "cmvmc", "fse", "gastosPessoal", "outrosGastos"]
      }
    },
    required: ["analiseMercado", "projetoNegocio", "recursosHumanos", "estrategia", "swot", "investimento", "financiamento", "projecoes"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Atua como um Consultor de Estratégia Sénior. Com base no seguinte Sumário Executivo: "${summary}", preenche ABSOLUTAMENTE TODAS as secções restantes do plano de negócios. 
      Retorna APENAS o JSON. Usa Português de Portugal. Contexto: Vila Nova de Famalicão.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2
      }
    });

    // Directly access .text property and trim before parsing JSON
    const text = response.text?.trim();
    if (!text) throw new Error("API returned an empty response.");
    const result = JSON.parse(text);
    await dbService.setCachedResponse(summary, result);
    return result;
  } catch (error) {
    console.error("Distillation Error:", error);
    throw error;
  }
}

// Function to generate ONLY the Strategy section based on a Summary
export async function generateStrategyOnly(summary: string): Promise<any> {
  // Always initialize a new GoogleGenAI instance before making a call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const schema = {
    type: Type.OBJECT,
    properties: {
      fundamentacao: { type: Type.STRING },
      produto: { type: Type.STRING },
      preco: { type: Type.STRING },
      distribuicao: { type: Type.STRING },
      comunicacao: { type: Type.STRING }
    },
    required: ["fundamentacao", "produto", "preco", "distribuicao", "comunicacao"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base no sumário: "${summary}", fundamenta a estratégia de negócio. 
      Explica a vantagem competitiva, o posicionamento do produto, a estratégia de preço, canais de distribuição e plano de comunicação.
      Usa Português de Portugal. Retorna JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3
      }
    });
    // Directly access .text property and trim before parsing JSON
    const text = response.text?.trim();
    if (!text) throw new Error("API returned an empty response.");
    return JSON.parse(text);
  } catch (error) {
    console.error("Strategy Gen Error:", error);
    throw error;
  }
}
