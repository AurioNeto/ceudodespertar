import { DefaultField, rotuloCaixaAlta } from '@/ds';
import { INICIAL } from '../../mocks/formularioInicial';
import type { FormularioDeLancamento } from '../../tipos';
import { FolhaDeTexto } from '../FolhaDeTexto';

export interface ClassificacaoEmCampoProps {
  formulario: FormularioDeLancamento;
}

export function ClassificacaoEmCampo({ formulario: f }: ClassificacaoEmCampoProps) {
  return (
    <>
      <div style={rotuloCaixaAlta}>Preenchido por padrão — toque para trocar</div>
      <DefaultField
        label={f.labelData}
        value={f.campos.data}
        origin={f.campos.data === INICIAL.data ? 'hoje' : 'você escolheu'}
        onEdit={() => f.abrirFolhaDeTexto('data')}
      />
      {f.temContraparte ? (
        <DefaultField
          label={f.labelContraparte}
          value={f.campos.contraparte || '— informar —'}
          origin={f.campos.contraparte ? 'você escreveu' : 'em branco'}
          onEdit={() => f.abrirFolhaDeTexto('contraparte')}
        />
      ) : null}
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
      <DefaultField
        label="Unidade"
        value={f.campos.unidade}
        origin="último lançamento"
        onEdit={() => f.abrirPicker('unidade')}
      />
      {f.temReembolso ? (
        <DefaultField
          label="Reembolso a"
          value={f.reembolsoA}
          origin={f.campos.reembolso ? 'conta a pagar' : 'sem reembolso'}
          onEdit={() => f.abrirPicker('reembolso')}
        />
      ) : null}
      {f.folhaDeTexto === 'data' ? (
        <FolhaDeTexto
          titulo={f.labelData}
          valor={f.campos.data}
          aoMudar={(valor) => f.alterar('data', valor)}
          aoFechar={f.fecharFolhaDeTexto}
        />
      ) : null}
      {f.folhaDeTexto === 'contraparte' ? (
        <FolhaDeTexto
          titulo={f.labelContraparte}
          valor={f.campos.contraparte}
          placeholder={f.placeholderContraparte}
          aoMudar={(valor) => f.alterar('contraparte', valor)}
          aoFechar={f.fecharFolhaDeTexto}
        />
      ) : null}
    </>
  );
}
