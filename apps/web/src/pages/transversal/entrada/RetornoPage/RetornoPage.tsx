import { Button, Portao, SkeletonList } from '@/ds';
import { MensagemDeEntradaNaTela } from '../components/MensagemDeEntradaNaTela';
import { MENSAGEM_DE_ERRO_NO_RETORNO } from './constantes';
import { useConclusaoDoRetorno } from './hooks/useConclusaoDoRetorno';

export function RetornoPage() {
  const { densidade, situacao, voltarParaAEntrada } = useConclusaoDoRetorno();

  if (situacao === 'falhou') {
    return (
      <Portao titulo="Entrar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <MensagemDeEntradaNaTela mensagem={MENSAGEM_DE_ERRO_NO_RETORNO} />
          <Button
            iconName="log-in"
            density={densidade}
            fullWidth
            onClick={voltarParaAEntrada}
          >
            Voltar para a entrada
          </Button>
        </div>
      </Portao>
    );
  }

  return (
    <Portao titulo="Entrando" descricao="Concluindo o seu acesso…">
      <SkeletonList rows={2} />
    </Portao>
  );
}
