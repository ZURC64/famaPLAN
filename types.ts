
export enum SectionId {
  INSTRUCOES = 'instrucoes',
  SUMARIO_EXECUTIVO = 'sumario-executivo',
  IDENTIFICACAO = 'identificacao',
  ANALISE_MERCADO = 'analise-mercado',
  PROJETO_NEGOCIO = 'projeto-negocio',
  RECURSOS_HUMANOS = 'recursos-humanos',
  ESTRATEGIA = 'estrategia',
  SWOT = 'swot',
  INVESTIMENTO = 'investimento',
  FINANCIAMENTO = 'financiamento',
  PROJECOES = 'projecoes',
  RECECAO = 'rececao'
}

export interface BusinessPlanData {
  sumarioExecutivo: {
    atividades: string;
    objetivos: string;
    beneficios: string;
    distincao: string;
    clientes: string;
    equipa: string;
    investimentoNecessario: string;
  };
  identificacao: {
    planId: string;
    nomePromotor: string;
    dataNascimento: string;
    morada: string;
    biCc: string;
    nif: string;
    estadoCivil: string;
    telemovel: string;
    email: string;
    caePrincipal: string;
    caeSecundario: string;
    naturezaJuridica: string;
    competenciasTecnicas: string;
    experienciaQualificacoes: string;
    formacaoInvestir: string;
    cvName?: string;
    cvData?: string;
  };
  analiseMercado: {
    necessidades: string;
    expectativas: string;
    criteriosCompra: string;
    concorrentes: string;
  };
  projetoNegocio: {
    objetivos: string;
    acoes: string;
    processo: string;
    instalacoes: string;
  };
  recursosHumanos: {
    descricao: string;
    membros: Array<{
      id: string;
      nome: string;
      funcao: string;
      condicao: string;
      salario: string;
    }>;
  };
  estrategia: {
    fundamentacao: string;
    produto: string;
    preco: string;
    distribuicao: string;
    comunicacao: string;
  };
  swot: {
    pontosFortes: string[];
    pontosFracos: string[];
    oportunidades: string[];
    ameacas: string[];
  };
  investimento: {
    propriedadesTerrenos: number;
    propriedadesEdificios: number;
    tangiveisTerrenos: number;
    tangiveisEdificios: number;
    equipamentoBasico: number;
    transporte: number;
    administrativo: number;
    biologico: number;
    goodwill: number;
    desenvolvimento: number;
    software: number;
    propriedadeIndustrial: number;
    diversos: number;
    fundoManeio: number;
  };
  financiamento: {
    capitalProprio: number;
    bancario7Anos: number;
    subsidioDesemprego: number;
    outros: number;
  };
  projecoes: {
    vendas: number[];
    prestacaoServicos: number[];
    cmvmc: number[];
    fse: number[];
    gastosPessoal: number[];
    outrosGastos: number[];
  };
  rececao: {
    projetoId: string;
    projetoNome: string;
    nomeResponsavel: string;
    dataRececao: string;
    horaRececao: string;
  };
}

export interface SectionMetadata {
  id: SectionId;
  title: string;
  description: string;
  icon: string;
  helpText?: string[];
}
