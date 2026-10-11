import { Icon } from '@/ds';
import type { NivelDeDetalhe } from '../../mocks/prestacao';

export function ExplicacaoDoNivel({ nivel, suprimidas }: { nivel: NivelDeDetalhe; suprimidas: number }) {
  const resumo = nivel === 'RESUMO';
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        background: resumo ? 'var(--color-confirmed-soft)' : 'var(--color-pending-soft)',
        border: `1px solid ${resumo ? 'var(--color-confirmed-border)' : 'var(--color-pending-border)'}`,
        borderRadius: 'var(--radius)',
        padding: '11px 14px',
      }}
    >
      <Icon
        name={resumo ? 'shield-half' : 'triangle-alert'}
        size={17}
        color={resumo ? 'var(--color-confirmed)' : 'var(--color-pending)'}
        style={{ marginTop: 1 }}
      />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
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
      </span>
    </div>
  );
}
