import type { Conta, ContaId, Fundo, FundoId } from '@cdd/contracts';
import { Icon } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { ehCaixa } from '../../utils/conta';
import { corDaReserva } from '../../utils/reservas';
import { rotuloLabel } from './constantes';
import { BotaoNovo } from './components/BotaoNovo';
import { LinhaGerenciavel } from './components/LinhaGerenciavel';
import { FormularioDeConta } from './components/FormularioDeConta';
import { FormularioDeFundo } from './components/FormularioDeFundo';
import { useGerenciarContas } from './hooks/useGerenciarContas';

export interface GerenciarContasModalProps {
  contas: readonly Conta[];
  fundos: readonly Fundo[];
  onFechar: () => void;
  onSalvarConta: (conta: Conta) => void;
  onSalvarFundo: (fundo: Fundo) => void;
  onAlternarConta: (id: ContaId) => void;
  onAlternarFundo: (id: FundoId) => void;
}

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
  const {
    aba,
    escolherAba,
    form,
    abrirNovaConta,
    abrirNovoFundo,
    editarConta,
    editarFundo,
    mudarFundo,
    fecharFormulario,
    salvar,
  } = useGerenciarContas(onSalvarConta, onSalvarFundo);

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
                onClick={() => escolherAba(a)}
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
                onClick={abrirNovaConta}
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
                  onEditar={() => editarConta(c)}
                  onAlternar={() => onAlternarConta(c.id)}
                />
              ))}
            </>
          ) : null}

          {form === null && aba === 'fundos' ? (
            <>
              <BotaoNovo
                rotulo="+ Novo fundo"
                onClick={abrirNovoFundo}
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
                  onEditar={() => editarFundo(f)}
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
              onMudar={editarConta}
              onCancelar={fecharFormulario}
              onSalvar={salvar}
            />
          ) : null}

          {form?.modo === 'fundo' ? (
            <FormularioDeFundo
              fundo={form.fundo}
              valor={form.valor}
              onMudar={mudarFundo}
              onCancelar={fecharFormulario}
              onSalvar={salvar}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
