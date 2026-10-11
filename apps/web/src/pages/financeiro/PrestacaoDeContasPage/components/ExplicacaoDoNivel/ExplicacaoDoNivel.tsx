import { Aviso } from '@/ds';
import type { NivelDeDetalhe } from '../../mocks/prestacao';

export function ExplicacaoDoNivel({ nivel, suprimidas }: { nivel: NivelDeDetalhe; suprimidas: number }) {
  const resumo = nivel === 'RESUMO';
  return (
    <Aviso tom={resumo ? 'confirmado' : 'pendente'}>
      {resumo ? (
        <>
          <b>Nomes de pessoas físicas não aparecem.</b> {suprimidas} linhas deste período trocam o nome pelo agregado —
          “empréstimo concedido a Fulano” vira “empréstimos concedidos”. Presta a mesma conta sem expor ninguém, e é o
          nível que se entrega a quem pede.
        </>
      ) : (
        <>
          <b>Este nível mostra nomes e é de uso interno.</b> Fica restrito a administração, tesouraria e governança —
          não é o documento que se entrega na assembleia.
        </>
      )}
    </Aviso>
  );
}
