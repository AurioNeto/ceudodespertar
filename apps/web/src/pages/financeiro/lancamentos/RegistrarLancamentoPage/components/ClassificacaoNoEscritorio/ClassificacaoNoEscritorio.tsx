import { Select } from '@/ds';
import { rotuloLabel } from '../../constantes';
import {
  opcoesDeCategoria,
  opcoesDeCerimonia,
  opcoesDeCompetencia,
  opcoesDeConta,
  opcoesDeContaDestino,
  opcoesDeGrupo,
  opcoesDePagamento,
  opcoesDeUnidade,
} from '../../mocks/opcoes';
import type { FormularioDeLancamento } from '../../tipos';
import { CampoDeTags } from '../CampoDeTags';
import { Reembolso } from './components/Reembolso';

export interface ClassificacaoNoEscritorioProps {
  formulario: FormularioDeLancamento;
}

export function ClassificacaoNoEscritorio({ formulario: f }: ClassificacaoNoEscritorioProps) {
  return (
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

      <Reembolso formulario={f} />
    </>
  );
}
