import { Icon, ScreenHeader, useDensidade, SeletorDeTipo, Recado } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { BuracoDoRelatorio } from './components/BuracoDoRelatorio';
import { ListaDeUnidades } from './components/ListaDeUnidades';
import { ParametrosDaCasa } from './components/ParametrosDaCasa';
import { TabelaDeCategorias } from './components/TabelaDeCategorias';
import { useCorrecaoDeLinha } from './hooks/useCorrecaoDeLinha';

export function ParametrosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useCorrecaoDeLinha();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-15 · F-16 · A-03' : 'F-15, F-16 e A-03 · Parâmetros'}
        title="Parâmetros"
        subtitle={campo ? undefined : 'Plano de contas, unidades e o que a casa configura · CDD'}
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
        <SeletorDeTipo
          opcoes={[
            { valor: 'categorias', label: 'Categorias' },
            { valor: 'unidades', label: 'Unidades e regimes' },
            { valor: 'casa', label: 'Instituição' },
          ]}
          valor={tela.aba}
          onEscolher={tela.escolherAba}
          densidade={densidade}
        />

        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        {tela.aba === 'categorias' ? (
          <>
            {tela.semLinha.length > 0 ? (
              <BuracoDoRelatorio quantidade={tela.semLinha.length} lancamentos={tela.semLinha.reduce((s, c) => s + c.lancamentos, 0)} />
            ) : (
              <div
                style={{
                  background: 'var(--color-confirmed-soft)',
                  border: '1px solid var(--color-confirmed-border)',
                  borderRadius: 'var(--radius)',
                  padding: '13px 16px',
                  display: 'flex',
                  gap: 11,
                  alignItems: 'center',
                }}
              >
                <Icon name="circle-check" size={18} color="var(--color-confirmed)" />
                <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                  Toda categoria ativa tem linha de relatório. Nada fica fora do DRE.
                </span>
              </div>
            )}

            <TabelaDeCategorias
              categorias={tela.categorias}
              densidade={densidade}
              editando={tela.editando}
              linhaEscolhida={tela.linhaEscolhida}
              onLinha={tela.setLinhaEscolhida}
              onEditar={tela.editar}
              onCancelar={tela.cancelar}
              onCorrigir={tela.corrigir}
            />
          </>
        ) : null}

        {tela.aba === 'unidades' ? (
          <>
            {tela.semRegime.length > 0 ? (
              <div
                style={{
                  background: 'var(--color-pending-soft)',
                  border: '1px solid var(--color-pending-border)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 16px',
                  display: 'flex',
                  gap: 12,
                }}
              >
                <Icon name="message-circle-question" size={19} color="var(--color-pending)" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                    {pluralizar(tela.semRegime.length, 'unidade')} sem regime definido
                  </div>
                  <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '70ch' }}>
                    O regime governa o vocabulário da tela, quais categorias a unidade aceita e se a receita gera
                    obrigação fiscal. É decisão da coordenação, não do sistema — e trava o seed das unidades.
                  </p>
                </div>
              </div>
            ) : null}
            <ListaDeUnidades densidade={densidade} />
          </>
        ) : null}

        {tela.aba === 'casa' ? <ParametrosDaCasa densidade={densidade} /> : null}
      </div>
    </>
  );
}
