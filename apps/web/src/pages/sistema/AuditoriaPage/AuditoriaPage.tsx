import { CorpoDaTela, ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
import { Acesso } from './components/Acesso';
import { Trilha } from './components/Trilha';
import { useAuditoria } from './hooks/useAuditoria';

/**
 * Auditoria — Doc 4 §9 e Doc 3 §10.4.
 *
 * Duas visões, e a segunda é a razão de a tela existir cedo: o log de acesso a
 * dado sensível é o contrapeso ao poder do Acolhimento sobre a anamnese. Quem
 * pode ler tudo precisa ser visto lendo.
 *
 * O que a tela nunca mostra é o conteúdo lido. O log diz que houve leitura, de
 * quem e quando — o dado de saúde continua morando num lugar só.
 */

export function AuditoriaPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const { visao, setVisao } = useAuditoria();

  return (
    <>
      <ScreenHeader
        title="Auditoria"
        subtitle={campo ? undefined : 'A trilha das operações e o log de leitura de dado sensível · CDD'}
        density={densidade}
      />

      <CorpoDaTela densidade={densidade} larguraMaxima={1100}>
        <SeletorDeTipo
          opcoes={[
            { valor: 'trilha', label: 'Trilha de operações' },
            { valor: 'acesso', label: 'Acesso a dado sensível' },
          ]}
          valor={visao}
          onEscolher={setVisao}
          densidade={densidade}
        />

        {visao === 'trilha' ? <Trilha densidade={densidade} /> : <Acesso densidade={densidade} />}
      </CorpoDaTela>
    </>
  );
}
