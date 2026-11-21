import { useNavigate } from 'react-router-dom';
import { Aviso, Button } from '@/ds';
import { ROTAS } from '@/app/rotas';
import { remessasEmLote } from '../../mocks/resumoFinanceiro';
import { filaDeVerificacaoInicial } from '@/mocks/verificacao';
import { pluralizar } from '@/pages/utils/formato';

export function AvisoDeLote() {
  const navigate = useNavigate();

  return (
    <Aviso
      tom="pendente"
      titulo={
        <>
          {filaDeVerificacaoInicial.length} lançamentos em lote aguardando verificação —{' '}
          {pluralizar(remessasEmLote, 'remessa')} de comprovantes
        </>
      }
      acao={<Button onClick={() => navigate(ROTAS.lote)}>Verificar lote</Button>}
    >
      A IA leu os comprovantes e propôs valor, data e categoria — uma pessoa precisa verificar antes de consolidar.
      Lançamento feito à mão já entra consolidado.
    </Aviso>
  );
}
