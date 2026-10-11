import { Avatar, Button, Icon, StatusBadge } from '@/ds';
import { TEXTO_DA_ANAMNESE, TOM_DA_ANAMNESE } from '../../constantes';
import type { AcessoAoSistema, GrupoDeAcesso, PessoaDaCasa } from '../../mocks/pessoas';
import { Cartao } from './components/Cartao';
import { Dado } from './components/Dado';
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

      <Cartao titulo="Dados">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
          <Dado rotulo="Telefone" valor={pessoa.telefone} />
          <Dado rotulo="Nascimento" valor={pessoa.nascimento} />
          <Dado rotulo="Cidade" valor={pessoa.cidade} />
          <Dado rotulo="Contato de emergência" valor={pessoa.emergencia} />
        </div>
      </Cartao>

      <Cartao
        titulo="Anamnese"
        nota={
          pessoa.respondidaEm
            ? `respondida em ${pessoa.respondidaEm} · formulário ${pessoa.versao}`
            : 'nunca respondeu'
        }
      >
        <StatusBadge tone={TOM_DA_ANAMNESE[pessoa.anamnese]} style={{ alignSelf: 'flex-start' }}>
          {TEXTO_DA_ANAMNESE[pessoa.anamnese]}
        </StatusBadge>
        {pessoa.pontos.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pessoa.pontos.map(([titulo, detalhe]) => (
              <div
                key={titulo}
                style={{
                  background: 'var(--color-attention-soft)',
                  border: '1px solid var(--color-attention-border)',
                  borderRadius: 'var(--radius)',
                  padding: '11px 13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{detalhe}</span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Nenhum ponto de atenção declarado.
          </span>
        )}
      </Cartao>

      <Cartao titulo="Acesso ao sistema">
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
                  border: '1px solid var(--color-line-strong)',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
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
      </Cartao>
    </div>
  );
}
