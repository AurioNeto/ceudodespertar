import { useState } from 'react';
import type { Dormitorio, Leito } from '@cdd/contracts';

export interface OpcoesDoCadastro {
  dormitorios: readonly Dormitorio[];
  onMudar: (d: readonly Dormitorio[]) => void;
  onRecado: (r: string | null) => void;
}

const capacidadeDoTipo = (tipo: Leito['tipo']): number => (tipo === 'CAMA_CASAL' ? 2 : 1);

export function useCadastro({ dormitorios, onMudar, onRecado }: OpcoesDoCadastro) {
  const [novoEm, setNovoEm] = useState<string | null>(null);
  const [identificacao, setIdentificacao] = useState('');
  const [tipo, setTipo] = useState<Leito['tipo']>('BELICHE_INFERIOR');

  const alternarAtivo = (dormitorioId: string, leitoId: string) => {
    onMudar(
      dormitorios.map((d) =>
        (d.id as string) === dormitorioId
          ? { ...d, leitos: d.leitos.map((l) => ((l.id as string) === leitoId ? { ...l, ativo: !l.ativo } : l)) }
          : d,
      ),
    );
    onRecado(null);
  };

  const acrescentar = (d: Dormitorio) => {
    if (!identificacao.trim()) return;
    const novo: Leito = {
      id: `l-novo-${Date.now()}` as Leito['id'],
      identificacao: identificacao.trim(),
      tipo,
      capacidade: capacidadeDoTipo(tipo),
      ativo: true,
    };
    onMudar(dormitorios.map((x) => (x.id === d.id ? { ...x, leitos: [...x.leitos, novo] } : x)));
    setNovoEm(null);
    setIdentificacao('');
    onRecado(`${novo.identificacao} acrescentado ao ${d.nome.toLowerCase()}. Já aparece no mapa do próximo evento.`);
  };

  const abrirNovoEm = (dormitorioId: string) => {
    setNovoEm(dormitorioId);
    setIdentificacao('');
    onRecado(null);
  };

  const cancelarNovo = () => setNovoEm(null);

  return { novoEm, identificacao, setIdentificacao, tipo, setTipo, alternarAtivo, acrescentar, abrirNovoEm, cancelarNovo };
}
