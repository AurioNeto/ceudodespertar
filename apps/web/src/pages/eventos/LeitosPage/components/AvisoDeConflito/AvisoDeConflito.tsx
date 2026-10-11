import { Aviso } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { conflitoDeAgenda } from '../../mocks/leitos';
import { rotuloDaNoite } from '../../utils/noites';

export function AvisoDeConflito() {
  return (
    <Aviso tom="pendente" titulo={`Outro evento usa o mesmo local na ${rotuloDaNoite(conflitoDeAgenda.noite)}`}>
      <span style={{ display: 'block', maxWidth: '76ch' }}>
        <b>{conflitoDeAgenda.evento}</b>, em {conflitoDeAgenda.local}, ocupa cerca de{' '}
        {pluralizar(conflitoDeAgenda.leitosQueEleUsa, 'leito')} na mesma noite — e{' '}
        <b>o sistema não impede a sobreposição</b>. A conta de leitos é feita por evento, não pela casa inteira, e
        quem confere as duas agendas é gente.
      </span>
      <span style={{ display: 'block', marginTop: 7, color: 'var(--color-pending)' }}>
        As noites com conflito vêm marcadas na grade. Alocar continua permitido — só não continua silencioso.
      </span>
    </Aviso>
  );
}
