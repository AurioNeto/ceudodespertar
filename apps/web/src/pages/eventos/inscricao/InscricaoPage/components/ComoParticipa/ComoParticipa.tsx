import type { ModalidadeCrianca, TipoParticipacao } from '@cdd/contracts';
import { Select, SeletorDeTipo, type Density } from '@/ds';
import { diretorio } from '../../mocks/inscricao';
import { Bloco } from '../Bloco';
import { LinhaDeInterruptor } from '../LinhaDeInterruptor';
import { TIPO_EXPLICACAO, TIPO_ROTULO } from './constantes';

export interface ComoParticipaProps {
  tipo: TipoParticipacao;
  responsavel: string;
  modalidade: ModalidadeCrianca;
  consagra: boolean;
  primeiraVez: boolean;
  acolhimentoFeito: boolean;
  onTipo: (t: TipoParticipacao) => void;
  onResponsavel: (v: string) => void;
  onModalidade: (m: ModalidadeCrianca) => void;
  onAlternarConsagra: () => void;
  onAlternarPrimeiraVez: () => void;
  densidade: Density;
}

export function ComoParticipa({
  tipo,
  responsavel,
  modalidade,
  consagra,
  primeiraVez,
  acolhimentoFeito,
  onTipo,
  onResponsavel,
  onModalidade,
  onAlternarConsagra,
  onAlternarPrimeiraVez,
  densidade,
}: ComoParticipaProps) {
  const campo = densidade === 'field';
  return (
    <Bloco titulo="Como participa" densidade={densidade}>
      <SeletorDeTipo
        opcoes={(['PARTICIPANTE', 'CONVIDADO', 'EQUIPE', 'CRIANCA_ESTELAR'] as const).map((t) => ({
          valor: t,
          label: TIPO_ROTULO[t],
        }))}
        valor={tipo}
        onEscolher={onTipo}
        densidade={campo ? 'field' : 'office'}
      />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {TIPO_EXPLICACAO[tipo]}
      </span>

      {tipo === 'CRIANCA_ESTELAR' ? (
        <>
          <Select
            label="Responsável neste trabalho"
            value={responsavel}
            onChange={onResponsavel}
            options={[
              { value: '', label: 'Escolha quem responde por ela' },
              ...diretorio
                .filter((d) => !d.menorDeIdade)
                .map((d) => ({ value: d.nome, label: d.nome })),
            ]}
          />
          <SeletorDeTipo
            opcoes={[
              { valor: 'PERMANECE_SOB_SUPERVISAO' as const, label: 'Permanece sob supervisão' },
              { valor: 'PARTICIPA_RITUAL' as const, label: 'Participa do ritual' },
            ]}
            valor={modalidade}
            onEscolher={onModalidade}
            densidade={campo ? 'field' : 'office'}
          />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            A modalidade não é detalhe: ela decide se a criança consagra, e com isso se a anamnese se aplica.
          </span>
        </>
      ) : null}

      <LinhaDeInterruptor
        rotulo="Consagra neste trabalho"
        nota={
          tipo === 'EQUIPE' && consagra
            ? 'A equipe consagra e, por prática da casa, não responde anamnese. Está registrado como questão aberta para a coordenação — é diferente de ser acidental.'
            : consagra
              ? 'Entra na estimativa de consumo de daime e, fora da equipe, exige anamnese em dia.'
              : 'Presente sem consagrar. A anamnese deixa de se aplicar, e a estimativa de consumo não conta esta pessoa.'
        }
        ligado={consagra}
        onAlternar={onAlternarConsagra}
      />

      <LinhaDeInterruptor
        rotulo="Primeira vez na casa"
        nota={
          primeiraVez
            ? acolhimentoFeito
              ? 'Conversa de acolhimento registrada.'
              : 'Vai precisar da conversa de acolhimento antes de confirmar.'
            : 'Já esteve aqui antes.'
        }
        ligado={primeiraVez}
        onAlternar={onAlternarPrimeiraVez}
      />
    </Bloco>
  );
}
