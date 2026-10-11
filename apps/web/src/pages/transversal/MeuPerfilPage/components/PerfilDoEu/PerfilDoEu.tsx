import type { Eu } from '@cdd/contracts';
import { Avatar, Button, Cartao, Leitura, type Density } from '@/ds';
import { PermissoesPorModulo } from '@/pages/components/PermissoesPorModulo';

interface PerfilDoEuProps {
  readonly eu: Eu;
  readonly densidade: Density;
  readonly aoSair: () => void;
}

export function PerfilDoEu({ eu, densidade, aoSair }: PerfilDoEuProps) {
  const campo = densidade === 'field';

  return (
    <>
      <Cartao campo={campo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar nome={eu.usuario.nome} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{eu.usuario.nome}</div>
            <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{eu.usuario.email}</div>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
            gap: 14,
          }}
        >
          <Leitura rotulo="Nome" valor={eu.usuario.nome} />
          <Leitura rotulo="E-mail" valor={eu.usuario.email} />
          <Leitura rotulo="Instituição" valor={eu.instituicao.nome} />
          <Leitura
            rotulo="Grupos"
            valor={eu.grupos.length > 0 ? eu.grupos.map((grupo) => grupo.nome).join(', ') : 'Nenhum grupo'}
            nota="quem muda é um administrador"
          />
        </div>
      </Cartao>

      <Cartao campo={campo}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Minhas permissões</span>
        <PermissoesPorModulo
          codigos={eu.permissoes}
          mostrarCodigo
          vazio="Nenhuma permissão concedida ao seu acesso."
          rotuloAcessivel={(modulo) => `Permissões de ${modulo}`}
        />
      </Cartao>

      <Cartao campo={campo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Sair da conta</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              encerra a sessão apenas neste aparelho
            </span>
          </span>
          <Button variant="quiet" iconName="log-in" onClick={aoSair}>
            Sair
          </Button>
        </div>
      </Cartao>
    </>
  );
}
