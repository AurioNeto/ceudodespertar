import { Button, Icon, ScreenHeader, useDensidade, Select } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { FichaDaPessoa } from './components/FichaDaPessoa';
import { Kpi } from './components/Kpi';
import { ListaDePessoas } from './components/ListaDePessoas';
import { OPCOES_DO_FILTRO, rotuloLabel } from './constantes';
import { usePessoasDeDemonstracao } from './hooks/usePessoasDeDemonstracao';

export function PessoasPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const tela = usePessoasDeDemonstracao();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-09' : 'F-09 · Pessoas'}
        title="Pessoas"
        subtitle={campo ? undefined : 'Quem é da casa e quem entra no sistema — dois eixos, um cadastro só'}
        density={densidade}
        actions={
          <Button iconName="user-plus" onClick={() => tela.setMensagem('Formulário de nova pessoa — cadastro e convite.')}>
            Nova pessoa
          </Button>
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          maxWidth: campo ? undefined : 1080,
        }}
      >
        {tela.mensagem ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--color-royal-soft)',
              border: '1px solid var(--color-royal-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--color-royal-deep)' }}>{tela.mensagem}</span>
            <button type="button" aria-label="fechar aviso" onClick={tela.fecharMensagem} style={{ color: 'var(--color-royal-deep)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ) : null}

        {!tela.ficha ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(170px,1fr))',
                gap: 12,
              }}
            >
              <Kpi rotulo="Cadastradas" valor={`${tela.pessoas.length}`} nota={`${tela.resumo.ativas} ativas`} />
              <Kpi rotulo="Anamnese em dia" valor={`${tela.resumo.emDia}`} cor="var(--color-confirmed)" nota="dentro da validade" />
              <Kpi rotulo="Anamnese pendente" valor={`${tela.resumo.pendentes}`} cor="var(--color-pending)" nota="sem resposta ou vencida" />
              <Kpi
                rotulo="Com acesso"
                valor={`${tela.resumo.comAcesso}`}
                nota={
                  tela.resumo.comAcessoInativas
                    ? `${pluralizar(tela.resumo.comAcessoInativas, 'tem cadastro inativo', 'têm cadastro inativo')}`
                    : 'todas com cadastro ativo'
                }
              />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', flex: '1 1 240px' }}>
                <span style={{ ...rotuloLabel, marginBottom: 7 }}>Buscar</span>
                <input
                  value={tela.busca}
                  onChange={(e) => tela.setBusca(e.target.value)}
                  placeholder="nome, cidade ou telefone"
                  style={{
                    minHeight: 'var(--target-office)',
                    border: '1px solid var(--color-line-strong)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 13px',
                    font: 'var(--text-body)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </label>
              <Select
                label="Filtro"
                value={tela.filtro}
                options={OPCOES_DO_FILTRO}
                onChange={tela.setFiltro}
              />
            </div>

            <ListaDePessoas pessoas={tela.listadas} acessos={tela.acessos} onAbrir={tela.setFichaId} />
          </>
        ) : null}

        {tela.ficha ? (
          <FichaDaPessoa
            pessoa={tela.ficha}
            acesso={tela.acessos[tela.ficha.id] ?? null}
            grupos={tela.grupos}
            onVoltar={tela.fecharFicha}
            onAviso={tela.setMensagem}
            onInativar={tela.inativar}
            onMudarGrupo={tela.mudarGrupo}
            onConceder={tela.conceder}
            onRevogar={tela.revogar}
          />
        ) : null}
      </div>
    </>
  );
}
