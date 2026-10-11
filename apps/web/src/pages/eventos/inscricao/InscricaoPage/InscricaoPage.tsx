import { ScreenHeader, useDensidade, Recado } from '@/ds';
import { Alimentacao } from './components/Alimentacao';
import { BuscaDePessoa } from './components/BuscaDePessoa';
import { ComoParticipa } from './components/ComoParticipa';
import { Contribuicao } from './components/Contribuicao';
import { DadosParaACasa } from './components/DadosParaACasa';
import { EscolhaDaHospedagem } from './components/EscolhaDaHospedagem';
import { EscolhaDoEvento } from './components/EscolhaDoEvento';
import { EstadoDaAnamnese } from './components/EstadoDaAnamnese';
import { Fechamento } from './components/Fechamento';
import { LinkDaCerimonia } from './components/LinkDaCerimonia';
import { Pendencias } from './components/Pendencias';
import { PessoaEscolhida } from './components/PessoaEscolhida';
import { useInscricao } from './hooks/useInscricao';

/**
 * `E-06` · Inscrição — Doc 4 §7 e Doc 2 §2.4.
 *
 * A tela onde os invariantes de inscrição se encontram: `EQUIPE` é isento e
 * não zero (IN1), criança estelar exige responsável, modalidade e autorização
 * vigente (IN2), anamnese em dia é condição de confirmar (IN5), primeira vez
 * exige a conversa registrada (IN6), leito pede alocação (IN9) — e contato de
 * emergência e restrição alimentar são obrigatórios para todo mundo (IN4),
 * que é a única obrigatoriedade dura do fluxo.
 *
 * A contribuição segue a decisão da coordenação: **três níveis sugeridos**,
 * não uma tabela de preço. O valor é sempre editável, para menos e para mais,
 * porque contribuição negociada é a prática da casa e o sistema não pode
 * atrapalhá-la.
 */

export function InscricaoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useInscricao();

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-06' : 'E-06 · Inscrição'}
        title="Inscrição"
        subtitle={campo ? undefined : 'Inscrever alguém num trabalho · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 28px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 960,
          minWidth: 0,
        }}
      >
        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        <EscolhaDoEvento eventoId={tela.eventoId} onTrocar={tela.trocarEvento} densidade={densidade} />

        <LinkDaCerimonia densidade={densidade} copiado={tela.linkCopiado} onCopiar={tela.copiarLink} />

        {tela.pessoa === null ? (
          <BuscaDePessoa busca={tela.busca} onBusca={tela.buscar} onEscolher={tela.escolher} densidade={densidade} />
        ) : (
          <>
            <PessoaEscolhida pessoa={tela.pessoa} densidade={densidade} onTrocar={tela.trocarPessoa} />

            <ComoParticipa
              tipo={tela.tipo}
              responsavel={tela.responsavel}
              modalidade={tela.modalidade}
              consagra={tela.consagra}
              primeiraVez={tela.primeiraVez}
              acolhimentoFeito={tela.acolhimentoFeito}
              onTipo={tela.trocarTipo}
              onResponsavel={tela.escolherResponsavel}
              onModalidade={tela.trocarModalidade}
              onAlternarConsagra={tela.alternarConsagra}
              onAlternarPrimeiraVez={tela.alternarPrimeiraVez}
              densidade={densidade}
            />

            <EstadoDaAnamnese pessoa={tela.pessoa} exigida={tela.anamneseExigida} densidade={densidade} />

            <Contribuicao
              evento={tela.evento}
              isento={tela.isento}
              nivel={tela.nivel}
              valor={tela.valor}
              onNivel={tela.escolherNivel}
              onValor={tela.digitarValor}
              densidade={densidade}
            />

            <EscolhaDaHospedagem
              evento={tela.evento}
              hospedagem={tela.hospedagem}
              opcaoHosp={tela.opcaoHosp}
              dias={tela.dias}
              custoHospedagem={tela.custoHospedagem}
              onHospedagem={tela.escolherHospedagem}
              onDias={tela.escolherDias}
              densidade={densidade}
            />

            <Alimentacao
              evento={tela.evento}
              refeicoes={tela.refeicoes}
              onAlternar={tela.alternarRefeicao}
              densidade={densidade}
            />

            <DadosParaACasa
              emergencia={tela.emergencia}
              restricoes={tela.restricoes}
              onEmergencia={tela.digitarEmergencia}
              onRestricoes={tela.digitarRestricoes}
              densidade={densidade}
            />

            {tela.pendencias.length > 0 ? <Pendencias lista={tela.pendencias} densidade={densidade} /> : null}

            <Fechamento
              densidade={densidade}
              isento={tela.isento}
              semValor={tela.semValor}
              total={tela.total}
              contribuicao={tela.contribuicao}
              custoHospedagem={tela.custoHospedagem}
              custoRefeicoes={tela.custoRefeicoes}
              pendencias={tela.pendencias.length}
              nome={tela.pessoa.nome}
              onConfirmar={tela.confirmar}
              onPendente={tela.salvarPendente}
            />
          </>
        )}
      </div>
    </>
  );
}
