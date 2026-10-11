import { EmptyState, ScreenHeader, useDensidade, Recado, Rotulo } from '@/ds';
import { CartaoDoTopo } from './components/CartaoDoTopo';
import { DetalheDaFatura } from './components/DetalheDaFatura';
import { LinhaDaFatura } from './components/LinhaDaFatura';
import { useFaturas } from './hooks/useFaturas';

export function FaturasPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useFaturas();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-09' : 'F-09 · Faturas de cartão'}
        title="Faturas de cartão"
        subtitle={campo ? undefined : 'A compra é despesa; pagar a fatura é transferência · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1180,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 }}>
          {tela.cartoes.map((c) => (
            <CartaoDoTopo
              key={c.id}
              cartao={c}
              divida={tela.dividaDe(c.id)}
              ativo={c.id === tela.cartaoId}
              onEscolher={() => tela.escolherCartao(c)}
            />
          ))}
        </div>

        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'minmax(0,1fr)' : '272px minmax(0,1fr)',
            gap: campo ? 14 : 20,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Rotulo>Faturas de {tela.cartao.nome}</Rotulo>
            {tela.doCartao.map((f) => (
              <LinhaDaFatura
                key={f.id}
                fatura={f}
                ativa={f.id === tela.fatura?.id}
                onAbrir={() => tela.abrirFatura(f.id)}
              />
            ))}
          </div>

          {tela.fatura ? (
            <DetalheDaFatura
              fatura={tela.fatura}
              cartao={tela.cartao}
              densidade={densidade}
              pagando={tela.pagando}
              contaPagamento={tela.contaPagamento}
              dataPagamento={tela.dataPagamento}
              onFechar={tela.fechar}
              onIniciarPagamento={tela.iniciarPagamento}
              onCancelarPagamento={tela.cancelarPagamento}
              onEscolherConta={tela.escolherConta}
              onEscolherData={tela.escolherData}
              onConfirmarPagamento={tela.pagar}
            />
          ) : (
            <EmptyState
              title="Nenhuma fatura neste cartão"
              description="A primeira fatura nasce com a primeira compra registrada nesta conta."
            />
          )}
        </div>
      </div>
    </>
  );
}
