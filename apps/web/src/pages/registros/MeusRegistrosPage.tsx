import { useState } from 'react';
import { Receipt, RecordRow, ScreenHeader } from '../../ds';
import { Paginacao } from '../../components/Paginacao';
import { SeletorDeTipo } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { formatarData, formatarDinheiro, pluralizar } from '../../lib/formato';
import { estadoDaLinha, linhasDoRecibo, naturezaDoTipo, rodapeDoRecibo, tomDoRecibo } from '../../lib/recibo';
import { meusLancamentos, rotuloDoTipo } from '../../mocks/lancamentos';

type Visao = 'lista' | 'carrossel';

const POR_PAGINA = 4;
const LARGURA_CARTAO = { office: 560, field: 328 } as const;
const GAP_CARTAO = { office: 20, field: 12 } as const;

export function MeusRegistrosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const [visao, setVisao] = useState<Visao>('lista');
  const [indice, setIndice] = useState(0);
  const [pagina, setPagina] = useState(0);

  const registros = meusLancamentos;
  const totalPaginas = Math.max(1, Math.ceil(registros.length / POR_PAGINA));
  const daPagina = registros.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  const saidas = registros
    .filter((r) => r.tipo === 'SAIDA' && r.status !== 'ESTORNADO')
    .reduce((a, r) => a + r.valor, 0);
  const entradas = registros.filter((r) => r.tipo === 'ENTRADA').reduce((a, r) => a + r.valor, 0);

  const irPara = (i: number) => setIndice((i + registros.length) % registros.length);
  const abrirNoCartao = (i: number) => {
    setIndice(i);
    setVisao('carrossel');
  };

  const largura = LARGURA_CARTAO[densidade];
  const gap = GAP_CARTAO[densidade];

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-02' : 'F-02 · Meus registros'}
        title="Meus registros"
        subtitle={campo ? undefined : 'O que você lançou nos últimos 30 dias · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 20px' : '18px 24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 18,
          maxWidth: campo ? undefined : 1000,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <SeletorDeTipo
            opcoes={[
              { valor: 'lista', label: 'Lista simplificada' },
              { valor: 'carrossel', label: 'Visão completa' },
            ]}
            valor={visao}
            onEscolher={setVisao}
            densidade={densidade}
          />
          {campo ? null : (
            <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {pluralizar(registros.length, 'lançamento')} · saídas {formatarDinheiro(saidas)} · entradas{' '}
              {formatarDinheiro(entradas)}
            </span>
          )}
        </div>

        {visao === 'lista' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {daPagina.map((r, iRel) => (
                <RecordRow
                  key={r.id}
                  description={r.motivo}
                  amount={r.valor / 100}
                  nature={naturezaDoTipo(r.tipo)}
                  meta={rotuloDoTipo(r.tipo)}
                  status={estadoDaLinha(r.status)}
                  density={densidade}
                  onClick={() => abrirNoCartao(pagina * POR_PAGINA + iRel)}
                />
              ))}
            </div>
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              texto={`Página ${pagina + 1} de ${totalPaginas}`}
              onAnterior={() => setPagina((p) => Math.max(0, p - 1))}
              onProxima={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              densidade={densidade}
            />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 12 : 14, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {campo ? null : <SetaRedonda rotulo="anterior" onClick={() => irPara(indice - 1)} />}
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', padding: '4px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    gap,
                    alignItems: 'flex-start',
                    transform: `translateX(${-indice * (largura + gap)}px)`,
                    transition: 'transform var(--motion) ',
                  }}
                >
                  {registros.map((r) => (
                    <Receipt
                      key={r.id}
                      title={`Registrado em ${formatarData(r.data)} às ${r.hora}`}
                      amount={r.valor / 100}
                      tone={tomDoRecibo(r.tipo)}
                      lines={linhasDoRecibo(r)}
                      footnote={campo ? undefined : rodapeDoRecibo(r)}
                      style={{ flex: `0 0 ${largura}px` }}
                    />
                  ))}
                </div>
              </div>
              {campo ? null : <SetaRedonda rotulo="próximo" onClick={() => irPara(indice + 1)} />}
            </div>

            {campo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BotaoLargo rotulo="‹ Anterior" onClick={() => irPara(indice - 1)} />
                <BotaoLargo rotulo="Próximo ›" onClick={() => irPara(indice + 1)} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {registros.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-label={`ir para o registro ${i + 1}`}
                    onClick={() => irPara(i)}
                    style={{
                      width: i === indice ? 26 : 9,
                      height: 9,
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer',
                      padding: 0,
                      background: i === indice ? 'var(--color-royal)' : 'var(--color-line-strong)',
                      transition: 'width var(--motion-fast)',
                    }}
                  />
                ))}
              </div>
            )}

            <div style={{ textAlign: 'center', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {indice + 1} de {registros.length}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SetaRedonda({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        flex: '0 0 auto',
        border: '1px solid var(--color-line-strong)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        font: 'var(--text-body-strong)',
        color: 'var(--text-primary)',
      }}
    >
      {rotulo === 'anterior' ? '‹' : '›'}
    </button>
  );
}

function BotaoLargo({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: 48,
        border: '1px solid var(--color-line-strong)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        font: 'var(--text-body-strong)',
        color: 'var(--text-primary)',
      }}
    >
      {rotulo}
    </button>
  );
}
