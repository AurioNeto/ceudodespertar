import type { TipoLancamento } from '@cdd/contracts';
import {
  ActionBar,
  AmountInput,
  AttachmentCapture,
  BottomSheet,
  Button,
  DefaultField,
  DomainError,
  Icon,
  PeriodLock,
  PermissionDenied,
  Receipt,
  ScreenHeader,
  StatusBadge,
  SuggestionChip,
  TextField,
  TwoAxisGuard,
  type ReceiptTone,
  type SheetOption,
} from '../../ds';
import { CampoDeTags, Select, SeletorDeTipo, Interruptor } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { usuarioAtual } from '../../mocks/sessao';
import {
  opcoesDeCategoria,
  opcoesDeCerimonia,
  opcoesDeCompetencia,
  opcoesDeConta,
  opcoesDeContaDestino,
  opcoesDeGrupo,
  opcoesDePagamento,
  opcoesDePessoa,
  opcoesDeUnidade,
} from '../../mocks/opcoes';
import { useFormularioDeLancamento, type CampoComPicker } from './useFormularioDeLancamento';

const TIPOS: readonly { valor: TipoLancamento; label: string }[] = [
  { valor: 'SAIDA', label: 'Saída' },
  { valor: 'ENTRADA', label: 'Entrada' },
  { valor: 'TRANSFERENCIA', label: 'Transferência' },
];

const TOM_DO_RECIBO: Record<TipoLancamento, ReceiptTone> = {
  ENTRADA: 'entrada',
  SAIDA: 'saida',
  TRANSFERENCIA: 'transferencia',
};

const LISTAS: Record<CampoComPicker, { titulo: string; opcoes: readonly SheetOption[] }> = {
  conta: { titulo: 'Conta', opcoes: opcoesDeConta },
  contaDestino: { titulo: 'Conta de destino', opcoes: opcoesDeContaDestino },
  grupo: { titulo: 'Grupo', opcoes: opcoesDeGrupo },
  categoria: { titulo: 'Categoria — pode marcar mais de uma', opcoes: opcoesDeCategoria },
  pagamento: { titulo: 'Forma', opcoes: opcoesDePagamento },
  cerimonia: { titulo: 'Cerimônia vinculada', opcoes: opcoesDeCerimonia },
  competencia: { titulo: 'Competência', opcoes: opcoesDeCompetencia },
  pessoa: { titulo: 'Quem adiantou o dinheiro', opcoes: opcoesDePessoa },
  unidade: { titulo: 'Unidade', opcoes: opcoesDeUnidade },
};

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

/** Tesouraria lança já consolidado; Registro rápido grava como "a conferir". */
const PODE_CONSOLIDAR = usuarioAtual.grupoNome === 'Tesouraria' || usuarioAtual.grupoNome === 'Administrador';

export function RegistrarLancamentoPage() {
  const densidade = useDensidade();
  const f = useFormularioDeLancamento();
  const campo = densidade === 'field';

  if (!PODE_CONSOLIDAR) {
    return (
      <>
        <ScreenHeader code="F-01 · Lançamento" title="Registrar lançamento" density={densidade} />
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
          <PermissionDenied
            screen="Registrar lançamento"
            group={usuarioAtual.grupoNome}
            missing="financeiro.lancamento.registrar"
            whoToAsk="Aurio Neto, administrador da unidade"
          />
          <TwoAxisGuard
            explanation="Quem é do grupo Registro rápido abre esta tela e grava um lançamento — mas grava como A conferir. Lançar já consolidado é operação de tesouraria, e é por isso que o botão não está aqui."
            requirement="Precisa da permissão financeiro.lancamento.confirmar no grupo Tesouraria."
          />
        </div>
      </>
    );
  }

  const pickerAberto = f.picker ? LISTAS[f.picker] : null;

  const escolherNoPicker = (valor: string) => {
    if (f.picker === 'categoria') {
      f.alternarCategoria(valor);
      return;
    }
    if (f.picker) {
      f.alterar(f.picker, valor);
      f.fecharPicker();
    }
  };

  const valorDoPicker =
    f.picker === 'categoria' ? (f.campos.categorias.at(-1) ?? null) : f.picker ? f.campos[f.picker] : null;

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-01' : 'F-01 · Lançamento'}
        title="Registrar lançamento"
        subtitle={
          campo ? undefined : `Tesouraria lança já consolidado · competência ${f.campos.competencia} · CDD`
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Receipt
              title={`Registrado às ${f.recibo.horario}`}
              amount={f.recibo.total}
              tone={TOM_DO_RECIBO[f.recibo.tipo]}
              lines={f.recibo.linhas}
              footnote={
                campo
                  ? 'Campos limpos, pronto para o próximo. Desfazer nos próximos 2 minutos.'
                  : 'Gravado consolidado, com seu nome no histórico. Desfazer só nos próximos 2 minutos; depois disso, estorno.'
              }
            />
            {campo ? null : (
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="quiet" iconName="rotate-ccw" onClick={f.limpar}>
                  Desfazer
                </Button>
                <Button variant="ghost" iconName="receipt-text">
                  Ver lançamento
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {f.competenciaFechada ? (
          <PeriodLock
            period={campo ? '07/2026' : '07/2026 · CDD'}
            reason={
              campo
                ? 'O gasto é de julho e julho foi fechado em 05/08. Guarde como rascunho ou lance em 08/2026 explicando na descrição.'
                : 'A data do gasto cai em julho, e julho foi fechado em 05/08 por Marcia Zubek. Lançar em período fechado mudaria um relatório que já foi assinado.'
            }
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

        <div
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: campo ? 0 : 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {campo ? null : <div style={rotuloLabel}>Comprovante</div>}
          {f.campos.anexo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {campo ? null : (
                <div
                  style={{
                    height: 210,
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: 'var(--bg-sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...rotuloLabel,
                  }}
                >
                  foto do cupom
                </div>
              )}
              <AttachmentCapture
                density={densidade}
                filename={f.campos.anexo}
                onRemove={() => f.alterar('anexo', null)}
              />
            </div>
          ) : (
            <AttachmentCapture
              label="Anexar comprovante"
              density={densidade}
              onCapture={() => f.alterar('anexo', 'IMG_2481.jpg')}
            />
          )}
        </div>

        {f.sugestoesPendentes.length ? (
          <div
            style={{
              background: campo ? 'transparent' : 'var(--color-suggest-soft)',
              border: campo ? 0 : '1px dashed var(--color-suggest-border)',
              borderRadius: 'var(--radius-lg)',
              padding: campo ? 0 : 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {campo ? null : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Icon name="sparkles" size={17} color="var(--color-suggest)" />
                  <span style={{ font: 'var(--text-body-strong)', color: 'var(--color-suggest)' }}>
                    A IA leu o cupom
                  </span>
                </div>
                <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  Nada foi preenchido sozinho. Aceite item por item — o que você aceitar fica com a marca de sugestão no
                  histórico.
                </p>
              </>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              {f.sugestoesPendentes.map((s) => (
                <SuggestionChip
                  key={s.chave}
                  density={densidade}
                  onAccept={() => f.aceitarSugestao(s.chave)}
                  onDismiss={() => f.descartarSugestao(s.chave)}
                >
                  {s.texto}
                </SuggestionChip>
              ))}
            </div>
            {campo ? null : (
              <Button variant="suggest" iconName="check-check" onClick={f.aceitarTodas} fullWidth>
                Aceitar as {f.sugestoesPendentes.length === 1 ? 'restantes' : `${f.sugestoesPendentes.length}`}
              </Button>
            )}
          </div>
        ) : null}

        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />

        {campo ? (
          <>
            <div style={rotuloLabel}>Preenchido por padrão — toque para trocar</div>
            <DefaultField
              label="Competência"
              value={f.campos.competencia}
              origin={f.competenciaFechada ? 'da data do gasto' : 'mês corrente'}
              onEdit={() => f.abrirPicker('competencia')}
            />
            <DefaultField
              label={f.labelConta}
              value={f.conta}
              origin="mais usada"
              onEdit={() => f.abrirPicker('conta')}
            />
            {f.ehTransferencia ? (
              <DefaultField
                label="Conta de destino"
                value={f.contaDestino}
                origin="para onde vai"
                onEdit={() => f.abrirPicker('contaDestino')}
              />
            ) : null}
            {f.temGrupo ? (
              <DefaultField
                label="Grupo"
                value={f.campos.grupo}
                origin="último lançamento"
                onEdit={() => f.abrirPicker('grupo')}
              />
            ) : null}
            {f.temCategoria ? (
              <DefaultField
                label="Categoria"
                value={f.semCategoria ? '— escolher —' : f.campos.categorias.join(', ')}
                origin={f.semCategoria ? 'em branco' : 'você escolheu'}
                onEdit={() => f.abrirPicker('categoria')}
              />
            ) : null}
            <DefaultField
              label={f.labelPagamento}
              value={f.campos.pagamento}
              origin="padrão da conta"
              onEdit={() => f.abrirPicker('pagamento')}
            />
            {f.temCerimonia ? (
              <DefaultField
                label="Cerimônia vinculada"
                value={f.campos.cerimonia}
                origin={f.campos.cerimonia.startsWith('Nenhuma') ? 'sem vínculo' : 'você escolheu'}
                onEdit={() => f.abrirPicker('cerimonia')}
              />
            ) : null}
            {f.campos.reembolso ? (
              <DefaultField
                label="Reembolso a"
                value={f.campos.pessoa}
                origin="conta a pagar"
                onEdit={() => f.abrirPicker('pessoa')}
              />
            ) : null}
          </>
        ) : (
          <>
            <div style={rotuloLabel}>Classificação</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
              {f.temGrupo ? (
                <Select
                  label="Grupo"
                  value={f.campos.grupo}
                  options={opcoesDeGrupo}
                  onChange={(v) => f.alterar('grupo', v)}
                  hint={f.notaGrupo}
                />
              ) : null}
              <Select
                label={f.labelConta}
                value={f.campos.conta}
                options={opcoesDeConta}
                onChange={(v) => f.alterar('conta', v)}
                hint={f.notaConta}
              />
              {f.ehTransferencia ? (
                <Select
                  label="Conta de destino"
                  value={f.campos.contaDestino}
                  options={opcoesDeContaDestino}
                  onChange={(v) => f.alterar('contaDestino', v)}
                  hint={f.notaContaDestino}
                  erro={f.mesmaConta}
                />
              ) : null}
            </div>

            {f.mesmaConta ? (
              <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
                Origem e destino são a mesma conta — a transferência não muda saldo nenhum.
              </span>
            ) : null}

            {f.temCategoria ? (
              <CampoDeTags
                label="Categoria — pode ter mais de uma"
                escolhidas={f.campos.categorias}
                disponiveis={opcoesDeCategoria}
                onAdicionar={f.alternarCategoria}
                onRemover={f.alternarCategoria}
              />
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
              <Select
                label={f.labelPagamento}
                value={f.campos.pagamento}
                options={opcoesDePagamento}
                onChange={(v) => f.alterar('pagamento', v)}
              />
              {f.temCerimonia ? (
                <Select
                  label="Cerimônia vinculada"
                  value={f.campos.cerimonia}
                  options={opcoesDeCerimonia}
                  onChange={(v) => f.alterar('cerimonia', v)}
                />
              ) : null}
              <Select
                label="Competência"
                value={f.campos.competencia}
                options={opcoesDeCompetencia}
                onChange={(v) => f.alterar('competencia', v)}
                hint={f.notaCompetencia}
              />
              <Select
                label="Unidade"
                value={f.campos.unidade}
                options={opcoesDeUnidade}
                onChange={(v) => f.alterar('unidade', v)}
              />
            </div>

            {f.semCategoria ? (
              <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
                Sem categoria o gasto entra em Relatórios como “não classificado”. Dá para gravar assim — vira pendência
                sua, não da conferência.
              </span>
            ) : null}

            {f.temReembolso ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'var(--bg-card)',
                  border: 'var(--border-hairline)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 14px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                    Reembolso a uma pessoa
                  </div>
                  <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    {f.campos.reembolso
                      ? `Vira conta a pagar para ${f.campos.pessoa} — sai do saldo só quando for paga.`
                      : 'Alguém do corpo adiantou do próprio bolso?'}
                  </div>
                </div>
                <Interruptor
                  ligado={f.campos.reembolso}
                  onAlternar={() => f.alterar('reembolso', !f.campos.reembolso)}
                  rotuloAcessivel="Reembolso a uma pessoa"
                />
              </div>
            ) : null}

            {f.campos.reembolso ? (
              <DefaultField
                label="Quem adiantou o dinheiro"
                value={f.campos.pessoa}
                origin="vira conta a pagar"
                density="office"
                onEdit={() => f.abrirPicker('pessoa')}
              />
            ) : null}
          </>
        )}

        {f.composto ? (
          <DomainError
            rule="Um lançamento consolidado tem um valor só"
            explanation={
              campo
                ? 'Uma soma no valor são duas compras no mesmo cupom. Separe em dois lançamentos ou grave o total explicando na descrição.'
                : 'Uma soma no valor são duas compras no mesmo cupom. Consolidado, o valor precisa ser um — a tesouraria separa antes de gravar, senão o relatório por categoria mistura extintor com suporte.'
            }
            way={
              campo
                ? undefined
                : 'Separe em dois lançamentos, ou grave o total com a explicação na descrição e classifique como manutenção.'
            }
          />
        ) : null}

        {campo ? (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <StatusBadge tone="confirmed">Grava consolidado</StatusBadge>
          </div>
        ) : null}
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
