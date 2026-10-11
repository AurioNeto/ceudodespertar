import { useState } from 'react';
import { versoesIniciais, type PerguntaDoFormulario, type VersaoDoFormulario } from '../mocks/anamnese';
import type { RascunhoDePergunta } from '../tipos';
import { descerPergunta, novoRascunho, publicarVersao, subirPergunta, temRascunhoAberto } from '../utils/versoes';

export function useVersoesDoFormulario() {
  const [versoes, setVersoes] = useState<readonly VersaoDoFormulario[]>(versoesIniciais);
  const [selecionada, setSelecionada] = useState('v3');
  const [validade, setValidade] = useState('12');
  const [exigir, setExigir] = useState(true);
  const [novaPergunta, setNovaPergunta] = useState<RascunhoDePergunta | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const versao = versoes.find((v) => v.id === selecionada) ?? versoes[0]!;
  const publicada = versoes.find((v) => v.situacao === 'publicada');
  const ehRascunho = versao.situacao === 'rascunho';

  const mexerNasPerguntas = (fn: (lista: PerguntaDoFormulario[]) => PerguntaDoFormulario[]) =>
    setVersoes((lista) =>
      lista.map((v) => (v.id === versao.id ? { ...v, perguntas: fn(v.perguntas.map((p) => ({ ...p }))) } : v)),
    );

  const publicar = () => {
    setVersoes((lista) => publicarVersao(lista, versao.id));
    setMensagem(
      `${versao.rotulo} publicada. A versão anterior foi arquivada, e as respostas dadas nela continuam presas a ela.`,
    );
  };

  const criarRascunho = () => {
    if (temRascunhoAberto(versoes)) {
      setMensagem('Já existe um rascunho aberto. Publique ou descarte antes de criar outro.');
      return;
    }
    const nova = novoRascunho(versoes, versao);
    setVersoes((lista) => [nova, ...lista]);
    setSelecionada(nova.id);
    setMensagem('Rascunho criado. Editar aqui não muda o formulário que está no ar.');
  };

  const copiarLink = () =>
    setMensagem(`Link público copiado: cdd.app/anamnese/${versao.id} — quem responde não precisa de conta.`);

  const fecharMensagem = () => setMensagem(null);

  const subir = (i: number) => mexerNasPerguntas((lista) => subirPergunta(lista, i));

  const descer = (i: number) => mexerNasPerguntas((lista) => descerPergunta(lista, i));

  const remover = (i: number) => mexerNasPerguntas((lista) => lista.filter((_, j) => j !== i));

  const abrirNovaPergunta = () => setNovaPergunta({ titulo: '', tipo: 'Sim ou não', alerta: '', obrigatoria: true });

  const adicionarPergunta = () => {
    if (!novaPergunta) return;
    mexerNasPerguntas((lista) => [
      ...lista,
      {
        titulo: novaPergunta.titulo.trim(),
        tipo: novaPergunta.tipo,
        obrigatoria: novaPergunta.obrigatoria,
        alerta: novaPergunta.alerta.trim() || null,
      },
    ]);
    setNovaPergunta(null);
  };

  const cancelarNovaPergunta = () => setNovaPergunta(null);

  const alternarExigir = () => setExigir((e) => !e);

  return {
    versoes,
    versao,
    publicada,
    ehRascunho,
    validade,
    exigir,
    novaPergunta,
    mensagem,
    setSelecionada,
    setValidade,
    setNovaPergunta,
    publicar,
    criarRascunho,
    copiarLink,
    fecharMensagem,
    subir,
    descer,
    remover,
    abrirNovaPergunta,
    adicionarPergunta,
    cancelarNovaPergunta,
    alternarExigir,
  };
}
