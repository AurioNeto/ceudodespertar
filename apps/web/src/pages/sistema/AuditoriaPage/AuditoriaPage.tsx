import { ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
import { Acesso } from './components/Acesso';
import { Trilha } from './components/Trilha';
import { useAuditoria } from './hooks/useAuditoria';

/**
 * `A-04` · Auditoria — Doc 4 §9 e Doc 3 §10.4.
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
        code={campo ? 'A-04' : 'A-04 · Auditoria'}
        title="Auditoria"
        subtitle={campo ? undefined : 'A trilha das operações e o log de leitura de dado sensível · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1100,
          minWidth: 0,
        }}
      >
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
      </div>
    </>
  );
}
