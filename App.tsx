import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { SectionId, BusinessPlanData } from './types';
import { SECTIONS, INITIAL_DATA } from './constants';
import { Icons } from './components/Icons';
import { assistWriting, distillPlanFromSummary, generateEmailBody, generateFinancialProjections, generateStrategyOnly } from './services/geminiService';
import { supabaseService, SupabasePlan } from './services/supabaseService';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Shared UI Components ---

const INITIAL_VISIBLE_COUNT = 15;

const SidebarItem: React.FC<{ 
  section: typeof SECTIONS[0]; 
  active: boolean; 
  onClick: () => void;
  isLoading?: boolean;
}> = ({ section, active, onClick, isLoading }) => {
  const Icon = (Icons as any)[section.icon];
  return (
    <button
      onClick={() => onClick()}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-xs font-title tracking-tight relative group ${
        active 
          ? 'bg-fama-olive text-white shadow-xl shadow-fama-olive/20 translate-x-1 font-bold' 
          : 'text-fama-dark/70 hover:bg-slate-100 hover:text-fama-olive hover:translate-x-1 font-medium'
      }`}
    >
      <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
        <Icon size={16} strokeWidth={active ? 3 : 2} />
      </div>
      <span className="flex-1 text-left truncate uppercase tracking-tighter">{section.title}</span>
      {isLoading && <div className="absolute right-3 w-2 h-2 bg-fama-yellow rounded-full animate-ping" />}
      {active && <div className="absolute -left-1 w-1 h-6 bg-fama-yellow rounded-full" />}
    </button>
  );
};

const SectionHeader: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="mb-8 border-b border-slate-100 pb-8 no-print">
    <div className="flex items-center gap-3 mb-2">
      <div className="h-8 w-1.5 bg-fama-yellow rounded-full" />
      <h2 className="text-3xl font-title font-black text-fama-dark tracking-tight">{title}</h2>
    </div>
    <p className="text-slate-500 text-lg font-normal leading-relaxed">{description}</p>
  </div>
);

const FormField: React.FC<{ 
  label: string; 
  value: string | number; 
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: string;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, placeholder, type = "text", prefix, maxLength, error, disabled }) => (
  <div className={`space-y-2 no-print ${disabled ? 'opacity-60' : ''}`}>
    <div className="flex justify-between items-center ml-1">
      <label className="block text-[10px] font-bold text-fama-olive uppercase tracking-widest">{label}</label>
      {error && <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">{error}</span>}
    </div>
    <div className="relative">
      {prefix && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">{prefix}</span>}
      <input 
        type={type}
        value={value ?? ''} 
        onChange={(e) => !disabled && onChange(e.target.value)} 
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={disabled}
        className={`w-full ${prefix ? 'pl-16' : 'px-5'} py-4 rounded-2xl border-2 ${error ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'} text-slate-700 font-normal placeholder:text-slate-400 focus:border-fama-olive outline-none transition-all ${disabled ? 'cursor-not-allowed' : ''}`} 
      />
    </div>
  </div>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
}> = ({ label, value, onChange, suffix = "€" }) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-bold text-fama-olive uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <input 
        type="number" 
        value={value || 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-700 font-normal focus:border-fama-olive outline-none transition-all"
      />
      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{suffix}</span>
    </div>
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="space-y-2 no-print">
    <label className="block text-[10px] font-bold text-fama-olive uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-700 font-normal focus:border-fama-olive outline-none transition-all appearance-none cursor-pointer"
      >
        <option value="">Selecione...</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <Icons.ChevronRight size={18} className="rotate-90" />
      </div>
    </div>
  </div>
);

const TextAreaField: React.FC<{ 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 5 }) => (
  <div className="space-y-2 no-print">
    <label className="block text-[10px] font-bold text-fama-olive uppercase tracking-widest ml-1">{label}</label>
    <textarea 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      rows={rows}
      className="w-full px-5 py-5 rounded-[2rem] border-2 border-slate-200 bg-slate-50 text-slate-700 font-normal placeholder:text-slate-400 focus:border-fama-olive outline-none transition-all leading-relaxed resize-none" 
    />
  </div>
);

// --- Print Component ---

const PrintView = React.forwardRef<HTMLDivElement, { data: BusinessPlanData }>(({ data }, ref) => {
  const sectionStyle = { marginBottom: '30px', pageBreakInside: 'avoid' as const };
  const h3Style = { fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: '900', borderBottom: '2px solid #6b6a55', paddingBottom: '8px', marginBottom: '15px', color: '#4a493a' };
  const pStyle = { fontFamily: 'Open Sans, sans-serif', fontSize: '12px', lineHeight: '1.6', color: '#333', marginBottom: '10px' };

  return (
    <div ref={ref} className="pdf-content">
      <div style={{ textAlign: 'center', padding: '100px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '42px', fontWeight: '900', marginBottom: '20px', color: '#4a493a' }}>Plano de Negócios</h1>
        <div style={{ backgroundColor: '#f1b511', height: '6px', width: '120px', margin: '0 auto 40px' }} />
        <h2 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '24px', fontWeight: '700', color: '#6b6a55' }}>{data.identificacao?.nomePromotor || 'Novo Projeto Empreendedor'}</h2>
        <p style={{ fontSize: '14px', color: '#6b6a55', fontWeight: 'normal' }}>Referência: {data.identificacao?.planId}</p>
        <p style={{ marginTop: 'auto', fontSize: '14px', color: '#999', fontWeight: 'normal' }}>Gerado via famaPLAN • {new Date().toLocaleDateString('pt-PT')}</p>
      </div>
      <div style={{ pageBreakBefore: 'always' }} />
      <section style={sectionStyle}>
        <h3 style={h3Style}>1. Sumário Executivo</h3>
        <p style={{ ...pStyle, whiteSpace: 'pre-wrap' }}>{data.sumarioExecutivo?.atividades || 'Informação não disponível.'}</p>
      </section>
      <section style={sectionStyle}>
        <h3 style={h3Style}>2. Identificação do Promotor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '12px', fontFamily: 'Open Sans, sans-serif' }}>
          <div><strong>ID Plano:</strong> {data.identificacao?.planId}</div>
          <div><strong>Nome:</strong> {data.identificacao?.nomePromotor}</div>
          <div><strong>NIF:</strong> {data.identificacao?.nif}</div>
          <div><strong>Email:</strong> {data.identificacao?.email}</div>
        </div>
      </section>
    </div>
  );
});

// --- Main App ---

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>(SectionId.INSTRUCOES);
  const [data, setData] = useState<BusinessPlanData>(INITIAL_DATA);
  const [isDistilling, setIsDistilling] = useState(false);
  const [allPlans, setAllPlans] = useState<SupabasePlan[]>([]);
  const [showPlansList, setShowPlansList] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleItems, setVisibleItems] = useState(INITIAL_VISIBLE_COUNT);
  const [isPlanSaved, setIsPlanSaved] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'sending_email'>('idle');
  const printRef = useRef<HTMLDivElement>(null);

  const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
  const currentSection = SECTIONS[currentIndex];

  const generateNextPlanId = useCallback((plans: SupabasePlan[]) => {
    const year = new Date().getFullYear();
    const yearPrefix = `PN ${year}-`;
    const currentYearPlans = plans.filter(p => p.id?.startsWith(yearPrefix));
    let maxSeq = 0;
    currentYearPlans.forEach(p => {
      const parts = p.id.split('-');
      if (parts.length === 2) {
        const seq = parseInt(parts[1]);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    return `${yearPrefix}${nextSeq}`;
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      const plans = await supabaseService.getAllPlans();
      setAllPlans(plans);
      if (!data.identificacao.planId) {
        setData(prev => ({ ...prev, identificacao: { ...prev.identificacao, planId: generateNextPlanId(plans) } }));
      }
    } catch (err) { console.error(err); }
  }, [generateNextPlanId, data.identificacao.planId]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // Sync section 11 project info with identification whenever it changes
  useEffect(() => {
    if (data.identificacao.planId !== data.rececao.projetoId || data.identificacao.nomePromotor !== data.rececao.projetoNome) {
      setData(prev => ({
        ...prev,
        rececao: {
          ...prev.rececao,
          projetoId: prev.identificacao.planId,
          projetoNome: prev.identificacao.nomePromotor
        }
      }));
    }
  }, [data.identificacao.planId, data.identificacao.nomePromotor]);

  const updateField = (section: keyof BusinessPlanData, field: string, value: any) => {
    setData(prev => ({ ...prev, [section]: { ...(prev[section] as any), [field]: value } }));
    setIsPlanSaved(false);
  };

  const updateDeepField = (section: keyof BusinessPlanData, sub: string, index: number, value: any) => {
    setData(prev => {
      const arr = [...(prev[section] as any)[sub]];
      arr[index] = value;
      return { ...prev, [section]: { ...(prev[section] as any), [sub]: arr } };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({
          ...prev,
          identificacao: { ...prev.identificacao, cvName: file.name, cvData: reader.result as string }
        }));
        setIsPlanSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fix: Added optional parameter to handle potential argument passing from events (Error line 505)
  const handleAutoPopulate = async (_e?: any) => {
    if (!data.sumarioExecutivo.atividades.trim()) { alert("Escreva o sumário primeiro."); return; }
    setIsDistilling(true);
    try {
      const distData = await distillPlanFromSummary(data.sumarioExecutivo.atividades);
      setData(prev => ({ ...prev, ...distData }));
      setIsPlanSaved(false);
      alert("famaPLAN 360º: Todas as secções foram estruturadas!");
    } catch (err) { alert("Erro ao comunicar com a IA."); }
    finally { setIsDistilling(false); }
  };

  const handleFinalize = async () => {
    try {
      await supabaseService.savePlan(data.identificacao.planId, data.identificacao.nomePromotor, data);
      setIsPlanSaved(true);
      await loadPlans();
      setShowExportModal(true);
    } catch (err) { alert("Erro ao guardar o plano."); }
  };

  // Fix: Added optional parameter to match expected signature for handlers (Error line 523/748 candidate)
  const handleExportPdf = async (_e?: any) => {
    setPdfStatus('generating');
    const opt = { 
      margin: 10, filename: `famaPLAN_${data.identificacao.nomePromotor}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 1.5, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
    };
    try {
      await new Promise(r => setTimeout(r, 200));
      await html2pdf().set(opt).from(printRef.current).save();
    } finally { setPdfStatus('idle'); }
  };

  const handleSendEmail = async () => {
    setPdfStatus('sending_email');
    try {
      const body = await generateEmailBody(data);
      window.location.href = `mailto:${data.identificacao.email}?subject=Plano de Negócios&body=${encodeURIComponent(body)}`;
    } finally { setPdfStatus('idle'); }
  };

  const filteredPlans = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return allPlans.filter(p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
  }, [allPlans, searchQuery]);

  const renderSection = () => {
    switch (activeSection) {
      case SectionId.SUMARIO_EXECUTIVO:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <TextAreaField label="Atividades do Projeto de Investimento" value={data.sumarioExecutivo.atividades} onChange={(v) => updateField('sumarioExecutivo', 'atividades', v)} rows={15} placeholder="Descreva de forma concisa o seu projeto..." />
          </div>
        );

      case SectionId.IDENTIFICACAO:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="ID Plano" value={data.identificacao.planId} disabled onChange={() => {}} />
              <FormField label="Nome do Promotor" value={data.identificacao.nomePromotor} onChange={(v) => updateField('identificacao', 'nomePromotor', v)} />
              <FormField label="Data de Nascimento" type="date" value={data.identificacao.dataNascimento} onChange={(v) => updateField('identificacao', 'dataNascimento', v)} />
              <div className="md:col-span-2"><FormField label="Morada Completa" value={data.identificacao.morada} onChange={(v) => updateField('identificacao', 'morada', v)} /></div>
              <FormField label="NIF" value={data.identificacao.nif} maxLength={9} onChange={(v) => updateField('identificacao', 'nif', v.replace(/\D/g, ''))} />
              <FormField label="BI / CC" value={data.identificacao.biCc} onChange={(v) => updateField('identificacao', 'biCc', v)} />
              <SelectField label="Estado Civil" value={data.identificacao.estadoCivil} options={[{label:'Solteiro(a)', value:'Solteiro(a)'}, {label:'Casado(a)', value:'Casado(a)'}, {label:'Divorciado(a)', value:'Divorciado(a)'}]} onChange={(v) => updateField('identificacao', 'estadoCivil', v)} />
              <FormField label="Email" value={data.identificacao.email} onChange={(v) => updateField('identificacao', 'email', v)} />
              <FormField label="Telemóvel" prefix="+351" value={data.identificacao.telemovel} maxLength={9} onChange={(v) => updateField('identificacao', 'telemovel', v)} />
              <FormField label="CAE Principal" value={data.identificacao.caePrincipal} onChange={(v) => updateField('identificacao', 'caePrincipal', v)} />
              <FormField label="CAE Secundário" value={data.identificacao.caeSecundario} onChange={(v) => updateField('identificacao', 'caeSecundario', v)} />
              <FormField label="Natureza Jurídica" value={data.identificacao.naturezaJuridica} onChange={(v) => updateField('identificacao', 'naturezaJuridica', v)} />
            </div>

            <div className="space-y-6 mt-8 border-t pt-8">
              <TextAreaField label="Possuo competências técnicas para o negócio?" value={data.identificacao.competenciasTecnicas} onChange={(v) => updateField('identificacao', 'competenciasTecnicas', v)} rows={3} />
              <TextAreaField label="Experiência Profissional e Qualificações" value={data.identificacao.experienciaQualificacoes} onChange={(v) => updateField('identificacao', 'experienciaQualificacoes', v)} rows={3} />
              <TextAreaField label="Em que áreas da formação empresarial necessito de investir?" value={data.identificacao.formacaoInvestir} onChange={(v) => updateField('identificacao', 'formacaoInvestir', v)} rows={3} />
            </div>

            <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 mt-8">
               <label className="block text-[10px] font-bold text-fama-olive uppercase tracking-widest mb-4">Anexar Curriculum Vitae</label>
               <div className="flex items-center gap-6">
                  <label className="cursor-pointer bg-white border-2 border-slate-200 px-6 py-4 rounded-xl flex items-center gap-3 hover:border-fama-olive transition-all">
                     <Icons.FileText size={20} className="text-fama-olive" />
                     <span className="font-medium text-sm text-fama-dark">{data.identificacao.cvName || 'Selecionar PDF'}</span>
                     <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {data.identificacao.cvName && <button onClick={() => updateField('identificacao', 'cvName', '')} className="text-rose-500 font-bold text-xs uppercase">Remover</button>}
               </div>
            </div>

            <div className="mt-12 bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50">
               <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 bg-fama-yellow text-black rounded-3xl flex items-center justify-center shadow-xl shrink-0"><Icons.Sparkles size={32} /></div>
                  <div className="flex-1">
                    <h4 className="font-title font-black text-fama-dark uppercase tracking-tighter text-xl">famaPLAN 360º</h4>
                    <p className="text-xs text-slate-500 font-normal italic">Ative a IA para estruturar as secções 3 a 10 com base no seu sumário.</p>
                  </div>
                  {/* Fixed: Use an explicit arrow function to ignore event arguments (Error line 505) */}
                  <button onClick={() => handleAutoPopulate()} className="bg-black text-white px-8 py-5 rounded-2xl font-title font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Ativar famaPLAN 360º</button>
               </div>
            </div>
          </div>
        );

      case SectionId.ANALISE_MERCADO:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <TextAreaField label="Necessidades do mercado" value={data.analiseMercado.necessidades} onChange={(v) => updateField('analiseMercado', 'necessidades', v)} />
            <TextAreaField label="Expectativas dos clientes" value={data.analiseMercado.expectativas} onChange={(v) => updateField('analiseMercado', 'expectativas', v)} />
            <TextAreaField label="Critérios de compra" value={data.analiseMercado.criteriosCompra} onChange={(v) => updateField('analiseMercado', 'criteriosCompra', v)} />
            <TextAreaField label="Principais Concorrentes" value={data.analiseMercado.concorrentes} onChange={(v) => updateField('analiseMercado', 'concorrentes', v)} />
          </div>
        );

      case SectionId.PROJETO_NEGOCIO:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <TextAreaField label="Objetivos do Projeto" value={data.projetoNegocio.objetivos} onChange={(v) => updateField('projetoNegocio', 'objetivos', v)} />
            <TextAreaField label="Ações a Desenvolver" value={data.projetoNegocio.acoes} onChange={(v) => updateField('projetoNegocio', 'acoes', v)} />
            <TextAreaField label="Processo Produtivo / Prestação de Serviço" value={data.projetoNegocio.processo} onChange={(v) => updateField('projetoNegocio', 'processo', v)} />
            <TextAreaField label="Instalações e Localização" value={data.projetoNegocio.instalacoes} onChange={(v) => updateField('projetoNegocio', 'instalacoes', v)} />
          </div>
        );

      case SectionId.RECURSOS_HUMANOS:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <TextAreaField label="Descrição da Equipa" value={data.recursosHumanos.descricao} onChange={(v) => updateField('recursosHumanos', 'descricao', v)} />
            
            <div className="space-y-6 mt-10">
              <h4 className="text-[10px] font-bold uppercase text-fama-olive tracking-widest font-title">Membros da Equipa / Funções</h4>
              {data.recursosHumanos.membros.map((m, i) => (
                <div key={m.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 relative group animate-in slide-in-from-left-4">
                  <FormField label="Nome" value={m.nome} onChange={(v) => {
                    const newM = [...data.recursosHumanos.membros];
                    newM[i].nome = v;
                    updateField('recursosHumanos', 'membros', newM);
                  }} />
                  <FormField label="Função" value={m.funcao} onChange={(v) => {
                    const newM = [...data.recursosHumanos.membros];
                    newM[i].funcao = v;
                    updateField('recursosHumanos', 'membros', newM);
                  }} />
                  <FormField label="Salário Mensal (€)" type="number" value={m.salario} onChange={(v) => {
                    const newM = [...data.recursosHumanos.membros];
                    newM[i].salario = v;
                    updateField('recursosHumanos', 'membros', newM);
                  }} />
                  <div className="flex items-end">
                    <button onClick={() => {
                      const newM = data.recursosHumanos.membros.filter((_, idx) => idx !== i);
                      updateField('recursosHumanos', 'membros', newM);
                    }} className="w-full py-4 text-rose-500 font-bold text-xs uppercase bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors font-title">Remover</button>
                  </div>
                </div>
              ))}
              <button onClick={() => {
                const newM = [...data.recursosHumanos.membros, { id: Date.now().toString(), nome: '', funcao: '', condicao: '', salario: '' }];
                updateField('recursosHumanos', 'membros', newM);
              }} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium hover:border-fama-olive hover:text-fama-olive transition-all font-title">+ Adicionar Colaborador</button>
            </div>
          </div>
        );

      case SectionId.ESTRATEGIA:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <TextAreaField label="Fundamentação da Estratégia" value={data.estrategia.fundamentacao} onChange={(v) => updateField('estrategia', 'fundamentacao', v)} />
            <TextAreaField label="Produto / Serviço" value={data.estrategia.produto} onChange={(v) => updateField('estrategia', 'produto', v)} />
            <TextAreaField label="Política de Preço" value={data.estrategia.preco} onChange={(v) => updateField('estrategia', 'preco', v)} />
            <TextAreaField label="Distribuição / Localização" value={data.estrategia.distribuicao} onChange={(v) => updateField('estrategia', 'distribuicao', v)} />
            <TextAreaField label="Plano de Comunicação" value={data.estrategia.comunicacao} onChange={(v) => updateField('estrategia', 'comunicacao', v)} />
          </div>
        );

      case SectionId.SWOT:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <label className="font-bold text-emerald-700 text-xs uppercase block mb-4 font-title">Pontos Fortes</label>
                <textarea className="w-full h-32 bg-transparent outline-none text-sm font-medium" value={data.swot.pontosFortes.join('\n')} onChange={(e) => updateField('swot', 'pontosFortes', e.target.value.split('\n'))} placeholder="Liste um por linha..." />
              </div>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                <label className="font-bold text-rose-700 text-xs uppercase block mb-4 font-title">Pontos Fracos</label>
                <textarea className="w-full h-32 bg-transparent outline-none text-sm font-medium" value={data.swot.pontosFracos.join('\n')} onChange={(e) => updateField('swot', 'pontosFracos', e.target.value.split('\n'))} />
              </div>
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                <label className="font-bold text-blue-700 text-xs uppercase block mb-4 font-title">Oportunidades</label>
                <textarea className="w-full h-32 bg-transparent outline-none text-sm font-medium" value={data.swot.oportunidades.join('\n')} onChange={(e) => updateField('swot', 'oportunidades', e.target.value.split('\n'))} />
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                <label className="font-bold text-amber-700 text-xs uppercase block mb-4 font-title">Ameaças</label>
                <textarea className="w-full h-32 bg-transparent outline-none text-sm font-medium" value={data.swot.ameacas.join('\n')} onChange={(e) => updateField('swot', 'ameacas', e.target.value.split('\n'))} />
              </div>
            </div>
          </div>
        );

      case SectionId.INVESTIMENTO:
        const totalInv = Object.values(data.investimento).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0);
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NumberField label="Propriedades / Terrenos" value={data.investimento.propriedadesTerrenos} onChange={(v) => updateField('investimento', 'propriedadesTerrenos', v)} />
              <NumberField label="Edifícios / Construções" value={data.investimento.propriedadesEdificios} onChange={(v) => updateField('investimento', 'propriedadesEdificios', v)} />
              <NumberField label="Equipamento Básico" value={data.investimento.equipamentoBasico} onChange={(v) => updateField('investimento', 'equipamentoBasico', v)} />
              <NumberField label="Equipamento Transporte" value={data.investimento.transporte} onChange={(v) => updateField('investimento', 'transporte', v)} />
              <NumberField label="Equipamento Administrativo" value={data.investimento.administrativo} onChange={(v) => updateField('investimento', 'administrativo', v)} />
              <NumberField label="Software / Aplicações" value={data.investimento.software} onChange={(v) => updateField('investimento', 'software', v)} />
              <NumberField label="Fundo de Maneio" value={data.investimento.fundoManeio} onChange={(v) => updateField('investimento', 'fundoManeio', v)} />
              <NumberField label="Outros Investimentos" value={data.investimento.diversos} onChange={(v) => updateField('investimento', 'diversos', v)} />
            </div>
            <div className="mt-10 p-8 bg-fama-olive text-white rounded-[2rem] flex justify-between items-center shadow-xl shadow-fama-olive/20">
              <span className="font-bold uppercase tracking-widest text-sm font-title">Investimento Total Previsto</span>
              <span className="text-3xl font-title font-black">{totalInv.toLocaleString('pt-PT')} €</span>
            </div>
          </div>
        );

      case SectionId.FINANCIAMENTO:
        const totalFin = Object.values(data.financiamento).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0);
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberField label="Capital Próprio" value={data.financiamento.capitalProprio} onChange={(v) => updateField('financiamento', 'capitalProprio', v)} />
              <NumberField label="Empréstimo Bancário" value={data.financiamento.bancario7Anos} onChange={(v) => updateField('financiamento', 'bancario7Anos', v)} />
              <NumberField label="Subsídio Desemprego (M.U.)" value={data.financiamento.subsidioDesemprego} onChange={(v) => updateField('financiamento', 'subsidioDesemprego', v)} />
              <NumberField label="Outras Fontes" value={data.financiamento.outros} onChange={(v) => updateField('financiamento', 'outros', v)} />
            </div>
            <div className="mt-10 p-8 bg-fama-dark text-white rounded-[2rem] flex justify-between items-center">
              <span className="font-bold uppercase tracking-widest text-sm font-title">Financiamento Total Previsto</span>
              <span className="text-3xl font-title font-black">{totalFin.toLocaleString('pt-PT')} €</span>
            </div>
          </div>
        );

      case SectionId.PROJECOES:
        const chartData = {
          labels: ['Ano 1', 'Ano 2', 'Ano 3'],
          datasets: [
            { label: 'Vendas/Serviços', data: data.projecoes.vendas, backgroundColor: '#f1b511', borderRadius: 10 },
            { label: 'Gastos Pessoal', data: data.projecoes.gastosPessoal, backgroundColor: '#6b6a55', borderRadius: 10 }
          ]
        };
        return (
          <div className="space-y-12 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
               <div className="h-64"><Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map(i => <NumberField key={i} label={`Vendas Previstas Ano ${i+1}`} value={data.projecoes.vendas[i]} onChange={(v) => updateDeepField('projecoes', 'vendas', i, v)} />)}
            </div>
          </div>
        );

      case SectionId.RECECAO:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <div className="bg-slate-50 p-12 rounded-[3rem] border-2 border-slate-100 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="ID do Projeto" value={data.rececao.projetoId} disabled onChange={() => {}} />
                <FormField label="Nome do Projeto" value={data.rececao.projetoNome} disabled onChange={() => {}} />
              </div>
              <FormField label="Nome do Responsável pela Receção (Município)" value={data.rececao.nomeResponsavel} onChange={(v) => updateField('rececao', 'nomeResponsavel', v)} />
              <div className="grid grid-cols-2 gap-6">
                <FormField label="Data da Entrega" type="date" value={data.rececao.dataRececao} onChange={(v) => updateField('rececao', 'dataRececao', v)} />
                <FormField label="Hora da Entrega" type="time" value={data.rececao.horaRececao} onChange={(v) => updateField('rececao', 'horaRececao', v)} />
              </div>
            </div>
          </div>
        );

      case SectionId.INSTRUCOES:
        return (
          <div className="space-y-8 animate-in fade-in">
            <SectionHeader title={currentSection.title} description={currentSection.description} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-fama-yellow/10 text-fama-yellow rounded-3xl flex items-center justify-center mb-6"><Icons.Target size={40} /></div>
                  <h4 className="text-2xl font-title font-black mb-4 uppercase tracking-tighter">O Seu Negócio, Estruturado</h4>
                  <p className="text-slate-500 font-normal">Acompanhe o guia oficial passo a passo. A IA ajuda-o a fundamentar cada secção financeira e estratégica.</p>
               </div>
               <div className="bg-fama-olive p-10 rounded-[3rem] text-white flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-white/10 text-white rounded-3xl flex items-center justify-center mb-6"><Icons.Download size={40} /></div>
                  <h4 className="text-2xl font-title font-black mb-4 uppercase tracking-tighter">Dossier de Candidatura</h4>
                  <p className="text-white/70 font-normal">No final, receba um PDF formatado segundo os padrões municipais pronto para entrega.</p>
               </div>
            </div>
            <button onClick={() => setActiveSection(SectionId.SUMARIO_EXECUTIVO)} className="w-full py-8 bg-fama-yellow rounded-[2.5rem] font-title font-black text-2xl hover:scale-[1.01] transition-all shadow-xl uppercase">Começar Elaboração</button>
          </div>
        );

      default:
        return <div className="p-20 text-center text-slate-300 font-normal italic">Selecione uma secção no menu lateral para continuar.</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative selection:bg-fama-yellow/20">
      <PrintView data={data} ref={printRef} />
      
      <aside className={`fixed md:relative inset-y-0 left-0 z-[150] w-80 bg-white border-r transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-transform flex flex-col no-print`}>
        <div className="p-8 flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-4 mb-10 group cursor-pointer" onClick={() => setActiveSection(SectionId.INSTRUCOES)}>
            <div className="w-10 h-10 bg-fama-yellow rounded-xl flex items-center justify-center font-title font-black">fP</div>
            <h1 className="text-lg font-title font-black tracking-tight text-fama-dark uppercase">famaPLAN</h1>
          </div>
          <button onClick={() => setShowPlansList(true)} className="mb-8 w-full px-4 py-3 bg-slate-50 rounded-xl flex items-center gap-3 border text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all font-title">
            <Icons.Save size={14} /> Portefólio de Projetos
          </button>
          <nav className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {SECTIONS.map((s) => <SidebarItem key={s.id} section={s} active={activeSection === s.id} onClick={() => setActiveSection(s.id)} />)}
          </nav>
        </div>
        <div className="p-6 border-t">
          <button onClick={() => isPlanSaved && setShowExportModal(true)} disabled={!isPlanSaved} className={`w-full py-5 rounded-2xl font-title font-bold text-xs uppercase tracking-widest transition-all ${isPlanSaved ? 'bg-black text-white hover:bg-fama-dark' : 'bg-slate-100 text-slate-300'}`}>Exportar Plano</button>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-12 lg:p-16 max-w-6xl mx-auto w-full no-print">
        <div className="bg-white rounded-[3rem] shadow-2xl min-h-[85vh] flex flex-col overflow-hidden border">
          <div className="flex-1 p-8 sm:p-12 lg:p-20 overflow-y-auto custom-scrollbar">
            {renderSection()}
          </div>
          <footer className="p-8 border-t bg-slate-50/30 flex justify-between items-center">
            <button onClick={() => currentIndex > 0 && setActiveSection(SECTIONS[currentIndex - 1].id)} disabled={currentIndex === 0} className="px-8 py-4 font-bold text-[10px] uppercase tracking-widest disabled:opacity-20 flex items-center gap-2 font-title"><Icons.ChevronLeft size={16}/> Voltar</button>
            <button onClick={currentIndex === SECTIONS.length - 1 ? () => handleFinalize() : () => setActiveSection(SECTIONS[currentIndex + 1].id)} className="px-10 py-4 rounded-xl font-bold bg-fama-olive text-white shadow-xl text-[10px] uppercase tracking-widest flex items-center gap-2 font-title">{currentIndex === SECTIONS.length - 1 ? 'Finalizar Plano' : 'Continuar'} <Icons.ChevronRight size={16}/></button>
          </footer>
        </div>
      </main>

      {/* Modal Portefólio */}
      {showPlansList && (
        <div onClick={() => setShowPlansList(false)} className="fixed inset-0 bg-slate-900/90 backdrop-blur-3xl z-[450] p-4 flex items-center justify-center no-print">
          <div onClick={e => e.stopPropagation()} className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
             <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-title font-black text-fama-dark uppercase tracking-tight">Portefólio de Projetos</h2>
                <button onClick={() => setShowPlansList(false)} className="text-slate-300 hover:text-rose-500"><Icons.X size={32} /></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-100 sticky top-0 z-10">
                      <tr className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-title">
                         <th className="px-8 py-4">ID</th>
                         <th className="px-8 py-4">Nome Projeto</th>
                         <th className="px-8 py-4 text-center">Modificado</th>
                         <th className="px-8 py-4 text-right pr-12">Ação</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y text-sm">
                      {filteredPlans.map(p => (
                        <tr key={p.id} className="hover:bg-fama-yellow/5 transition-colors group cursor-pointer" onClick={() => { setData(p.data); setIsPlanSaved(true); setShowPlansList(false); }}>
                           <td className="px-8 py-4 text-xs font-medium text-slate-400">{p.id}</td>
                           <td className="px-8 py-4 font-medium text-slate-700">{p.name}</td>
                           <td className="px-8 py-4 text-center text-xs text-slate-400">{new Date(p.updated_at).toLocaleDateString()}</td>
                           <td className="px-8 py-4 text-right pr-12 text-fama-olive font-bold text-xs uppercase opacity-0 group-hover:opacity-100 font-title">Abrir Projeto</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* Modal Exportação Otimizado */}
      {showExportModal && (
        <div onClick={() => setShowExportModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[400] flex items-center justify-center p-6 no-print">
          <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl text-center space-y-8 relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowExportModal(false); }} 
              className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-colors z-[50]"
            >
              <Icons.X size={32}/>
            </button>
            <div className="w-24 h-24 bg-fama-yellow/10 text-fama-yellow rounded-3xl flex items-center justify-center mx-auto shadow-inner"><Icons.Download size={44} /></div>
            <div>
              <h2 className="text-3xl font-title font-black tracking-tight uppercase text-fama-dark">Dossier de Candidatura</h2>
              <p className="text-slate-400 mt-2 text-sm font-normal">O seu plano de negócios oficial está pronto para entrega.</p>
            </div>
            <div className="space-y-4">
              {/* Fix: Call with parentheses to match signature (Error line 523/748 candidate) */}
              <button onClick={() => handleExportPdf()} disabled={pdfStatus !== 'idle'} className="w-full py-6 bg-fama-olive text-white rounded-2xl font-title font-bold text-lg hover:bg-fama-dark flex items-center justify-center gap-4 transition-all uppercase tracking-tight">
                {pdfStatus === 'generating' ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <Icons.FileText size={24} />} Exportar PDF Rápido
              </button>
              <button onClick={() => handleSendEmail()} disabled={pdfStatus !== 'idle'} className="w-full py-6 bg-slate-100 text-fama-dark rounded-2xl font-title font-bold text-lg hover:bg-slate-200 flex items-center justify-center gap-4 transition-all uppercase tracking-tight">
                {pdfStatus === 'sending_email' ? <div className="w-6 h-6 border-4 border-slate-300 border-t-fama-dark rounded-full animate-spin" /> : <Icons.Mail size={24} />} Enviar por Email
              </button>
              <button onClick={() => setShowExportModal(false)} className="w-full py-4 text-slate-300 font-bold text-xs uppercase tracking-widest hover:text-fama-olive font-title">Voltar para Edição</button>
            </div>
          </div>
        </div>
      )}

      {isDistilling && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[500] flex flex-col items-center justify-center text-white no-print">
          <div className="w-16 h-16 border-4 border-fama-yellow border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-title font-black uppercase tracking-widest text-fama-yellow">famaPLAN 360º Ativo</h2>
          <p className="text-white/50 text-sm mt-2 font-normal">A processar inteligência estratégica e financeira...</p>
        </div>
      )}
    </div>
  );
}