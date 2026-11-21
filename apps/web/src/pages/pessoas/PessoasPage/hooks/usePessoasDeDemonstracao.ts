import { useState } from 'react';
import {
  acessosIniciais,
  gruposIniciais,
  pessoasIniciais,
  type AcessoAoSistema,
  type PessoaDaCasa,
} from '../mocks/pessoas';
import { emailDoConvite } from '../utils/emailDoConvite';
import { filtrarPessoas } from '../utils/filtrarPessoas';
import { resumirPessoas } from '../utils/resumirPessoas';

export function usePessoasDeDemonstracao() {
  const [pessoas, setPessoas] = useState<readonly PessoaDaCasa[]>(pessoasIniciais);
  const [acessos, setAcessos] = useState<Record<number, AcessoAoSistema>>({ ...acessosIniciais });
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [fichaId, setFichaId] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const ficha = pessoas.find((p) => p.id === fichaId) ?? null;

  const listadas = filtrarPessoas(pessoas, filtro, busca);

  const resumo = resumirPessoas(pessoas, acessos);

  const fecharFicha = () => setFichaId(null);

  const fecharMensagem = () => setMensagem(null);

  const inativar = () => {
    if (!ficha) return;
    setPessoas((lista) => lista.map((p) => (p.id === ficha.id ? { ...p, ativa: !p.ativa } : p)));
    setMensagem(
      ficha.ativa
        ? 'Cadastro inativado. Nada é apagado — presenças e anamneses continuam no histórico.'
        : 'Cadastro reativado.',
    );
  };

  const mudarGrupo = (grupo: string) => {
    if (!ficha) return;
    setAcessos((a) => ({ ...a, [ficha.id]: { ...a[ficha.id]!, grupo } }));
    setMensagem('Grupo de permissão atualizado.');
  };

  const conceder = () => {
    if (!ficha) return;
    setAcessos((a) => ({
      ...a,
      [ficha.id]: {
        email: emailDoConvite(ficha.nome),
        grupo: 'Leitura',
        situacao: 'convite',
        ultimoAcesso: 'nunca entrou',
      },
    }));
    setMensagem('Convite enviado. O acesso nasce no grupo Leitura.');
  };

  const revogar = () => {
    if (!ficha) return;
    setAcessos((a) => {
      const copia = { ...a };
      delete copia[ficha.id];
      return copia;
    });
    setMensagem('Acesso revogado. O histórico do que essa pessoa lançou continua intacto.');
  };

  return {
    pessoas,
    acessos,
    grupos: gruposIniciais,
    busca,
    filtro,
    ficha,
    mensagem,
    listadas,
    resumo,
    setBusca,
    setFiltro,
    setFichaId,
    setMensagem,
    fecharFicha,
    fecharMensagem,
    inativar,
    mudarGrupo,
    conceder,
    revogar,
  };
}
