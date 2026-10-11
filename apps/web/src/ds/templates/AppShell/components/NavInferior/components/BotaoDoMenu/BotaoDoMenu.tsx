import type { MouseEvent } from 'react';
import { Icon } from '../../../../../../atoms/Icon';
import { ROTULO_DA_BARRA } from '../../constantes';
import { estiloDoBotaoDaBarra } from '../../utils/estiloDoBotaoDaBarra';

export function BotaoDoMenu({ aberto, ativo, aoAbrir }: { aberto: boolean; ativo: boolean; aoAbrir: () => void }) {
  const focarEAbrir = (evento: MouseEvent<HTMLButtonElement>) => {
    evento.currentTarget.focus();
    aoAbrir();
  };

  return (
    <button
      type="button"
      onClick={focarEAbrir}
      aria-haspopup="dialog"
      aria-expanded={aberto}
      style={estiloDoBotaoDaBarra(ativo)}
    >
      <Icon name="menu" size={20} />
      <span style={ROTULO_DA_BARRA}>Menu</span>
    </button>
  );
}
