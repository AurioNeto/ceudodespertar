import { SeletorDeTipo, Cartao, Numero, type Density } from '@/ds';
import { ContrapesoDaGovernanca } from './components/ContrapesoDaGovernanca';
import { GrupoDeAcessos } from './components/GrupoDeAcessos';
import { useAcessosAgrupados } from './hooks/useAcessosAgrupados';

export interface AcessoProps {
  densidade: Density;
}

export function Acesso({ densidade }: AcessoProps) {
  const campo = densidade === 'field';
  const { agrupamento, setAgrupamento, leituras, leitores, pessoas, semContexto, grupos } = useAcessosAgrupados();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16, minWidth: 0 }}>
      <ContrapesoDaGovernanca />

      <Cartao campo={campo}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
            gap: campo ? 14 : 20,
          }}
        >
          <Numero rotulo="Leituras no período" valor={String(leituras)} nota="últimos 30 dias" destaque />
          <Numero rotulo="Quem leu" valor={String(leitores)} nota="pessoas com a permissão" />
          <Numero rotulo="Anamneses tocadas" valor={String(pessoas)} nota="pessoas diferentes" />
          <Numero
            rotulo="Sem contexto vinculado"
            valor={String(semContexto)}
            nota="leitura fora de percurso"
            cor={semContexto > 0 ? 'var(--color-pending)' : undefined}
          />
        </div>
      </Cartao>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <SeletorDeTipo
          opcoes={[
            { valor: 'leitor', label: 'Por quem leu' },
            { valor: 'pessoa', label: 'Por quem foi lido' },
          ]}
          valor={agrupamento}
          onEscolher={setAgrupamento}
          densidade={campo ? 'field' : 'office'}
        />
      </div>

      {grupos.map((g) => (
        <GrupoDeAcessos key={g.chave} grupo={g} agrupamento={agrupamento} densidade={densidade} />
      ))}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '78ch' }}>
        O log diz que houve leitura, de quem e quando. <b>Não diz o que foi lido</b> — o conteúdo da anamnese mora num
        lugar só, e chegar até ele gera mais uma linha aqui.
      </span>
    </div>
  );
}
