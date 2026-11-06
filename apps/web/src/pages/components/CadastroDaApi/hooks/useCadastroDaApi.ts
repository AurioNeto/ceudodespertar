import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClienteHttp } from '@/app/providers';
import { useSessao } from '@/app/sessao';
import { ErroDaApi } from '@/dados';
import { comandosDoCadastro } from '../comandos';
import { useItensDoCadastro, usePaginasDoCadastro } from '../consultas';
import type { CampoDoCadastro, DefinicaoDoCadastro, RegistroDoCadastro } from '../tipos';

export function paraCampo(valor: unknown, campo: CampoDoCadastro): string {
  if (valor == null) return '';
  if (campo.formato === 'moeda' && typeof valor === 'number') return (valor / 100).toFixed(2).replace('.', ',');
  if (Array.isArray(valor)) return valor.toSorted().join(',');
  return String(valor);
}

function paraComando(valor: string, campo: CampoDoCadastro): unknown {
  if (campo.formato === 'booleano') return valor === 'true';
  if (campo.formato === 'lista') return valor.split(',').map(item => item.trim()).filter(Boolean);
  if (campo.formato === 'moeda') {
    const limpo = valor.trim();
    if (!limpo) return null;
    return /^\d+(?:[,.]\d{1,2})?$/.test(limpo) ? Math.round(Number(limpo.replace(',', '.')) * 100) : Number.NaN;
  }
  return campo.opcional && valor.trim() === '' ? null : valor;
}

const mensagensDaApi = {
  VERSAO_DESATUALIZADA: 'Este cadastro mudou. Feche o formulário e abra o registro atualizado.',
  CODIGO_DE_SISTEMA_JA_EXISTE: 'Esse código de sistema já está cadastrado.',
  IDENTIFICADOR_BANCARIO_JA_CADASTRADO: 'Esse identificador bancário já está em uso.',
  DOCUMENTO_JA_CADASTRADO: 'Já existe uma pessoa com esse documento.',
  CADASTRO_INATIVO: 'Um dos cadastros vinculados está inativo. Confira os vínculos.',
  CONTA_COM_SALDO: 'A conta ainda tem saldo e não pode ser desativada.',
  REGIME_COM_LANCAMENTO_NO_PERIODO: 'O regime tem lançamentos no período e não pode ser alterado.',
  SEM_PERMISSAO: 'Seu acesso não permite salvar este cadastro.',
} as const satisfies Partial<Record<ErroDaApi['codigo'], string>>;

function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroDaApi) {
    const mensagem = Object.getOwnPropertyDescriptor(mensagensDaApi, erro.codigo)?.value;
    if (typeof mensagem === 'string') return mensagem;
  }
  return 'Não foi possível salvar. Confira os dados e tente novamente.';
}

export function useCadastroDaApi(definicao: DefinicaoDoCadastro) {
  const { pode } = useSessao();
  const [busca, setBusca] = useState('');
  const [editor, setEditor] = useState<{ registro: RegistroDoCadastro | null; valores: Record<string, string> } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const lista = useItensDoCadastro<RegistroDoCadastro>(definicao.caminho, !definicao.paginado);
  const paginas = usePaginasDoCadastro(definicao.caminho, busca, Boolean(definicao.paginado));
  const tentativa = useRef<{ corpo: string; chave: string } | null>(null);
  const cliente = useQueryClient();
  const comandos = comandosDoCadastro(useClienteHttp(), definicao.caminho);
  const mutacao = useMutation({
    mutationFn: ({ registro, dados, chave }: { registro: RegistroDoCadastro | null; dados: unknown; chave: string }) =>
      registro ? comandos.editar({ id: registro.id, versao: registro.versao, dados })
        : comandos.criar(dados, { chaveDeIdempotencia: chave }),
    onSuccess: async () => {
      setEditor(null);
      await cliente.invalidateQueries({ queryKey: ['cadastros', definicao.caminho] });
      await cliente.invalidateQueries({ queryKey: ['saldos'] });
    },
    onError: falha => {
      setErro(mensagemDoErro(falha));
      if (falha instanceof ErroDaApi && falha.codigo === 'VERSAO_DESATUALIZADA') {
        void cliente.invalidateQueries({ queryKey: ['cadastros', definicao.caminho] });
      }
    },
  });
  const campos = editor ? definicao.campos.filter(campo =>
    (!editor.registro || !campo.soNaCriacao) && (campo.visivel?.(editor.valores) ?? true)) : [];

  function abrir(registro: RegistroDoCadastro | null) {
    tentativa.current = null;
    setErro(null);
    setEditor({ registro, valores: Object.fromEntries(definicao.campos.map(campo => [
      campo.nome,
      registro ? paraCampo(Object.getOwnPropertyDescriptor(registro, campo.nome)?.value, campo) : campo.inicial ?? '',
    ])) });
  }

  function salvar() {
    if (!editor || mutacao.isPending || !pode(editor.registro ? definicao.permissaoDeEditar : definicao.permissaoDeCriar)) return;
    const entrada = Object.fromEntries(campos.map(campo => [campo.nome, paraComando(editor.valores[campo.nome] ?? '', campo)]));
    const resultado = (editor.registro ? definicao.editar : definicao.criar).safeParse(entrada);
    if (!resultado.success) {
      const primeiro = resultado.error.issues[0];
      const campo = campos.find(item => item.nome === primeiro?.path[0]);
      setErro(campo ? `Confira o campo “${campo.rotulo}”.` : 'Confira os dados informados.');
      return;
    }
    setErro(null);
    const corpo = JSON.stringify(resultado.data);
    if (tentativa.current?.corpo !== corpo) tentativa.current = { corpo, chave: crypto.randomUUID() };
    mutacao.mutate({ registro: editor.registro, dados: resultado.data, chave: tentativa.current.chave });
  }

  const consulta = definicao.paginado ? paginas : lista;
  return {
    busca, setBusca, editor, erro, campos, abrir, salvar, fechandoBloqueado: mutacao.isPending,
    fechar: () => { if (!mutacao.isPending) setEditor(null); },
    mudar: (nome: string, valor: string) => setEditor(atual =>
      atual ? { ...atual, valores: { ...atual.valores, [nome]: valor } } : atual),
    itens: definicao.paginado ? paginas.data?.pages.flatMap(pagina => pagina.itens) ?? [] : lista.data?.itens ?? [],
    consulta, paginas,
    podeCriar: pode(definicao.permissaoDeCriar), podeEditar: pode(definicao.permissaoDeEditar),
  };
}
