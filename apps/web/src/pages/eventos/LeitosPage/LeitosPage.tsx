import { ScreenHeader, useDensidade, SeletorDeTipo, Cartao, Numero, Recado } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { eventoDoMapa } from './mocks/leitos';
import { AvisoDeConflito } from './components/AvisoDeConflito';
import { Cadastro } from './components/Cadastro';
import { ForaDoMapa } from './components/ForaDoMapa';
import { Grade } from './components/Grade';
import { SemLeito } from './components/SemLeito';
import { useAlocacaoDeLeitos } from './hooks/useAlocacaoDeLeitos';

/**
 * `E-10` · Mapa de leitos e `E-15` · Cadastro — Doc 4 §7 e Doc 2 §2.6.
 *
 * Duas telas do Doc num lugar só porque quem aloca é quem sabe quantos leitos
 * existem, e ir e voltar entre telas para descobrir que falta um beliche é o
 * tipo de atrito que faz a operação voltar para o papel.
 *
 * A grade é dormitório × noite. Três invariantes são estruturais — leito
 * ocupado não é alvo (ML1), só entra quem pediu hospedagem (ML2), noite fora
 * do evento não tem coluna (ML4) — e o quarto, ML3, já aconteceu antes de a
 * tela abrir: cancelar inscrição libera o leito sozinho.
 *
 * O que **não** é invariante é o conflito com outro evento no mesmo local. O
 * agregado é por evento, e checar isso exigiria um agregado de ocupação global
 * que viraria ponto de contenção. Vira aviso — e é responsabilidade da tela
 * que o aviso seja impossível de não ver.
 */

export function LeitosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const tela = useAlocacaoDeLeitos();

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-10 · E-15' : 'E-10 e E-15 · Leitos'}
        title="Leitos"
        subtitle={campo ? undefined : `${eventoDoMapa.nome} · ${eventoDoMapa.periodo} · ${eventoDoMapa.local}`}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 26px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1060,
          minWidth: 0,
        }}
      >
        <SeletorDeTipo
          opcoes={[
            { valor: 'mapa', label: 'Mapa do evento' },
            { valor: 'cadastro', label: 'Dormitórios e leitos' },
          ]}
          valor={tela.aba}
          onEscolher={tela.escolherAba}
          densidade={densidade}
        />

        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        {tela.aba === 'mapa' ? (
          <>
            <AvisoDeConflito />

            <Cartao campo={campo}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
                  gap: campo ? 14 : 20,
                }}
              >
                <Numero
                  rotulo="Vagas-noite ocupadas"
                  valor={`${tela.ocupadas} de ${tela.vagas}`}
                  nota={`${tela.capacidadeTotal} vagas em ${pluralizar(tela.leitosAtivos.length, 'leito')} × ${eventoDoMapa.noites.length} noites`}
                  destaque
                />
                <Numero
                  rotulo="Ainda sem leito"
                  valor={String(tela.semLeito.length)}
                  nota="pessoas que pediram beliche ou quarto"
                  cor={tela.semLeito.length > 0 ? 'var(--color-pending)' : undefined}
                />
                <Numero rotulo="Dormem na igreja" valor={String(tela.dormemNaIgreja)} nota="colchonete próprio, fora do mapa" />
              </div>
            </Cartao>

            <Grade
              dormitorios={tela.dormitorios}
              densidade={densidade}
              ocupantesDe={tela.ocupantesDe}
              escolhendo={tela.escolhendo}
              onEscolher={tela.escolherLeito}
              onFechar={tela.fecharEscolha}
              onLiberar={tela.liberar}
              onAlocar={tela.alocar}
              pendencias={tela.pendencias}
            />

            <SemLeito lista={tela.semLeito} densidade={densidade} />

            <ForaDoMapa densidade={densidade} />
          </>
        ) : (
          <Cadastro
            dormitorios={tela.dormitorios}
            onMudar={tela.mudarDormitorios}
            densidade={densidade}
            onRecado={tela.mostrarRecado}
            noitesOcupadas={tela.noitesOcupadas}
          />
        )}
      </div>
    </>
  );
}
