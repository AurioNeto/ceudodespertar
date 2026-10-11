import { Button, EmptyState, ScreenHeader, useDensidade, SeletorDeTipo, Cartao, Numero, Recado } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { FormularioDeEmprestimo } from './components/FormularioDeEmprestimo';
import { LinhaDoEmprestimo } from './components/LinhaDoEmprestimo';
import { PainelDoEmprestimo } from './components/PainelDoEmprestimo';
import { useEmprestimos } from './hooks/useEmprestimos';

export function EmprestimosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useEmprestimos();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-10' : 'F-10 · Empréstimos'}
        title="Empréstimos"
        subtitle={campo ? undefined : 'Movimentação patrimonial: não é receita nem despesa · CDD'}
        density={densidade}
        actions={
          <Button variant="ghost" iconName="circle-plus" density={densidade} onClick={tela.alternarNovo}>
            Novo empréstimo
          </Button>
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1180,
          minWidth: 0,
        }}
      >
        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: 16,
            }}
          >
            <Numero
              rotulo="A receber"
              valor={formatarDinheiro(tela.aReceber)}
              nota="emprestado e ainda não devolvido"
              destaque
            />
            <Numero
              rotulo="A devolver"
              valor={formatarDinheiro(tela.aDevolver)}
              nota="a casa tomou e ainda deve"
              cor="var(--color-pending)"
            />
            <Numero
              rotulo="Quitados"
              valor={String(tela.quitados.length)}
              nota={tela.quitados.length ? tela.quitados.map((e) => e.contraparteNome).join(' · ') : 'nenhum ainda'}
            />
          </div>
        </Cartao>

        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        {tela.criando ? (
          <FormularioDeEmprestimo
            densidade={densidade}
            valores={tela.novo}
            valido={tela.novoValido}
            onMudar={tela.mudarNovo}
            onConfirmar={tela.criarEmprestimo}
            onCancelar={tela.cancelarNovo}
          />
        ) : null}

        <SeletorDeTipo
          opcoes={[
            { valor: 'todos', label: 'Todos' },
            { valor: 'CONCEDIDO', label: 'Concedidos' },
            { valor: 'RECEBIDO', label: 'Recebidos' },
            { valor: 'quitados', label: 'Quitados' },
          ]}
          valor={tela.filtro}
          onEscolher={tela.escolherFiltro}
          densidade={densidade}
        />

        {tela.visiveis.length === 0 ? (
          <EmptyState
            title="Nenhum empréstimo neste recorte"
            description="Troque o filtro acima, ou registre o primeiro empréstimo desta direção."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'minmax(0,1fr)' : '300px minmax(0,1fr)',
              gap: campo ? 14 : 20,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tela.visiveis.map((e) => (
                <LinhaDoEmprestimo
                  key={e.id}
                  emprestimo={e}
                  ativo={e.id === tela.aberto?.id}
                  onAbrir={() => tela.abrirEmprestimo(e.id)}
                />
              ))}
            </div>

            {tela.aberto ? (
              <PainelDoEmprestimo
                emprestimo={tela.aberto}
                densidade={densidade}
                devolvendo={tela.devolvendo}
                saldo={tela.saldo}
                valor={tela.valorDevolucao}
                data={tela.dataDevolucao}
                conta={tela.contaDevolucao}
                excedeSaldo={tela.excedeSaldo}
                valorValido={tela.valorValido}
                onIniciarDevolucao={tela.iniciarDevolucao}
                onValor={tela.escolherValorDevolucao}
                onData={tela.escolherDataDevolucao}
                onConta={tela.escolherContaDevolucao}
                onConfirmarDevolucao={tela.registrarDevolucao}
                onCancelarDevolucao={tela.cancelarDevolucao}
              />
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
