import { Avatar, Aviso, Button, Icon, Leitura, StatusBadge } from '@/ds';
import { SeloDaAnamnese } from '@/pages/components/SeloDaAnamnese';
import type { AcessoAoSistema, GrupoDeAcesso, PessoaDaCasa } from '../../mocks/pessoas';
import { CartaoDaFicha } from './components/CartaoDaFicha';
import { ACESSO } from './constantes';

export interface FichaDaPessoaProps {
  pessoa: PessoaDaCasa;
  acesso: AcessoAoSistema | null;
  grupos: readonly GrupoDeAcesso[];
  onVoltar: () => void;
  onAviso: (t: string) => void;
  onInativar: () => void;
  onMudarGrupo: (grupo: string) => void;
  onConceder: () => void;
  onRevogar: () => void;
}

export function FichaDaPessoa({
  pessoa,
  acesso,
  grupos,
  onVoltar,
  onAviso,
  onInativar,
  onMudarGrupo,
  onConceder,
  onRevogar,
}: FichaDaPessoaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        type="button"
        onClick={onVoltar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: 'var(--text-small)',
          color: 'var(--color-royal)',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        <Icon name="arrow-left" size={16} color="var(--color-royal)" />
        Voltar para a lista
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Avatar nome={pessoa.nome} />
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2 style={{ font: 'var(--text-title)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}>
            {pessoa.nome}
          </h2>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {pessoa.vinculo} desde {pessoa.desde} · {pessoa.cidade}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button variant="ghost" iconName="pencil" onClick={() => onAviso('Edição do cadastro da pessoa.')}>
            Editar
          </Button>
          <Button variant="quiet" iconName="send" onClick={() => onAviso(`Anamnese enviada para ${pessoa.nome}.`)}>
            Enviar anamnese
          </Button>
          <Button variant="quiet" iconName="user-x" onClick={onInativar}>
            {pessoa.ativa ? 'Inativar' : 'Reativar'}
          </Button>
        </div>
      </div>

      <CartaoDaFicha titulo="Dados">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
          <Leitura rotulo="Telefone" valor={pessoa.telefone} />
          <Leitura rotulo="Nascimento" valor={pessoa.nascimento} />
          <Leitura rotulo="Cidade" valor={pessoa.cidade} />
          <Leitura rotulo="Contato de emergência" valor={pessoa.emergencia} />
        </div>
      </CartaoDaFicha>

      <CartaoDaFicha
        titulo="Anamnese"
        nota={
          pessoa.respondidaEm
            ? `respondida em ${pessoa.respondidaEm} · formulário ${pessoa.versao}`
            : 'nunca respondeu'
        }
      >
        <SeloDaAnamnese estado={pessoa.anamnese} style={{ alignSelf: 'flex-start' }} />
        {pessoa.pontos.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pessoa.pontos.map(([titulo, detalhe]) => (
              <Aviso key={titulo} tom="atencao" titulo={titulo}>
                {detalhe}
              </Aviso>
            ))}
          </div>
        ) : (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Nenhum ponto de atenção declarado.
          </span>
        )}
      </CartaoDaFicha>

      <CartaoDaFicha titulo="Acesso ao sistema">
        {acesso ? (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: '1 1 200px' }}>
                {acesso.email}
              </span>
              <select
                value={acesso.grupo}
                onChange={(e) => onMudarGrupo(e.target.value)}
                aria-label="Grupo de permissão"
                style={{
                  minHeight: 38,
                  border: '1px solid var(--border-field)',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--leaf-sm)',
                  padding: '6px 10px',
                  font: 'var(--text-small)',
                  color: 'var(--text-primary)',
                }}
              >
                {grupos.map((g) => (
                  <option key={g.id} value={g.nome}>
                    {g.nome}
                  </option>
                ))}
              </select>
              <StatusBadge tone={ACESSO[acesso.situacao].tone}>{ACESSO[acesso.situacao].label}</StatusBadge>
              <Button variant="quiet" onClick={onRevogar}>
                Revogar acesso
              </Button>
            </div>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              Último acesso: {acesso.ultimoAcesso}. Revogar não apaga o histórico de lançamentos.
            </span>
          </>
        ) : (
          <>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              Esta pessoa não entra no sistema. Conceder acesso cria um usuário ligado a este cadastro.
            </span>
            <Button variant="ghost" iconName="key-round" onClick={onConceder} style={{ alignSelf: 'flex-start' }}>
              Conceder acesso
            </Button>
          </>
        )}
      </CartaoDaFicha>
    </div>
  );
}
