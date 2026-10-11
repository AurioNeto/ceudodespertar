import { useMemo, useState } from 'react';
import type {
  Hospedagem,
  ModalidadeCrianca,
  NivelDeContribuicao,
  Refeicao,
  TipoParticipacao,
} from '@cdd/contracts';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { eventos } from '../../mocks/eventos';
import { CONSAGRA_POR_PADRAO } from '../constantes';
import type { PessoaDoDiretorio } from '../mocks/inscricao';
import type { Pendencia } from '../tipos';
import { pendenciasDaInscricao } from '../utils/pendenciasDaInscricao';

export function useInscricao() {
  const [eventoId, setEventoId] = useState(eventos[0]!.id as string);
  const evento = eventos.find((e) => (e.id as string) === eventoId)!;

  const [busca, setBusca] = useState('');
  const [pessoa, setPessoa] = useState<PessoaDoDiretorio | null>(null);
  const [tipo, setTipo] = useState<TipoParticipacao>('PARTICIPANTE');
  const [consagra, setConsagra] = useState(true);
  const [modalidade, setModalidade] = useState<ModalidadeCrianca>('PERMANECE_SOB_SUPERVISAO');
  const [responsavel, setResponsavel] = useState('');
  const [primeiraVez, setPrimeiraVez] = useState(false);
  const [acolhimentoFeito, setAcolhimentoFeito] = useState(false);

  const [nivel, setNivel] = useState<NivelDeContribuicao | null>(null);
  const [valor, setValor] = useState('');
  const [hospedagem, setHospedagem] = useState<Hospedagem>('SEM_HOSPEDAGEM');
  const [dias, setDias] = useState(1);
  const [leitoAlocado, setLeitoAlocado] = useState(false);
  const [refeicoes, setRefeicoes] = useState<readonly Refeicao[]>([]);

  const [emergencia, setEmergencia] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [recado, setRecado] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  const escolher = (p: PessoaDoDiretorio) => {
    setPessoa(p);
    setBusca('');
    const novoTipo: TipoParticipacao = p.menorDeIdade ? 'CRIANCA_ESTELAR' : 'PARTICIPANTE';
    setTipo(novoTipo);
    setConsagra(CONSAGRA_POR_PADRAO[novoTipo]);
    setPrimeiraVez(!p.jaParticipou);
    setAcolhimentoFeito(p.acolhimento === 'REALIZADO');
    setResponsavel('');
    setModalidade('PERMANECE_SOB_SUPERVISAO');
    setNivel(null);
    setValor('');
    setHospedagem('SEM_HOSPEDAGEM');
    setLeitoAlocado(false);
    setRefeicoes([]);
    setEmergencia(p.contatoEmergencia ?? '');
    setRestricoes(p.restricoes ?? '');
    setRecado(null);
  };

  const trocarTipo = (t: TipoParticipacao) => {
    setTipo(t);
    setConsagra(t === 'CRIANCA_ESTELAR' ? modalidade === 'PARTICIPA_RITUAL' : CONSAGRA_POR_PADRAO[t]);
  };

  const trocarModalidade = (m: ModalidadeCrianca) => {
    setModalidade(m);
    setConsagra(m === 'PARTICIPA_RITUAL');
  };

  const isento = tipo === 'EQUIPE';
  /** IN3 e a questão aberta: a equipe consagra e, por prática da casa, não responde. */
  const anamneseExigida = consagra && tipo !== 'EQUIPE';
  const opcaoHosp = evento.hospedagens.find((h) => h.tipo === hospedagem)!;

  const contribuicao = isento ? 0 : Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const custoHospedagem = opcaoHosp.valorDiaria * dias;
  const custoRefeicoes = refeicoes.reduce(
    (s, r) => s + (evento.refeicoes.find((x) => x.refeicao === r)?.valor ?? 0),
    0,
  );
  const total = contribuicao + custoHospedagem + custoRefeicoes;
  /** Nem isento nem zero: ninguém conversou sobre valor ainda. */
  const semValor = !isento && valor.trim() === '';

  const pendencias: readonly Pendencia[] = useMemo(
    () =>
      pendenciasDaInscricao({
        pessoa,
        tipo,
        responsavel,
        anamneseExigida,
        primeiraVez,
        acolhimentoFeito,
        opcaoHosp,
        leitoAlocado,
        leitosLivres: evento.leitosLivres,
        emergencia,
        restricoes,
        aoCopiarLink: () => setLinkCopiado(true),
        aoRegistrarAcolhimento: () => setAcolhimentoFeito(true),
        aoAlocarLeito: () => setLeitoAlocado(true),
      }),
    [
      pessoa,
      tipo,
      responsavel,
      anamneseExigida,
      primeiraVez,
      acolhimentoFeito,
      opcaoHosp,
      leitoAlocado,
      evento.leitosLivres,
      emergencia,
      restricoes,
    ],
  );

  const gravar = (confirmada: boolean) => {
    if (!pessoa) return;
    setRecado(
      confirmada
        ? `${pessoa.nome} está confirmada no ${evento.nome} de ${evento.data}. ${isento ? 'Isenta de contribuição.' : semValor ? 'Valor a combinar.' : `Devido: ${formatarBRL(total)}.`} O pagamento se marca na recepção, no dia.`
        : `Inscrição de ${pessoa.nome} salva como pendente. Ela aparece na lista do trabalho com ${pluralizar(pendencias.length, 'pendência')} — e nada se perde por salvar assim.`,
    );
    setPessoa(null);
  };

  const fecharRecado = () => setRecado(null);

  const trocarEvento = (v: string) => {
    setEventoId(v);
    setRefeicoes([]);
    setLeitoAlocado(false);
  };

  const copiarLink = () => setLinkCopiado(true);

  const trocarPessoa = () => setPessoa(null);

  const alternarConsagra = () => setConsagra((c) => !c);

  const alternarPrimeiraVez = () => setPrimeiraVez((v) => !v);

  const escolherNivel = (n: NivelDeContribuicao, v: string) => {
    setNivel(n);
    setValor(v);
  };

  const digitarValor = (v: string) => {
    setValor(v);
    setNivel(null);
  };

  const escolherHospedagem = (h: Hospedagem) => {
    setHospedagem(h);
    setLeitoAlocado(false);
  };

  const alternarRefeicao = (r: Refeicao) =>
    setRefeicoes((atual) => (atual.includes(r) ? atual.filter((x) => x !== r) : [...atual, r]));

  const confirmar = () => gravar(true);

  const salvarPendente = () => gravar(false);

  return {
    evento,
    eventoId,
    busca,
    pessoa,
    tipo,
    consagra,
    modalidade,
    responsavel,
    primeiraVez,
    acolhimentoFeito,
    nivel,
    valor,
    hospedagem,
    dias,
    refeicoes,
    emergencia,
    restricoes,
    recado,
    linkCopiado,
    isento,
    anamneseExigida,
    opcaoHosp,
    contribuicao,
    custoHospedagem,
    custoRefeicoes,
    total,
    semValor,
    pendencias,
    fecharRecado,
    trocarEvento,
    copiarLink,
    buscar: setBusca,
    escolher,
    trocarPessoa,
    trocarTipo,
    escolherResponsavel: setResponsavel,
    trocarModalidade,
    alternarConsagra,
    alternarPrimeiraVez,
    escolherNivel,
    digitarValor,
    escolherHospedagem,
    escolherDias: setDias,
    alternarRefeicao,
    digitarEmergencia: setEmergencia,
    digitarRestricoes: setRestricoes,
    confirmar,
    salvarPendente,
  };
}
