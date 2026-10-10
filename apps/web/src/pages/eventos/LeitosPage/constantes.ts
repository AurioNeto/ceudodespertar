import type { TipoLeito } from '@cdd/contracts';

export const TIPO_LEITO_ROTULO: Record<TipoLeito, string> = {
  BELICHE_SUPERIOR: 'Beliche superior',
  BELICHE_INFERIOR: 'Beliche inferior',
  CAMA_SOLTEIRO: 'Cama de solteiro',
  CAMA_CASAL: 'Cama de casal',
  QUARTO_PRIVATIVO: 'Quarto privativo',
};
