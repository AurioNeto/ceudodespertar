import { useState } from 'react';
import { MENSAGEM_DE_DATA_INVALIDA } from '../constantes';
import { formatarDataDigitada, lerDataDigitada } from '../utils/lerDataDigitada';

export function useDataDeCaixa(hoje: string, idDoCampo: string) {
  const [data, setData] = useState(hoje);
  const [tentouConfirmar, setTentouConfirmar] = useState(false);

  const lida = lerDataDigitada(data);
  const erro = tentouConfirmar && lida === null ? MENSAGEM_DE_DATA_INVALIDA : undefined;

  const recomecar = () => {
    setData(hoje);
    setTentouConfirmar(false);
  };

  const exigirValida = () => {
    if (lida) return formatarDataDigitada(lida);
    setTentouConfirmar(true);
    document.getElementById(idDoCampo)?.focus();
    return null;
  };

  return { data, setData, erro, recomecar, exigirValida };
}
