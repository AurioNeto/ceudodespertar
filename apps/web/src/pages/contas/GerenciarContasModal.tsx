import { useState } from 'react';
import type { Conta, ContaId, Fundo, FundoId } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { Icon, StatusBadge } from '../../ds';
import { formatarDinheiro } from '../../lib/formato';
import { contaVazia, corDaReserva, ehCaixa, fundoVazio } from './ContasEFundoPage';

export interface GerenciarContasModalProps {
  contas: readonly Conta[];
  fundos: readonly Fundo[];
  onFechar: () => void;
  onSalvarConta: (conta: Conta) => void;
  onSalvarFundo: (fundo: Fundo) => void;
  onAlternarConta: (id: ContaId) => void;
  onAlternarFundo: (id: FundoId) => void;
}

type Aba = 'contas' | 'fundos';
type Formulario = { modo: 'conta'; conta: Conta } | { modo: 'fundo'; fundo: Fundo; valor: string } | null;

const rotuloLabel = {
  font: 'var(--text-label)',
  letterSpacing: 'var(--tracking-label)',
  textTransform: 'uppercase',
  color: 'var(--text-field-label)',
} as const;

const entrada = {
  minHeight: 40,
  border: '1px solid var(--color-line-strong)',
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  font: 'var(--text-body)',
  color: 'var(--text-primary)',
  outline: 'none',
} as const;

const paraNumero = (v: string): number => {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Excluir aqui só inativa: o item some do painel, o histórico de lançamentos
 * continua de pé e a conta segue gerenciável.
 */
export function GerenciarContasModal({
  contas,
  fundos,
  onFechar,
  onSalvarConta,
  onSalvarFundo,
  onAlternarConta,
  onAlternarFundo,
}: GerenciarContasModalProps) {
  const [aba, setAba] = useState<Aba>('contas');
  const [form, setForm] = useState<Formulario>(null);

  const salvar = () => {
    if (!form) return;
    if (form.modo === 'conta') {
      if (!form.conta.nome.trim()) return;
      onSalvarConta(form.conta);
    } else {
      if (!form.fundo.nome.trim()) return;
      onSalvarFundo({ ...form.fundo, valorReservado: reais(paraNumero(form.valor)) });
    }
    setForm(null);
  };

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,24,0.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 30,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-raised)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 20px',
            borderBottom: 'var(--border-hairline)',
          }}
        >
          <span style={rotuloLabel}>Gerenciar contas e fundos</span>
          <button
            type="button"
            aria-label="fechar"
            onClick={onFechar}
            style={{
              width: 34,
              height: 34,
              border: '1px solid var(--color-line)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {form === null ? (
          <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0' }}>
            {(['contas', 'fundos'] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={aba === a}
                onClick={() => setAba(a)}
                style={{
                  font: 'var(--text-small)',
                  padding: '9px 16px',
                  minHeight: 38,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  border: `1px solid ${aba === a ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
                  background: aba === a ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                  color: aba === a ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
                }}
              >
                {a === 'contas' ? 'Contas' : 'Fundos'}
              </button>
            ))}
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: '16px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {form === null && aba === 'contas' ? (
            <>
              <BotaoNovo
                rotulo="+ Nova conta"
                onClick={() => setForm({ modo: 'conta', conta: contaVazia(`c-${Date.now()}` as ContaId) })}
              />
              {contas.map((c) => (
                <LinhaGerenciavel
                  key={c.id}
                  marcador={<Icon name={ehCaixa(c) ? 'wallet' : 'landmark'} size={17} color="var(--color-royal)" />}
                  nome={c.nome}
                  nota={c.descricao}
                  ativa={c.ativa}
                  rotuloAtiva="Ativa"
                  rotuloInativa="Inativa"
                  onEditar={() => setForm({ modo: 'conta', conta: c })}
                  onAlternar={() => onAlternarConta(c.id)}
                />
              ))}
            </>
          ) : null}

          {form === null && aba === 'fundos' ? (
            <>
              <BotaoNovo
                rotulo="+ Novo fundo"
                onClick={() => setForm({ modo: 'fundo', fundo: fundoVazio(`f-${Date.now()}` as FundoId), valor: '' })}
              />
              {fundos.map((f, i) => (
                <LinhaGerenciavel
                  key={f.id}
                  marcador={
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 'var(--radius-pill)',
                        background: corDaReserva(i),
                        flex: '0 0 auto',
                      }}
                    />
                  }
                  nome={f.nome}
                  nota={f.nota}
                  valor={formatarDinheiro(f.valorReservado)}
                  ativa={f.ativo}
                  rotuloAtiva="Ativo"
                  rotuloInativa="Inativo"
                  onEditar={() =>
                    setForm({
                      modo: 'fundo',
                      fundo: f,
                      valor: formatarDinheiro(f.valorReservado),
                    })
                  }
                  onAlternar={() => onAlternarFundo(f.id)}
                />
              ))}
              <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginTop: 4 }}>
                Inativar um fundo devolve o valor para "Livre"; criar ou editar realoca a partir do mesmo fundo próprio.
              </p>
            </>
          ) : null}

          {form?.modo === 'conta' ? (
            <FormularioDeConta
              conta={form.conta}
              onMudar={(conta) => setForm({ modo: 'conta', conta })}
              onCancelar={() => setForm(null)}
              onSalvar={salvar}
            />
          ) : null}

          {form?.modo === 'fundo' ? (
            <FormularioDeFundo
              fundo={form.fundo}
              valor={form.valor}
              onMudar={(fundo, valor) => setForm({ modo: 'fundo', fundo, valor })}
              onCancelar={() => setForm(null)}
              onSalvar={salvar}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BotaoNovo({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        alignSelf: 'flex-start',
        font: 'var(--text-small)',
        padding: '8px 14px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        border: '1px dashed var(--color-line-strong)',
        background: 'var(--bg-card)',
        color: 'var(--color-royal-deep)',
      }}
    >
      {rotulo}
    </button>
  );
}

function LinhaGerenciavel({
  marcador,
  nome,
  nota,
  valor,
  ativa,
  rotuloAtiva,
  rotuloInativa,
  onEditar,
  onAlternar,
}: {
  marcador: React.ReactNode;
  nome: string;
  nota: string;
  valor?: string;
  ativa: boolean;
  rotuloAtiva: string;
  rotuloInativa: string;
  onEditar: () => void;
  onAlternar: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        background: ativa ? 'var(--bg-card)' : 'var(--bg-sunken)',
        opacity: ativa ? 1 : 0.7,
      }}
    >
      {marcador}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{nome}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
      </span>
      {valor ? (
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {valor}
        </span>
      ) : null}
      <StatusBadge tone={ativa ? 'confirmed' : 'neutral'}>{ativa ? rotuloAtiva : rotuloInativa}</StatusBadge>
      <button
        type="button"
        aria-label={`editar ${nome}`}
        onClick={onEditar}
        style={{
          width: 32,
          height: 32,
          flex: '0 0 auto',
          border: '1px solid var(--color-line)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-pill)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="pencil" size={15} color="var(--text-secondary)" />
      </button>
      <button
        type="button"
        onClick={onAlternar}
        style={{
          flex: '0 0 auto',
          padding: '0 14px',
          minHeight: 38,
          font: 'var(--text-small)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          border: `1px solid ${ativa ? 'var(--color-line)' : 'var(--color-confirmed)'}`,
          background: 'var(--bg-card)',
          color: ativa ? 'var(--color-attention)' : 'var(--color-confirmed)',
        }}
      >
        {ativa ? 'Excluir' : 'Reativar'}
      </button>
    </div>
  );
}

function CampoDoModal({
  rotulo,
  valor,
  placeholder,
  onMudar,
}: {
  rotulo: string;
  valor: string;
  placeholder: string;
  onMudar: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginBottom: 5 }}>{rotulo}</span>
      <input value={valor} placeholder={placeholder} onChange={(e) => onMudar(e.target.value)} style={entrada} />
    </label>
  );
}

function AcoesDoFormulario({
  rotuloSalvar,
  onCancelar,
  onSalvar,
}: {
  rotuloSalvar: string;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
      <button
        type="button"
        onClick={onCancelar}
        style={{
          font: 'var(--text-body)',
          padding: '9px 16px',
          minHeight: 40,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          border: '1px solid var(--color-line)',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
        }}
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSalvar}
        style={{
          font: 'var(--text-body-strong)',
          padding: '9px 18px',
          minHeight: 40,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          border: '1px solid var(--color-royal-border)',
          background: 'var(--color-royal-soft)',
          color: 'var(--color-royal-deep)',
        }}
      >
        {rotuloSalvar}
      </button>
    </div>
  );
}

function FormularioDeConta({
  conta,
  onMudar,
  onCancelar,
  onSalvar,
}: {
  conta: Conta;
  onMudar: (c: Conta) => void;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={rotuloLabel}>{conta.nome ? `Editar ${conta.nome}` : 'Nova conta'}</span>
      <CampoDoModal
        rotulo="Nome da conta"
        valor={conta.nome}
        placeholder="Cora PJ"
        onMudar={(nome) => onMudar({ ...conta, nome })}
      />
      <CampoDoModal
        rotulo="Descrição"
        valor={conta.descricao}
        placeholder="conta principal da casa"
        onMudar={(descricao) => onMudar({ ...conta, descricao })}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginBottom: 5 }}>Categoria</span>
          <select
            value={conta.tipo}
            onChange={(e) => onMudar({ ...conta, tipo: e.target.value as Conta['tipo'] })}
            style={entrada}
          >
            <option value="CONTA_CORRENTE">Banco</option>
            <option value="DINHEIRO">Espécie (caixa)</option>
          </select>
        </label>
        <CampoDoModal
          rotulo="Responsável"
          valor={conta.responsavel}
          placeholder="quem cuida desta conta"
          onMudar={(responsavel) => onMudar({ ...conta, responsavel })}
        />
      </div>
      <AcoesDoFormulario rotuloSalvar="Salvar conta" onCancelar={onCancelar} onSalvar={onSalvar} />
    </div>
  );
}

function FormularioDeFundo({
  fundo,
  valor,
  onMudar,
  onCancelar,
  onSalvar,
}: {
  fundo: Fundo;
  valor: string;
  onMudar: (f: Fundo, valor: string) => void;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={rotuloLabel}>{fundo.nome ? `Editar ${fundo.nome}` : 'Novo fundo'}</span>
      <CampoDoModal
        rotulo="Nome do fundo"
        valor={fundo.nome}
        placeholder="Obra do dormitório"
        onMudar={(nome) => onMudar({ ...fundo, nome }, valor)}
      />
      <CampoDoModal
        rotulo="Nota"
        valor={fundo.nota}
        placeholder="meta, prazo ou destino combinado"
        onMudar={(nota) => onMudar({ ...fundo, nota }, valor)}
      />
      <CampoDoModal
        rotulo="Valor alocado (R$)"
        valor={valor}
        placeholder="0,00"
        onMudar={(v) => onMudar(fundo, v)}
      />
      <AcoesDoFormulario rotuloSalvar="Salvar fundo" onCancelar={onCancelar} onSalvar={onSalvar} />
    </div>
  );
}
