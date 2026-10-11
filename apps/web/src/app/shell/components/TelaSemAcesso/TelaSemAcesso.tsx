import { PermissionDenied, ScreenHeader, type Density } from '@/ds';

export interface TelaSemAcessoProps {
  readonly nomeDaTela: string;
  readonly grupoNome: string;
  readonly permissaoQueFalta: string;
  readonly densidade: Density;
}

export function TelaSemAcesso({ nomeDaTela, grupoNome, permissaoQueFalta, densidade }: TelaSemAcessoProps) {
  return (
    <>
      <ScreenHeader title={nomeDaTela} density={densidade} />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
        <PermissionDenied
          title={`Você não tem acesso a ${nomeDaTela}`}
          description={
            <>
              Seu grupo é <b>{grupoNome}</b>. Falta a permissão <code>{permissaoQueFalta}</code>. Se
              você precisa desse acesso, fale com o administrador.
            </>
          }
        />
      </div>
    </>
  );
}
