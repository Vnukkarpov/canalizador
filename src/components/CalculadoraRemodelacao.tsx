import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

/* =====================================================================
 * TABELA DE PREÇOS — edite aqui os valores (€, sem IVA)
 * Cada ponto = mão de obra + tubagem e acessórios de ligação (água quente/fria).
 * ===================================================================== */

type Material = 'pex' | 'multicamada';

const MATERIALS: Record<Material, { label: string; hint: string }> = {
  pex: { label: 'PEX', hint: 'Tubo flexível, menos ligações, rápido de instalar. Mais económico.' },
  multicamada: { label: 'Multicamada', hint: 'Tubo PEX-AL-PEX, mais rígido, mantém a forma. Acabamento mais “limpo”.' },
};

// Taxa fixa: ligação ao contador/ramal, colector, válvulas de corte gerais, teste de pressão
const BASE_PRICE = 400;
type Typology = 'T1' | 'T2' | 'T3';

const DEFAULT_POINTS_BY_TYPOLOGY: Record<Typology, Record<string, number>> = {
  T1: { sanita: 1, lavatorio: 1, duche: 1, lavaloica: 1, maqLoica: 1, maqRoupa: 1 },
  T2: { sanita: 2, lavatorio: 2, duche: 2, lavaloica: 1, maqLoica: 1, maqRoupa: 1 },
  T3: { sanita: 3, lavatorio: 3, duche: 3, lavaloica: 1, maqLoica: 1, maqRoupa: 1 },
};

const PROPERTY = {
  apartamento: { label: 'Apartamento', factor: 1 },
  moradia: { label: 'Moradia', factor: 1.15 },
} as const;
type PropertyKind = keyof typeof PROPERTY;

const SCOPE = {
  nova: { label: 'Instalação nova', hint: 'Obra nova ou paredes/pavimentos livres', factor: 1 },
  parcial: { label: 'Renovação parcial', hint: 'Só casas de banho e/ou cozinha', factor: 1.1 },
  total: { label: 'Renovação total', hint: 'Substituir toda a tubagem antiga', factor: 1.25 },
} as const;
type Scope = keyof typeof SCOPE;

const COMPLEXITY = {
  simples: { label: 'Simples', hint: 'Bom acesso, prédio recente, tubagem à vista ou paredes abertas', factor: 1 },
  media: { label: 'Média', hint: 'Situação habitual, alguns rasgos em parede/pavimento', factor: 1.2 },
  complexa: { label: 'Complexa', hint: 'Prédio antigo, lajes, pouco acesso, muitos desvios', factor: 1.45 },
} as const;
type Complexity = keyof typeof COMPLEXITY;

const URGENCY = {
  normal: { label: 'Normal', hint: 'Marcação habitual', factor: 1 },
  rapido: { label: 'Prazo apertado', hint: 'Início rápido / equipa reforçada', factor: 1.15 },
} as const;
type Urgency = keyof typeof URGENCY;

type Point = { id: string; label: string; hint?: string; pex: number; multi: number; max: number; group: string; drain: boolean };

const POINTS: Point[] = [
  // Casas de banho e WC
  { id: 'sanita', group: 'bathroom', label: 'Sanitas', hint: 'Autoclismo exterior ou de apoio', pex: 60, multi: 75, max: 8, drain: true },
  { id: 'sanitaEmb', group: 'bathroom', label: 'Sanitas suspensas (autoclismo embutido)', hint: 'Suplemento: estrutura e caixa embutida', pex: 130, multi: 145, max: 6, drain: true },
  { id: 'lavatorio', group: 'bathroom', label: 'Lavatórios', pex: 85, multi: 105, max: 10, drain: true },
  { id: 'bide', group: 'bathroom', label: 'Bidés', pex: 85, multi: 105, max: 6, drain: true },
  { id: 'duche', group: 'bathroom', label: 'Duches', hint: 'Misturadora ou coluna de duche', pex: 95, multi: 120, max: 8, drain: true },
  { id: 'banheira', group: 'bathroom', label: 'Banheiras', pex: 115, multi: 140, max: 4, drain: true },
  // Cozinha
  { id: 'lavaloica', group: 'kitchen', label: 'Lava-loiça', pex: 90, multi: 110, max: 3, drain: true },
  { id: 'maqLoica', group: 'kitchen', label: 'Máquina de lavar loiça', pex: 70, multi: 85, max: 3, drain: true },
  { id: 'frigorifico', group: 'kitchen', label: 'Frigorífico americano / gelo', pex: 45, multi: 55, max: 2, drain: false },
  // Lavandaria e outros
  { id: 'maqRoupa', group: 'laundry', label: 'Máquina de lavar roupa', pex: 75, multi: 90, max: 4, drain: true },
  { id: 'tanque', group: 'laundry', label: 'Tanque / lavandaria', pex: 85, multi: 105, max: 3, drain: true },
  { id: 'exterior', group: 'laundry', label: 'Torneira exterior (jardim, varanda)', pex: 70, multi: 85, max: 6, drain: false },
];

const GROUPS: { id: string; title: string; sub: string }[] = [
  { id: 'bathroom', title: 'Casas de banho e WC', sub: 'Some os pontos de todas as casas de banho e lavabos da casa.' },
  { id: 'kitchen', title: 'Cozinha', sub: 'Pontos de água na cozinha.' },
  { id: 'laundry', title: 'Lavandaria e exterior', sub: 'Se não tiver lavandaria, deixe a zero ou use só a máquina de roupa.' },
];

// Esgotos (PVC): acréscimo sobre o valor do ponto
const DRAIN_FACTOR = 0.45;

const EXTRAS = {
  termoacumulador: { label: 'Termoacumulador / esquentador', hint: 'Montagem e ligação hidráulica', price: 140 },
  filtro: { label: 'Filtro anticalcário', hint: 'Recomendado no Algarve (água calcária)', price: 120 },
  redutora: { label: 'Válvula redutora de pressão', hint: 'Protege tubagem e eletrodomésticos', price: 90 },
  recirculacao: { label: 'Circuito de recirculação de água quente', hint: 'Água quente instantânea nas torneiras', price: 260 },
  colectorExtra: { label: 'Colector com válvulas por divisão', hint: 'Corte de água independente por zona', price: 160 },
} as const;
type ExtraId = keyof typeof EXTRAS;

const SECOND_FLOOR_FACTOR = 1.1; // moradia com 2 pisos
const MIN_PRICE = 450;
const RANGE_LOW = 0.9;
const RANGE_HIGH = 1.15;
const VAT = 0.06; // reabilitação habitação
const WHATSAPP = '351912224291';

const eur = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const round5 = (n: number) => Math.round(n / 5) * 5;

function Choice<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; hint?: string }[];
}) {
  return (
    <div className={`grid gap-2 ${options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`text-left rounded-xl border px-4 py-3 transition ${
              active
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/20'
                : 'border-slate-200 bg-white hover:border-blue-300'
            }`}
          >
            <span className={`block font-bold ${active ? 'text-blue-700' : 'text-slate-900'}`}>{o.label}</span>
            {o.hint && <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ label, hint, value, max, onChange }: { label: string; hint?: string; value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" aria-label={`Menos ${label}`} disabled={value <= 0} onClick={() => onChange(value - 1)}
          className="w-9 h-9 rounded-lg border border-slate-300 bg-white flex items-center justify-center text-slate-700 hover:border-blue-400 disabled:opacity-35 disabled:hover:border-slate-300">
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-6 text-center font-bold tabular-nums">{value}</span>
        <button type="button" aria-label={`Mais ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-lg border border-slate-300 bg-white flex items-center justify-center text-slate-700 hover:border-blue-400 disabled:opacity-35 disabled:hover:border-slate-300">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
      <h3 className="flex items-center gap-3 text-lg font-bold text-slate-900 mb-4">
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function CalculadoraRemodelacao() {
  const [property, setProperty] = useState<PropertyKind>('apartamento');
  const [floors, setFloors] = useState<1 | 2>(1);
  const [typology, setTypology] = useState<Typology>('T2');
  const [material, setMaterial] = useState<Material>('pex');
  const [scope, setScope] = useState<Scope>('parcial');
  const [complexity, setComplexity] = useState<Complexity>('media');
  const [urgency, setUrgency] = useState<Urgency>('normal');
  const [drain, setDrain] = useState(false);
  const [laborOnly, setLaborOnly] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>(() => ({ ...DEFAULT_POINTS_BY_TYPOLOGY.T2 }));
  const [extras, setExtras] = useState<Record<ExtraId, boolean>>({
    termoacumulador: false, filtro: false, redutora: false, recirculacao: false, colectorExtra: false,
  });

  const setCount = (id: string, n: number) => setCounts((c) => ({ ...c, [id]: n }));
  const handleTypologyChange = (t: Typology) => {
    setTypology(t);
    setCounts({ ...DEFAULT_POINTS_BY_TYPOLOGY[t] });
  };
  const handleScopeChange = (s: Scope) => {
    setScope(s);
    if (s === 'total') setDrain(true);
  };

  const result = useMemo(() => {
    const matKey = material === 'pex' ? 'pex' : 'multi';
    let pointsTotal = 0;
    let pointsCount = 0;
    for (const p of POINTS) {
      const n = counts[p.id] ?? 0;
      if (!n) continue;
      const unit = p[matKey] * (p.drain && drain ? 1 + DRAIN_FACTOR : 1);
      pointsTotal += unit * n;
      pointsCount += n;
    }
    const base = BASE_PRICE;
    const extrasTotal = (Object.keys(EXTRAS) as ExtraId[]).reduce((s, k) => s + (extras[k] ? EXTRAS[k].price : 0), 0);

    const subtotal = base + pointsTotal;
    const factor =
      PROPERTY[property].factor *
      (property === 'moradia' && floors === 2 ? SECOND_FLOOR_FACTOR : 1) *
      SCOPE[scope].factor *
      COMPLEXITY[complexity].factor *
      URGENCY[urgency].factor;

    let total = subtotal * factor + extrasTotal;
    // "Só mão de obra": estimativa sem tubagem/acessórios (~35% do valor dos pontos e base)
    if (laborOnly) total -= subtotal * factor * 0.35;
    total = Math.max(total, MIN_PRICE);

    return {
      pointsCount,
      base,
      extrasTotal,
      factor,
      total,
      low: round5(total * RANGE_LOW),
      high: round5(total * RANGE_HIGH),
    };
  }, [property, floors, typology, material, scope, complexity, urgency, drain, laborOnly, counts, extras]);

  const waText = useMemo(() => {
    const pts = POINTS.filter((p) => (counts[p.id] ?? 0) > 0).map((p) => `${p.label}: ${counts[p.id]}`);
    const ex = (Object.keys(EXTRAS) as ExtraId[]).filter((k) => extras[k]).map((k) => EXTRAS[k].label);
    const lines = [
      'Olá Karpov, usei a calculadora do site e gostaria de um orçamento.',
      `${PROPERTY[property].label} ${typology}${property === 'moradia' ? ` (${floors} piso${floors > 1 ? 's' : ''})` : ''}`,
      `Material: ${MATERIALS[material].label}`,
      `Trabalho: ${SCOPE[scope].label} · Complexidade: ${COMPLEXITY[complexity].label}`,
      `Esgotos: ${drain ? 'sim' : 'não'} · ${laborOnly ? 'Só mão de obra' : 'Com tubagem e acessórios'}`,
      pts.length ? `Pontos: ${pts.join(', ')}` : '',
      ex.length ? `Extras: ${ex.join(', ')}` : '',
      `Estimativa: ${eur(result.low)} – ${eur(result.high)} (sem IVA)`,
    ].filter(Boolean);
    return encodeURIComponent(lines.join('\n'));
  }, [property, floors, typology, material, scope, complexity, drain, laborOnly, counts, extras, result.low, result.high]);

  const typ = (['T1', 'T2', 'T3'] as Typology[]).map((t) => ({
    id: t, label: t,
    hint: t === 'T1' ? '1 quarto' : t === 'T2' ? '2 quartos' : '3 quartos',
  }));

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
      <div className="space-y-5">
        <Step n={1} title="O imóvel">
          <div className="space-y-4">
            <Choice value={property} onChange={setProperty} options={(Object.keys(PROPERTY) as PropertyKind[]).map((k) => ({ id: k, label: PROPERTY[k].label }))} />
            {property === 'moradia' && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Número de pisos</p>
                <Choice value={String(floors) as '1' | '2'} onChange={(v) => setFloors(v === '2' ? 2 : 1)}
                  options={[{ id: '1', label: '1 piso' }, { id: '2', label: '2 pisos' }]} />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Tipologia</p>
              <Choice value={typology} onChange={handleTypologyChange} options={typ} />
            </div>
          </div>
        </Step>

        <Step n={2} title="Material da tubagem">
          <Choice value={material} onChange={setMaterial}
            options={(Object.keys(MATERIALS) as Material[]).map((k) => ({ id: k, label: MATERIALS[k].label, hint: MATERIALS[k].hint }))} />
        </Step>

        <Step n={3} title="Tipo e complexidade do trabalho">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Tipo de obra</p>
              <Choice value={scope} onChange={handleScopeChange}
                options={(Object.keys(SCOPE) as Scope[]).map((k) => ({ id: k, label: SCOPE[k].label, hint: SCOPE[k].hint }))} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Esgotos (drenagem)</p>
              <Choice
                value={drain ? 'sim' : 'nao'}
                onChange={(v) => setDrain(v === 'sim')}
                options={[
                  { id: 'nao', label: 'Só abastecimento de água', hint: 'Mantém os esgotos atuais' },
                  { id: 'sim', label: 'Água + esgotos (PVC)', hint: 'Recomendado na renovação total' },
                ]}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Complexidade</p>
              <Choice value={complexity} onChange={setComplexity}
                options={(Object.keys(COMPLEXITY) as Complexity[]).map((k) => ({ id: k, label: COMPLEXITY[k].label, hint: COMPLEXITY[k].hint }))} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Prazo</p>
              <Choice value={urgency} onChange={setUrgency}
                options={(Object.keys(URGENCY) as Urgency[]).map((k) => ({ id: k, label: URGENCY[k].label, hint: URGENCY[k].hint }))} />
            </div>
          </div>
        </Step>

        <Step n={4} title="Pontos de água">
          <div className="space-y-5">
            {GROUPS.map((g) => (
              <div key={g.id}>
                <h4 className="font-bold text-slate-900">{g.title}</h4>
                <p className="text-xs text-slate-500 mb-1">{g.sub}</p>
                <div className="divide-y divide-slate-100">
                  {POINTS.filter((p) => p.group === g.id).map((p) => (
                    <Stepper key={p.id} label={p.label} hint={p.hint} max={p.max} value={counts[p.id] ?? 0} onChange={(n) => setCount(p.id, n)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Step>

        <Step n={5} title="Extras e opções">
          <div className="space-y-2">
            {(Object.keys(EXTRAS) as ExtraId[]).map((k) => (
              <Toggle key={k} label={EXTRAS[k].label} hint={EXTRAS[k].hint} checked={extras[k]}
                onChange={(v) => setExtras((e) => ({ ...e, [k]: v }))} />
            ))}
            <Toggle label="Só mão de obra" hint="Os materiais (tubagem, acessórios) ficam por sua conta" checked={laborOnly} onChange={setLaborOnly} />
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Louças sanitárias, torneiras, bases de duche, termoacumuladores e outros equipamentos não estão incluídos.
          </p>
        </Step>
      </div>

      {/* Resultado */}
      <aside className="lg:sticky lg:top-24 rounded-2xl bg-slate-900 text-white p-6 shadow-xl" aria-live="polite">
        <p className="text-xs uppercase tracking-widest font-bold text-sky-300">Estimativa</p>
        <p className="text-3xl sm:text-4xl font-extrabold mt-2 leading-tight font-display tabular-nums">
          {eur(result.low)} – {eur(result.high)}
        </p>
        <p className="text-sm text-slate-300 mt-1">sem IVA</p>
        <p className="text-sm text-slate-300 mt-3">
          Com IVA a 6%: <strong className="text-white tabular-nums">{eur(result.low * (1 + VAT))} – {eur(result.high * (1 + VAT))}</strong>
        </p>
        <ul className="mt-5 space-y-1.5 text-sm text-slate-300 border-t border-slate-700 pt-4">
          <li className="flex justify-between"><span>{typology} · {MATERIALS[material].label}</span><span>{PROPERTY[property].label}</span></li>
          <li className="flex justify-between"><span>Pontos de água</span><span>{result.pointsCount}</span></li>
          <li className="flex justify-between"><span>Extras</span><span>{eur(result.extrasTotal)}</span></li>
        </ul>
        <a
          href={`https://wa.me/${WHATSAPP}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
        >
          Enviar para o WhatsApp
        </a>
      </aside>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${checked ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-4 h-4 accent-blue-600" />
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}
