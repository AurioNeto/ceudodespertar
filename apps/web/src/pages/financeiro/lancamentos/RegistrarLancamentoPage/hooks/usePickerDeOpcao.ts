import { LISTAS } from '../constantes';
import type { FormularioDeLancamento } from '../tipos';

export function usePickerDeOpcao(f: FormularioDeLancamento) {
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

  return { pickerAberto, valorDoPicker, escolherNoPicker };
}
