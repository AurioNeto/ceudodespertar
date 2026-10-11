import type { OpcaoDeHospedagem, TipoParticipacao } from '@cdd/contracts';
import { pluralizar } from '@/pages/utils/formato';
import { diretorio, type PessoaDoDiretorio } from '../mocks/inscricao';
import type { Pendencia } from '../tipos';

export interface DadosDasPendencias {
  pessoa: PessoaDoDiretorio | null;
  tipo: TipoParticipacao;
  responsavel: string;
  anamneseExigida: boolean;
  primeiraVez: boolean;
  acolhimentoFeito: boolean;
  opcaoHosp: OpcaoDeHospedagem;
  leitoAlocado: boolean;
  leitosLivres: number;
  emergencia: string;
  restricoes: string;
  aoCopiarLink: () => void;
  aoRegistrarAcolhimento: () => void;
  aoAlocarLeito: () => void;
}

export function pendenciasDaInscricao({
  pessoa,
  tipo,
  responsavel,
  anamneseExigida,
  primeiraVez,
  acolhimentoFeito,
  opcaoHosp,
  leitoAlocado,
  leitosLivres,
  emergencia,
  restricoes,
  aoCopiarLink,
  aoRegistrarAcolhimento,
  aoAlocarLeito,
}: DadosDasPendencias): readonly Pendencia[] {
  if (!pessoa) return [];
  const lista: Pendencia[] = [];

  if (tipo === 'CRIANCA_ESTELAR') {
    if (!responsavel) {
      lista.push({
        chave: 'responsavel',
        titulo: 'Falta o responsável',
        detalhe: 'Criança estelar não se inscreve sozinha: alguém responde por ela neste trabalho.',
        invariante: 'IN2',
      });
    } else if (!pessoa.autorizacaoVigente && !diretorio.find((d) => d.nome === responsavel)?.autorizacaoVigente) {
      lista.push({
        chave: 'autorizacao',
        titulo: 'Sem autorização vigente para este trabalho',
        detalhe: 'A autorização é por evento — não existe autorizar para o ano. É colhida na chegada, com o responsável presente.',
        invariante: 'IN2',
      });
    }
  }

  if (anamneseExigida && pessoa.anamnese !== 'OK') {
    lista.push({
      chave: 'anamnese',
      titulo: pessoa.anamnese === 'VENCIDA' ? 'Anamnese vencida' : 'Anamnese pendente',
      detalhe:
        'Quem consagra precisa da anamnese em dia. Não é burocracia: é o que identifica medicação e condição incompatíveis com a consagração. Quem responde é a própria pessoa, pelo link da cerimônia — ninguém da casa preenche por ela.',
      invariante: 'IN5',
      acao: { rotulo: 'Copiar o link para mandar no WhatsApp', ao: aoCopiarLink },
    });
  }

  if (primeiraVez && !acolhimentoFeito) {
    lista.push({
      chave: 'acolhimento',
      titulo: 'Conversa de primeira vez não registrada',
      detalhe: 'A casa já faz essa conversa. O que faltava era o registro de que ela aconteceu.',
      invariante: 'IN6',
      acao: { rotulo: 'Registrar a conversa', ao: aoRegistrarAcolhimento },
    });
  }

  if (opcaoHosp.ocupaLeito && !leitoAlocado) {
    lista.push({
      chave: 'leito',
      titulo: 'Leito não alocado',
      detalhe: `Quem dorme em ${opcaoHosp.rotulo.toLowerCase()} ocupa vaga, e a vaga se escolhe no mapa de leitos. Há ${pluralizar(leitosLivres, 'leito livre', 'leitos livres')}.`,
      invariante: 'IN9',
      acao: { rotulo: 'Alocar um leito', ao: aoAlocarLeito },
    });
  }

  if (!emergencia.trim() || !restricoes.trim()) {
    lista.push({
      chave: 'emergencia',
      titulo: 'Contato de emergência e restrição alimentar',
      detalhe: 'Obrigatórios para todo mundo, inclusive para quem não consagra. É a única exigência dura da inscrição.',
      invariante: 'IN4',
    });
  }

  return lista;
}
