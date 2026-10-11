import { Button, ScreenHeader, useDensidade, Cartao, Numero, Recado } from '@/ds';
import { formatarBRL, formatarLitros } from '@/pages/utils/formato';
import { aquisicaoExterna } from './mocks/feitio';
import { Anteriores } from './components/Anteriores';
import { Comparacao } from './components/Comparacao';
import { FeitioEmCurso } from './components/FeitioEmCurso';
import { PainelDeConclusao } from './components/PainelDeConclusao';
import { PorQueApurar } from './components/PorQueApurar';
import { useFeitio } from './hooks/useFeitio';

/**
 * `S-04` · Feitio — Doc 4 §8 e Doc 2 §4.3.
 *
 * O único lugar do sistema onde evento, custo e estoque se encontram: o feitio
 * é um evento, o que se gasta nele são lançamentos vinculados ao mesmo evento,
 * e o que sai dele é um lote.
 *
 * A razão de existir é econômica, não contábil. Hoje o feitio é despesa
 * dispersa — folha aqui, diesel ali, comida da equipe em outro lugar — e a
 * casa não consegue responder quanto custa o litro que ela produz. Sem esse
 * número não há como comparar com comprar de fora, que é a decisão real por
 * trás de fazer feitio.
 */

export function FeitioPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const tela = useFeitio();

  return (
    <>
      <ScreenHeader
        code={campo ? 'S-04' : 'S-04 · Feitio'}
        title="Feitio"
        subtitle={campo ? undefined : 'Onde evento, custo e estoque se encontram · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 26px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1020,
          minWidth: 0,
        }}
      >
        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        <PorQueApurar />

        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: campo ? 14 : 20,
            }}
          >
            <Numero
              rotulo="Gasto até agora"
              valor={formatarBRL(tela.total)}
              nota={`${formatarBRL(tela.materiaPrima)} de matéria-prima`}
              destaque
            />
            <Numero
              rotulo={tela.concluido ? 'Custo por litro' : 'Custo por litro'}
              valor={tela.porLitro !== null ? formatarBRL(tela.porLitro) : 'só no fim'}
              nota={tela.concluido ? `sobre ${formatarLitros(tela.feitio.litrosProduzidos ?? 0)} L` : 'depende de quanto sair'}
              cor={tela.concluido ? 'var(--color-confirmed)' : 'var(--text-secondary)'}
            />
            <Numero
              rotulo="Comprar de fora sai a"
              valor={`${formatarBRL(aquisicaoExterna.custoPorLitro)}/L`}
              nota={`${aquisicaoExterna.fornecedor} · ${aquisicaoExterna.quando}`}
            />
          </div>
        </Cartao>

        <FeitioEmCurso
          feitio={tela.feitio}
          densidade={densidade}
          concluido={tela.concluido}
          pendentes={tela.pendentes.length}
          confirmado={tela.confirmado}
          total={tela.total}
        />

        {tela.concluido ? null : (
          <>
            {tela.concluindo ? (
              <PainelDeConclusao
                densidade={densidade}
                litros={tela.litros}
                forca={tela.forca}
                dataFim={tela.dataFim}
                total={tela.total}
                onLitros={tela.setLitros}
                onForca={tela.setForca}
                onDataFim={tela.setDataFim}
                onCancelar={tela.cancelarConclusao}
                onConcluir={tela.concluir}
              />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 11, alignItems: 'center' }}>
                <Button iconName="flask-conical" density={campo ? 'field' : 'office'} onClick={tela.abrirConclusao}>
                  Concluir o feitio
                </Button>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                  Concluir cria o lote e fecha o custo. Depois disso o feitio não aceita mais consumo.
                </span>
              </div>
            )}
          </>
        )}

        <Comparacao feitio={tela.feitio} concluido={tela.concluido} total={tela.total} densidade={densidade} />

        <Anteriores densidade={densidade} />
      </div>
    </>
  );
}
