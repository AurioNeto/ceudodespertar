import { useMemo, useState } from 'react';
import type { Hospedagem, NivelDeContribuicao, Refeicao } from '@cdd/contracts';
import { eventoDoLink } from '../../mocks/linkDaCerimonia';
import { NOVO_VAZIO } from '../constantes';
import { cadastros, formularioInteiro, type CadastroEncontrado } from '../mocks/inscricaoPublica';
import type { Novo, Passo } from '../tipos';
import { mascararCpf, soDigitos } from '../utils/cpf';
import { disparaAlerta, respondida } from '../utils/regraDeAlerta';

export function useInscricaoPublica() {
  const [passo, setPasso] = useState<Passo>('IDENTIFICACAO');
  const [cpf, setCpf] = useState('');
  const [erroCpf, setErroCpf] = useState<string | undefined>();
  const [cadastro, setCadastro] = useState<CadastroEncontrado | null>(null);
  const [novo, setNovo] = useState<Novo>(NOVO_VAZIO);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [declarado, setDeclarado] = useState(false);
  /** A pessoa pediu para refazer a anamnese estando no prazo. */
  const [refazendo, setRefazendo] = useState(false);

  const [nivel, setNivel] = useState<NivelDeContribuicao | null>(null);
  const [valor, setValor] = useState('');
  const [hospedagem, setHospedagem] = useState<Hospedagem>('SEM_HOSPEDAGEM');
  const [dias, setDias] = useState(1);
  const [refeicoes, setRefeicoes] = useState<readonly Refeicao[]>([]);
  const [emergencia, setEmergencia] = useState('');
  const [restricoes, setRestricoes] = useState('');

  /** Quem é a pessoa, venha do cadastro achado ou do que ela acabou de digitar. */
  const nome = cadastro?.nome ?? novo.nome;
  const primeiroNome = (cadastro?.primeiroNome ?? novo.nome.trim().split(/\s+/)[0]) || 'você';
  const pendentes = refazendo
    ? formularioInteiro('POR_ESCOLHA')
    : cadastro
      ? cadastro.pendentes
      : formularioInteiro('PRIMEIRA_VEZ');
  const modo = cadastro?.modo ?? 'PRIMEIRA_VEZ';
  const jaParticipou = cadastro?.jaParticipou ?? false;

  const identificar = () => {
    const d = soDigitos(cpf);
    if (d.length !== 11) {
      setErroCpf('O CPF tem 11 números.');
      return;
    }
    setErroCpf(undefined);
    const achado = cadastros.find((c) => soDigitos(c.cpf) === d) ?? null;
    setCadastro(achado);
    if (achado) {
      setEmergencia(achado.contatoEmergencia ?? '');
      setRestricoes(achado.restricoes ?? '');
      setPasso(achado.modo === 'EM_DIA' ? 'DECLARACAO' : 'ANAMNESE');
    } else {
      setNovo(NOVO_VAZIO);
      setPasso('CADASTRO');
    }
  };

  const faltandoNoCadastro = [
    !novo.nome.trim() && 'nome completo',
    !novo.nascimento.trim() && 'data de nascimento',
    !novo.telefone.trim() && 'telefone',
  ].filter((x): x is string => Boolean(x));

  const faltandoNaAnamnese = pendentes.filter(
    (x) => x.pergunta.obrigatoria && !respondida(valores[x.pergunta.id as string]),
  );

  const pontos = useMemo(
    () =>
      pendentes
        .map((x) => disparaAlerta(x.pergunta, valores[x.pergunta.id as string]))
        .filter((m): m is string => m !== null),
    [pendentes, valores],
  );

  const opcaoHosp = eventoDoLink.hospedagens.find((h) => h.tipo === hospedagem)!;
  const contribuicao = Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const custoHospedagem = opcaoHosp.valorDiaria * dias;
  const custoRefeicoes = refeicoes.reduce(
    (s, r) => s + (eventoDoLink.refeicoes.find((x) => x.refeicao === r)?.valor ?? 0),
    0,
  );
  const total = contribuicao + custoHospedagem + custoRefeicoes;
  const semValor = valor.trim() === '';

  const faltandoNaParticipacao = [
    !emergencia.trim() && 'contato de emergência',
    !restricoes.trim() && 'restrições alimentares',
  ].filter((x): x is string => Boolean(x));

  const digitarCpf = (v: string) => {
    setCpf(mascararCpf(v));
    setErroCpf(undefined);
  };

  const seguirParaAnamnese = () => setPasso('ANAMNESE');

  const responder = (id: string, v: string) => setValores((r) => ({ ...r, [id]: v }));

  const seguirParaDeclaracao = () => setPasso('DECLARACAO');

  const alternarDeclarado = () => setDeclarado((d) => !d);

  const refazer = () => {
    setRefazendo(true);
    setValores({});
    setDeclarado(false);
    setPasso('ANAMNESE');
  };

  const seguirParaParticipacao = () => setPasso('PARTICIPACAO');

  const escolherNivel = (n: NivelDeContribuicao, v: string) => {
    setNivel(n);
    setValor(v);
  };

  const digitarValor = (v: string) => {
    setValor(v);
    setNivel(null);
  };

  const enviar = () => setPasso('PRONTO');

  return {
    passo,
    cpf,
    erroCpf,
    cadastro,
    novo,
    valores,
    declarado,
    refazendo,
    nivel,
    valor,
    hospedagem,
    dias,
    refeicoes,
    emergencia,
    restricoes,
    nome,
    primeiroNome,
    pendentes,
    modo,
    jaParticipou,
    faltandoNoCadastro,
    faltandoNaAnamnese,
    pontos,
    contribuicao,
    custoHospedagem,
    custoRefeicoes,
    total,
    semValor,
    faltandoNaParticipacao,
    identificar,
    digitarCpf,
    preencherNovo: setNovo,
    seguirParaAnamnese,
    responder,
    seguirParaDeclaracao,
    alternarDeclarado,
    refazer,
    seguirParaParticipacao,
    escolherNivel,
    digitarValor,
    escolherHospedagem: setHospedagem,
    escolherDias: setDias,
    escolherRefeicoes: setRefeicoes,
    digitarEmergencia: setEmergencia,
    digitarRestricoes: setRestricoes,
    enviar,
  };
}
