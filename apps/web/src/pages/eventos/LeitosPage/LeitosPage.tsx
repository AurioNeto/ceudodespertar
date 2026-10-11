import { useMemo, useState } from 'react';
import type { Dormitorio } from '@cdd/contracts';
import { ScreenHeader, useDensidade, SeletorDeTipo, Cartao, Numero, Recado } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import {
  alocacaoInicial,
  conflitoDeAgenda,
  dormitorios as dormitoriosIniciais,
  eventoDoMapa,
  foraDoMapa,
  hospedes,
  type NoiteId,
} from './mocks/leitos';
import type { Aba, Alocacao } from './tipos';
import { identificacaoDe } from './utils/leitos';
import { rotuloDaNoite } from './utils/noites';
import { AvisoDeConflito } from './components/AvisoDeConflito';
import { Cadastro } from './components/Cadastro';
import { ForaDoMapa } from './components/ForaDoMapa';
import { Grade } from './components/Grade';
import { SemLeito } from './components/SemLeito';

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

  const [aba, setAba] = useState<Aba>('mapa');
  const [dormitorios, setDormitorios] = useState<readonly Dormitorio[]>(dormitoriosIniciais);
  const [alocacao, setAlocacao] = useState<Alocacao>(
    () => JSON.parse(JSON.stringify(alocacaoInicial)) as Alocacao,
  );
  const [escolhendo, setEscolhendo] = useState<{ leitoId: string; noite: NoiteId } | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const ocupantesDe = (leitoId: string, noite: string): readonly string[] => alocacao[leitoId]?.[noite] ?? [];

  /** Quantas noites cada pessoa ainda precisa. */
  const pendencias = useMemo(
    () =>
      hospedes.map((h) => {
        const alocadas = h.noites.filter((n) =>
          Object.values(alocacao).some((noites) => (noites[n] ?? []).includes(h.inscricaoId as string)),
        );
        return { hospede: h, faltam: h.noites.filter((n) => !alocadas.includes(n)) };
      }),
    [alocacao],
  );

  const semLeito = pendencias.filter((p) => p.faltam.length > 0);

  const leitosAtivos = dormitorios.flatMap((d) => d.leitos.filter((l) => l.ativo));
  const capacidadeTotal = leitosAtivos.reduce((s, l) => s + l.capacidade, 0);
  const vagas = capacidadeTotal * eventoDoMapa.noites.length;
  const ocupadas = Object.values(alocacao).reduce(
    (s, n) => s + Object.values(n).reduce((x, pessoas) => x + pessoas.length, 0),
    0,
  );

  const alocar = (leitoId: string, noite: NoiteId, inscricaoId: string, nome: string) => {
    setAlocacao((a) => ({
      ...a,
      [leitoId]: { ...(a[leitoId] ?? {}), [noite]: [...(a[leitoId]?.[noite] ?? []), inscricaoId] },
    }));
    setEscolhendo(null);
    const emConflito = noite === conflitoDeAgenda.noite;
    setRecado(
      emConflito
        ? `${nome} alocada em ${identificacaoDe(dormitorios, leitoId)} na ${rotuloDaNoite(noite)}. Atenção: o ${conflitoDeAgenda.evento} usa o mesmo local nessa noite, e o sistema não impede a sobreposição — confirme com quem organiza.`
        : `${nome} alocada em ${identificacaoDe(dormitorios, leitoId)} na ${rotuloDaNoite(noite)}.`,
    );
  };

  const liberar = (leitoId: string, noite: string, inscricaoId: string) => {
    setAlocacao((a) => {
      const noites = { ...(a[leitoId] ?? {}) };
      const restantes = (noites[noite] ?? []).filter((x) => x !== inscricaoId);
      if (restantes.length === 0) delete noites[noite];
      else noites[noite] = restantes;
      return { ...a, [leitoId]: noites };
    });
    setRecado(null);
  };

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
          valor={aba}
          onEscolher={(v) => {
            setAba(v);
            setEscolhendo(null);
            setRecado(null);
          }}
          densidade={densidade}
        />

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        {aba === 'mapa' ? (
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
                  valor={`${ocupadas} de ${vagas}`}
                  nota={`${capacidadeTotal} vagas em ${pluralizar(leitosAtivos.length, 'leito')} × ${eventoDoMapa.noites.length} noites`}
                  destaque
                />
                <Numero
                  rotulo="Ainda sem leito"
                  valor={String(semLeito.length)}
                  nota="pessoas que pediram beliche ou quarto"
                  cor={semLeito.length > 0 ? 'var(--color-pending)' : undefined}
                />
                <Numero rotulo="Dormem na igreja" valor={String(foraDoMapa.filter((x) => x.hospedagem === 'COLCHONETE').length)} nota="colchonete próprio, fora do mapa" />
              </div>
            </Cartao>

            <Grade
              dormitorios={dormitorios}
              densidade={densidade}
              ocupantesDe={ocupantesDe}
              escolhendo={escolhendo}
              onEscolher={(leitoId, noite) => {
                setEscolhendo({ leitoId, noite });
                setRecado(null);
              }}
              onFechar={() => setEscolhendo(null)}
              onLiberar={liberar}
              onAlocar={alocar}
              pendencias={pendencias}
            />

            <SemLeito lista={semLeito} densidade={densidade} />

            <ForaDoMapa densidade={densidade} />
          </>
        ) : (
          <Cadastro
            dormitorios={dormitorios}
            onMudar={setDormitorios}
            densidade={densidade}
            onRecado={setRecado}
            noitesOcupadas={(leitoId) =>
              Object.values(alocacao[leitoId] ?? {}).filter((pessoas) => pessoas.length > 0).length
            }
          />
        )}
      </div>
    </>
  );
}
