
import { SectionId, SectionMetadata, BusinessPlanData } from './types';

export const SECTIONS: SectionMetadata[] = [
  { 
    id: SectionId.INSTRUCOES, 
    title: 'Instruções Gerais', 
    description: 'Guia de apoio à elaboração do plano de negócios.', 
    icon: 'Sparkles'
  },
  { 
    id: SectionId.SUMARIO_EXECUTIVO, 
    title: '1. Sumário Executivo', 
    description: 'Descrição sumária do projeto de investimento (máx. 1 página).', 
    icon: 'ClipboardList'
  },
  { 
    id: SectionId.IDENTIFICACAO, 
    title: '2. Identificação', 
    description: 'Dados pessoais, profissionais e competências do promotor.', 
    icon: 'User'
  },
  { 
    id: SectionId.ANALISE_MERCADO, 
    title: '3. Mercado & Concorrência', 
    description: 'Análise da concorrência e pesquisa de mercado.', 
    icon: 'BarChart3'
  },
  { 
    id: SectionId.PROJETO_NEGOCIO, 
    title: '4. Projeto/Negócio', 
    description: 'Identificar objetivos, ações e processo produtivo.', 
    icon: 'Briefcase'
  },
  { 
    id: SectionId.RECURSOS_HUMANOS, 
    title: '5. Recursos Humanos', 
    description: 'Equipa que vai assegurar as funções necessárias.', 
    icon: 'Users'
  },
  { 
    id: SectionId.ESTRATEGIA, 
    title: '6. Estratégia/Fundamentação', 
    description: 'Segmentos de clientes, fornecedores e vantagem competitiva.', 
    icon: 'Target'
  },
  { id: SectionId.SWOT, title: '7. Análise SWOT', description: 'Forças, Fraquezas, Oportunidades e Ameaças.', icon: 'Split' },
  { id: SectionId.INVESTIMENTO, title: '8. Investimento', description: 'Identificação de todos os investimentos necessários.', icon: 'Coins' },
  { id: SectionId.FINANCIAMENTO, title: '9. Financiamento', description: 'Meios de financiamento nos anos de execução.', icon: 'Wallet' },
  { id: SectionId.PROJECOES, title: '10. Projeções', description: 'Projeções económico-financeiras a 3 anos.', icon: 'TrendingUp' },
  { id: SectionId.RECECAO, title: '11. Receção e Entrega', description: 'Registo de entrega do plano de negócios.', icon: 'Mail' },
];

export const INITIAL_DATA: BusinessPlanData = {
  sumarioExecutivo: {
    atividades: '', objetivos: '', beneficios: '', distincao: '', clientes: '', equipa: '', investimentoNecessario: '',
  },
  identificacao: {
    planId: '',
    nomePromotor: '',
    dataNascimento: '',
    morada: '',
    biCc: '',
    nif: '',
    estadoCivil: '',
    telemovel: '',
    email: '',
    caePrincipal: '',
    caeSecundario: '',
    naturezaJuridica: '',
    competenciasTecnicas: '',
    experienciaQualificacoes: '',
    formacaoInvestir: '',
    cvName: '',
    cvData: ''
  },
  analiseMercado: { necessidades: '', expectativas: '', criteriosCompra: '', concorrentes: '' },
  projetoNegocio: { objetivos: '', acoes: '', processo: '', instalacoes: '' },
  recursosHumanos: { descricao: '', membros: [] },
  estrategia: { fundamentacao: '', produto: '', preco: '', distribuicao: '', comunicacao: '' },
  swot: { pontosFortes: [], pontosFracos: [], oportunidades: [], ameacas: [] },
  investimento: {
    propriedadesTerrenos: 0, propriedadesEdificios: 0, tangiveisTerrenos: 0, tangiveisEdificios: 0, equipamentoBasico: 0, transporte: 0, administrativo: 0, biologico: 0, goodwill: 0, desenvolvimento: 0, software: 0, propriedadeIndustrial: 0, diversos: 0, fundoManeio: 0,
  },
  financiamento: {
    capitalProprio: 0, bancario7Anos: 0, subsidioDesemprego: 0, outros: 0
  },
  projecoes: {
    vendas: [0, 0, 0], prestacaoServicos: [0, 0, 0], cmvmc: [0, 0, 0], fse: [0, 0, 0], gastosPessoal: [0, 0, 0], outrosGastos: [0, 0, 0]
  },
  rececao: {
    projetoId: '',
    projetoNome: '',
    nomeResponsavel: '',
    dataRececao: new Date().toISOString().split('T')[0],
    horaRececao: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }
};
