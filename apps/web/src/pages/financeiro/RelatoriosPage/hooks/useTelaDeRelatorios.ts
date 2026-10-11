import { useState } from 'react';
import type { Drill } from '../tipos';
import { kpisDoRelatorio, linhasDoDrill, resumoDoRecorte, totalDoDrill } from '../utils/recorte';
import { useRelatorio } from './useRelatorio';

export function useTelaDeRelatorios() {
  const relatorio = useRelatorio();
  const [drill, setDrill] = useState<Drill | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const abrirDrill = (d: Drill) => setDrill(d);

  const fecharDrill = () => setDrill(null);

  const avisar = (texto: string) => setMensagem(texto);

  const fecharAviso = () => setMensagem(null);

  const linhas = linhasDoDrill(relatorio.atual, drill);

  return {
    relatorio,
    resumoDoRecorte: resumoDoRecorte(relatorio),
    kpis: kpisDoRelatorio(relatorio),
    drill,
    abrirDrill,
    fecharDrill,
    linhasDoDrill: linhas,
    totalDoDrill: totalDoDrill(linhas),
    mensagem,
    avisar,
    fecharAviso,
  };
}
