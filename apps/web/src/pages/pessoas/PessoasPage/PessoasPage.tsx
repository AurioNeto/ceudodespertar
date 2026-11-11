import { CorpoDaTela, ScreenHeader, useDensidade } from '@/ds';
import { CadastroDaApi } from '@/pages/components/CadastroDaApi';
import { CADASTRO_DE_PESSOAS } from './constantes';

export function PessoasPage() {
  const densidade = useDensidade();
  return (
    <>
      <ScreenHeader title="Pessoas" subtitle="Cadastro de pessoas físicas e jurídicas" density={densidade} />
      <CorpoDaTela densidade={densidade} larguraMaxima={1080}>
        <CadastroDaApi definicao={CADASTRO_DE_PESSOAS} />
      </CorpoDaTela>
    </>
  );
}
