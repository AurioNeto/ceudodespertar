import { reais } from '@cdd/contracts';
import { Icon, Numero, Rotulo, type Density } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { participantesDe } from '../../mocks/agenda';
import type { Trabalho } from '../../tipos';
import { AnamneseDoTrabalho } from './components/AnamneseDoTrabalho';
import { Bloco } from './components/Bloco';
import { CabecalhoDoTrabalho } from './components/CabecalhoDoTrabalho';
import { ListaDeParticipantes } from './components/ListaDeParticipantes';
import { ListaDePreparo } from './components/ListaDePreparo';
import { resumoDosParticipantes } from './utils/resumoDosParticipantes';

export interface DetalheDoTrabalhoProps {
  trabalho: Trabalho;
  feitos: Readonly<Record<string, boolean>>;
  webhookAtivo: boolean;
  densidade: Density;
  onVoltar: () => void;
  onAlternarTarefa?: (indice: number) => void;
  onAlternarWebhook?: () => void;
  onEditar?: () => void;
  onDuplicar?: () => void;
  onCancelar?: () => void;
  onAviso: (texto: string) => void;
}

export function DetalheDoTrabalho({
  trabalho: ev,
  feitos,
  webhookAtivo,
  densidade,
  onVoltar,
  onAlternarTarefa,
  onAlternarWebhook,
  onEditar,
  onDuplicar,
  onCancelar,
  onAviso,
}: DetalheDoTrabalhoProps) {
  const campo = densidade === 'field';
  const participantes = participantesDe(ev);
  const { confirmados, emEspera, visitantes, semAnamnese, vencidas, emDia, comAtencao } =
    resumoDosParticipantes(participantes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 14 : 18 }}>
      <button
        type="button"
        onClick={onVoltar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: 'var(--text-small)',
          color: 'var(--color-royal)',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        <Icon name="arrow-left" size={16} color="var(--color-royal)" />
        Voltar para a agenda
      </button>

      <CabecalhoDoTrabalho trabalho={ev} onEditar={onEditar} onDuplicar={onDuplicar} onCancelar={onCancelar} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(150px,1fr))',
          gap: 12,
        }}
      >
        <Numero destaque rotulo="Confirmados" valor={`${confirmados.length}`} nota={`de ${ev.previstos} previstos`} />
        <Numero destaque rotulo="Visitantes" valor={`${visitantes.length}`} nota="primeira vez ou convidados" />
        <Numero destaque rotulo="Litros previstos" valor={`${ev.litros}`} nota="reserva no estoque" />
        <Numero
          destaque
          rotulo="Contribuição"
          valor={ev.contribuicoes.length ? ev.contribuicoes.map((c) => formatarBRL(reais(c)).replace(',00', '')).join(' · ') : '—'}
          nota={ev.contribuicoes.length > 1 ? 'opções sugeridas' : 'sem contribuição'}
        />
      </div>

      <Bloco titulo="Quem conduz">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          {ev.equipe.map(([funcao, quem]) => (
            <div key={funcao} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Rotulo>{funcao}</Rotulo>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{quem}</span>
            </div>
          ))}
        </div>
      </Bloco>

      <ListaDePreparo
        trabalho={ev}
        feitos={feitos}
        webhookAtivo={webhookAtivo}
        onAlternarTarefa={onAlternarTarefa}
        onAlternarWebhook={onAlternarWebhook}
        onAviso={onAviso}
      />

      <AnamneseDoTrabalho
        semAnamnese={semAnamnese}
        vencidas={vencidas}
        emDia={emDia}
        comAtencao={comAtencao}
        onAviso={onAviso}
      />

      <ListaDeParticipantes
        participantes={participantes}
        confirmados={confirmados}
        emEspera={emEspera}
        visitantes={visitantes}
        onAviso={onAviso}
      />

      <Bloco titulo="Dinheiro da cerimônia">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
          <Numero destaque rotulo="Custo previsto" valor={formatarBRL(reais(ev.previstoGasto))} />
          <Numero destaque rotulo="Custo lançado" valor={formatarBRL(reais(ev.realizadoGasto))} cor="var(--color-attention)" />
          <Numero
            destaque
            rotulo="Contribuições esperadas"
            valor={formatarBRL(
              reais(participantes.filter((p) => p.situacao === 'confirmado').reduce((a, p) => a + p.contribuicao, 0)),
            )}
          />
          <Numero destaque rotulo="Contribuições recebidas" valor={formatarBRL(reais(ev.arrecadado))} cor="var(--color-confirmed)" />
        </div>
        <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          O bloco vem dos lançamentos com esta cerimônia vinculada — o mesmo campo do registro.
        </p>
      </Bloco>

      {ev.observacoes ? (
        <Bloco titulo="Observações">
          <p style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>{ev.observacoes}</p>
        </Bloco>
      ) : null}
    </div>
  );
}
