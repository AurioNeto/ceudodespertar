import { useMemo, useState } from 'react';
import type { Hospedagem, NivelDeContribuicao, Refeicao } from '@cdd/contracts';
import { useDensidade } from '@/ds';
import { disparaAlerta, respondida } from './utils/regraDeAlerta';
import { cadastros, formularioInteiro, type CadastroEncontrado } from './mocks/inscricaoPublica';
import { eventoDoLink } from '../mocks/linkDaCerimonia';
import { mascararCpf, soDigitos } from './utils/cpf';
import { NOVO_VAZIO } from './constantes';
import type { Novo, Passo } from './tipos';
import { Declaracao } from './components/Declaracao';
import { Identificacao } from './components/Identificacao';
import { Moldura } from './components/Moldura';
import { Participacao } from './components/Participacao';
import { PassoAnamnese } from './components/PassoAnamnese';
import { PassoCadastro } from './components/PassoCadastro';
import { Pronto } from './components/Pronto';

/**
 * Inscrição pelo link da cerimônia — a única tela do sistema que um
 * participante vê, e a única fora do AppShell além do login.
 *
 * Ela existe porque duas premissas dos documentos estavam erradas: não há
 * anamnese presencial (quem responde é a própria pessoa) e autoinscrição não
 * é proibida (o que a casa quer humanizado é o atendimento da recepção, que
 * acontece no WhatsApp — e é de lá que este link sai).
 *
 * O reconhecimento é por CPF, e é o que torna o resto barato: quem já veio
 * antes responde só o que mudou e declara que o resto segue valendo.
 */

export function InscricaoPublicaPage() {
  const densidade = useDensidade();

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

  return (
    <Moldura densidade={densidade} passo={passo}>
      {passo === 'IDENTIFICACAO' ? (
        <Identificacao
          densidade={densidade}
          cpf={cpf}
          erro={erroCpf}
          onCpf={(v) => {
            setCpf(mascararCpf(v));
            setErroCpf(undefined);
          }}
          onSeguir={identificar}
        />
      ) : null}

      {passo === 'CADASTRO' ? (
        <PassoCadastro
          densidade={densidade}
          cpf={cpf}
          novo={novo}
          faltando={faltandoNoCadastro}
          onNovo={setNovo}
          onSeguir={() => setPasso('ANAMNESE')}
        />
      ) : null}

      {passo === 'ANAMNESE' ? (
        <PassoAnamnese
          densidade={densidade}
          refazendo={refazendo}
          cadastro={cadastro}
          primeiroNome={primeiroNome}
          modo={modo}
          pendentes={pendentes}
          valores={valores}
          faltando={faltandoNaAnamnese}
          onResponder={(id, v) => setValores((r) => ({ ...r, [id]: v }))}
          onSeguir={() => setPasso('DECLARACAO')}
        />
      ) : null}

      {passo === 'DECLARACAO' ? (
        <Declaracao
          densidade={densidade}
          cadastro={cadastro}
          primeiroNome={primeiroNome}
          refeita={refazendo}
          declarado={declarado}
          onDeclarar={() => setDeclarado((d) => !d)}
          onRefazer={() => {
            setRefazendo(true);
            setValores({});
            setDeclarado(false);
            setPasso('ANAMNESE');
          }}
          onSeguir={() => setPasso('PARTICIPACAO')}
        />
      ) : null}

      {passo === 'PARTICIPACAO' ? (
        <Participacao
          densidade={densidade}
          nivel={nivel}
          valor={valor}
          onNivel={(n, v) => {
            setNivel(n);
            setValor(v);
          }}
          onValor={(v) => {
            setValor(v);
            setNivel(null);
          }}
          hospedagem={hospedagem}
          onHospedagem={setHospedagem}
          dias={dias}
          onDias={setDias}
          refeicoes={refeicoes}
          onRefeicoes={setRefeicoes}
          emergencia={emergencia}
          onEmergencia={setEmergencia}
          restricoes={restricoes}
          onRestricoes={setRestricoes}
          total={total}
          semValor={semValor}
          custoHospedagem={custoHospedagem}
          custoRefeicoes={custoRefeicoes}
          contribuicao={contribuicao}
          faltando={faltandoNaParticipacao}
          onEnviar={() => setPasso('PRONTO')}
        />
      ) : null}

      {passo === 'PRONTO' ? (
        <Pronto
          densidade={densidade}
          nome={nome}
          primeiraVez={!jaParticipou}
          pontos={pontos}
          total={total}
          semValor={semValor}
        />
      ) : null}
    </Moldura>
  );
}
