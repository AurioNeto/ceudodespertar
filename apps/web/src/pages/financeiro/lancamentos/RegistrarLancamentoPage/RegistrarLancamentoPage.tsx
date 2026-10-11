import {
  ActionBar,
  AmountInput,
  BottomSheet,
  Button,
  PeriodLock,
  ScreenHeader,
  TextField,
  useDensidade,
  SeletorDeTipo,
} from '@/ds';
import { useSessao } from '@/app/sessao';
import { AvisosDoRegistro } from './components/AvisosDoRegistro';
import { ClassificacaoEmCampo } from './components/ClassificacaoEmCampo';
import { ClassificacaoNoEscritorio } from './components/ClassificacaoNoEscritorio';
import { ComprovanteDoLancamento } from './components/ComprovanteDoLancamento';
import { ReciboDoRegistro } from './components/ReciboDoRegistro';
import { SugestoesDoCupom } from './components/SugestoesDoCupom';
import { TEXTOS_DA_SOMA, TIPOS, rotuloLabel } from './constantes';
import { useFormularioDeLancamento } from './hooks/useFormularioDeLancamento';
import { usePickerDeOpcao } from './hooks/usePickerDeOpcao';

export function RegistrarLancamentoPage() {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const consolida = pode('financeiro.lancamento.confirmar');
  const f = useFormularioDeLancamento(consolida);
  const { pickerAberto, valorDoPicker, escolherNoPicker } = usePickerDeOpcao(f);
  const campo = densidade === 'field';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-01' : 'F-01 · Lançamento'}
        title="Registrar lançamento"
        subtitle={
          campo
            ? undefined
            : consolida
              ? `Tesouraria lança já consolidado · competência ${f.campos.competencia} · CDD`
              : `Grava como a conferir · competência ${f.campos.competencia} · CDD`
        }
        density={densidade}
      />

      <div
        style={{
          flex: 1,
          padding: campo ? '14px 16px 18px' : '20px 24px 24px',
          maxWidth: campo ? undefined : 860,
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          minWidth: 0,
        }}
      >
        {f.recibo ? (
          <ReciboDoRegistro recibo={f.recibo} consolida={consolida} densidade={densidade} onDesfazer={f.limpar} />
        ) : null}

        {f.competenciaFechada ? (
          <PeriodLock
            title={`Período ${campo ? '07/2026' : '07/2026 · CDD'} está fechado`}
            reason={
              campo
                ? 'O gasto é de julho e julho foi fechado em 05/08. Guarde como rascunho ou lance em 08/2026 explicando na descrição.'
                : 'A data do gasto cai em julho, e julho foi fechado em 05/08 por Marcia Zubek. Lançar em período fechado mudaria um relatório que já foi assinado.'
            }
            reopenDeniedNote="Reabrir exige um administrador, e o motivo fica registrado de forma permanente."
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {campo ? null : <span style={rotuloLabel}>Tipo de lançamento</span>}
          <SeletorDeTipo opcoes={TIPOS} valor={f.tipo} onEscolher={f.trocarTipo} densidade={densidade} />
          {campo ? null : (
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{f.notaTipo}</span>
          )}
        </div>

        <AmountInput
          label={f.labelValor}
          {...TEXTOS_DA_SOMA}
          value={f.campos.valor}
          onChange={(v) => f.alterar('valor', v)}
          hint="Escreva como você fala. Soma vale: 65+70."
        />

        <TextField
          label={f.labelDescricao}
          density={densidade}
          value={f.campos.descricao}
          onChange={(e) => f.alterar('descricao', e.target.value)}
          placeholder={f.placeholderDescricao}
        />

        {campo ? null : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
            <TextField
              label={f.labelData}
              value={f.campos.data}
              onChange={(e) => f.alterar('data', e.target.value)}
              error={f.competenciaFechada ? 'Cai em julho, período fechado.' : undefined}
            />
            {f.temContraparte ? (
              <TextField
                label={f.labelContraparte}
                value={f.campos.contraparte}
                onChange={(e) => f.alterar('contraparte', e.target.value)}
                placeholder={f.placeholderContraparte}
              />
            ) : null}
          </div>
        )}

        <ComprovanteDoLancamento
          anexo={f.campos.anexo}
          densidade={densidade}
          onAlterarAnexo={(anexo) => f.alterar('anexo', anexo)}
        />

        {f.sugestoesPendentes.length ? (
          <SugestoesDoCupom
            sugestoes={f.sugestoesPendentes}
            densidade={densidade}
            onAceitar={f.aceitarSugestao}
            onDescartar={f.descartarSugestao}
            onAceitarTodas={f.aceitarTodas}
          />
        ) : null}

        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />

        {campo ? <ClassificacaoEmCampo formulario={f} /> : <ClassificacaoNoEscritorio formulario={f} />}

        <AvisosDoRegistro
          consolida={consolida}
          temRecibo={f.recibo !== null}
          composto={f.composto}
          densidade={densidade}
        />
      </div>

      <ActionBar note={f.notaBarra}>
        <Button
          density={densidade}
          fullWidth={campo}
          iconName="check"
          disabled={f.bloqueado}
          blockedReason={f.motivoBloqueio}
          onClick={f.registrar}
        >
          Registrar e abrir outro
        </Button>
        {campo ? null : (
          <Button variant="quiet" onClick={f.limpar}>
            Limpar campos
          </Button>
        )}
      </ActionBar>

      {pickerAberto ? (
        <BottomSheet
          open
          title={pickerAberto.titulo}
          options={pickerAberto.opcoes}
          value={valorDoPicker}
          onSelect={escolherNoPicker}
          onClose={f.fecharPicker}
        />
      ) : null}
    </div>
  );
}
