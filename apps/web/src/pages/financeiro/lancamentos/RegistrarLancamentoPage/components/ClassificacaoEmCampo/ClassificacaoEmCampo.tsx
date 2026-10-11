import { DefaultField } from '@/ds';
import { rotuloLabel } from '../../constantes';
import type { FormularioDeLancamento } from '../../tipos';

export interface ClassificacaoEmCampoProps {
  formulario: FormularioDeLancamento;
}

export function ClassificacaoEmCampo({ formulario: f }: ClassificacaoEmCampoProps) {
  return (
    <>
      <div style={rotuloLabel}>Preenchido por padrão — toque para trocar</div>
      <DefaultField
        label="Competência"
        value={f.campos.competencia}
        origin={f.competenciaFechada ? 'da data do gasto' : 'mês corrente'}
        onEdit={() => f.abrirPicker('competencia')}
      />
      <DefaultField label={f.labelConta} value={f.conta} origin="mais usada" onEdit={() => f.abrirPicker('conta')} />
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
  );
}
