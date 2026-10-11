import { useMemo, useState } from 'react';
import type { RegistroDeAuditoria } from '@cdd/contracts';
import { FEICAO, TODOS } from '../constantes';
import { trilha } from '../../../mocks/auditoria';
import { dia } from '../../../utils/instante';
import { autoresDaTrilha } from '../utils/autoresDaTrilha';

export function useFiltrosDaTrilha() {
  const [operacao, setOperacao] = useState<string>(TODOS);
  const [autor, setAutor] = useState<string>(TODOS);

  const autores = useMemo(() => autoresDaTrilha(trilha), []);

  const operacoesPresentes = useMemo(
    () => [...new Set(trilha.map((r) => r.operacao))].toSorted((a, b) => FEICAO[a].rotulo.localeCompare(FEICAO[b].rotulo, 'pt-BR')),
    [],
  );

  const filtrada = trilha.filter(
    (r) => (operacao === TODOS || r.operacao === operacao) && (autor === TODOS || r.autorNome === autor),
  );

  const porDia = useMemo(() => {
    const mapa = new Map<string, RegistroDeAuditoria[]>();
    for (const r of filtrada) {
      const chave = dia(r.em);
      const lista = mapa.get(chave);
      if (lista) lista.push(r);
      else mapa.set(chave, [r]);
    }
    return [...mapa.entries()];
  }, [filtrada]);

  return {
    operacao,
    setOperacao,
    autor,
    setAutor,
    autores,
    operacoesPresentes,
    filtrada,
    total: trilha.length,
    porDia,
  };
}
