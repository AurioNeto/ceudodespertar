import { useDensidade } from '@/ds';
import { Declaracao } from './components/Declaracao';
import { Identificacao } from './components/Identificacao';
import { Moldura } from './components/Moldura';
import { Participacao } from './components/Participacao';
import { PassoAnamnese } from './components/PassoAnamnese';
import { PassoCadastro } from './components/PassoCadastro';
import { Pronto } from './components/Pronto';
import { useInscricaoPublica } from './hooks/useInscricaoPublica';

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
  const tela = useInscricaoPublica();

  return (
    <Moldura densidade={densidade} passo={tela.passo}>
      {tela.passo === 'IDENTIFICACAO' ? (
        <Identificacao
          densidade={densidade}
          cpf={tela.cpf}
          erro={tela.erroCpf}
          onCpf={tela.digitarCpf}
          onSeguir={tela.identificar}
        />
      ) : null}

      {tela.passo === 'CADASTRO' ? (
        <PassoCadastro
          densidade={densidade}
          cpf={tela.cpf}
          novo={tela.novo}
          faltando={tela.faltandoNoCadastro}
          onNovo={tela.preencherNovo}
          onSeguir={tela.seguirParaAnamnese}
        />
      ) : null}

      {tela.passo === 'ANAMNESE' ? (
        <PassoAnamnese
          densidade={densidade}
          refazendo={tela.refazendo}
          cadastro={tela.cadastro}
          primeiroNome={tela.primeiroNome}
          modo={tela.modo}
          pendentes={tela.pendentes}
          valores={tela.valores}
          faltando={tela.faltandoNaAnamnese}
          onResponder={tela.responder}
          onSeguir={tela.seguirParaDeclaracao}
        />
      ) : null}

      {tela.passo === 'DECLARACAO' ? (
        <Declaracao
          densidade={densidade}
          cadastro={tela.cadastro}
          primeiroNome={tela.primeiroNome}
          refeita={tela.refazendo}
          declarado={tela.declarado}
          onDeclarar={tela.alternarDeclarado}
          onRefazer={tela.refazer}
          onSeguir={tela.seguirParaParticipacao}
        />
      ) : null}

      {tela.passo === 'PARTICIPACAO' ? (
        <Participacao
          densidade={densidade}
          nivel={tela.nivel}
          valor={tela.valor}
          onNivel={tela.escolherNivel}
          onValor={tela.digitarValor}
          hospedagem={tela.hospedagem}
          onHospedagem={tela.escolherHospedagem}
          dias={tela.dias}
          onDias={tela.escolherDias}
          refeicoes={tela.refeicoes}
          onRefeicoes={tela.escolherRefeicoes}
          emergencia={tela.emergencia}
          onEmergencia={tela.digitarEmergencia}
          restricoes={tela.restricoes}
          onRestricoes={tela.digitarRestricoes}
          total={tela.total}
          semValor={tela.semValor}
          custoHospedagem={tela.custoHospedagem}
          custoRefeicoes={tela.custoRefeicoes}
          contribuicao={tela.contribuicao}
          faltando={tela.faltandoNaParticipacao}
          onEnviar={tela.enviar}
        />
      ) : null}

      {tela.passo === 'PRONTO' ? (
        <Pronto
          densidade={densidade}
          nome={tela.nome}
          primeiraVez={!tela.jaParticipou}
          pontos={tela.pontos}
          total={tela.total}
          semValor={tela.semValor}
        />
      ) : null}
    </Moldura>
  );
}
