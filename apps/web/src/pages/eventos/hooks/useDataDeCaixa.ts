import { useState } from 'react';
import { MENSAGEM_DE_DATA_INVALIDA } from '../constantes';
import { lerDataDigitada } from '../utils/lerDataDigitada';

export function useDataDeCaixa(hoje: string, idDoCampo: string) {
  const [data, setData] = useState(hoje);
  const [tentouConfirmar, setTentouConfirmar] = useState(false);

  const dataValida = lerDataDigitada(data) !== null;
  const erro = tentouConfirmar && !dataValida ? MENSAGEM_DE_DATA_INVALIDA : undefined;

  const recomecar = () => {
    setData(hoje);
    setTentouConfirmar(false);
  };

  const exigirValida = () => {
    if (dataValida) return true;
    setTentouConfirmar(true);
    document.getElementById(idDoCampo)?.focus();
    return false;
  };

  return { data, setData, erro, recomecar, exigirValida };
}
