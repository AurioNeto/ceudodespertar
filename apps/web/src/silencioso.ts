import { UserManager } from 'oidc-client-ts';
import { configuracaoOidc, lerAmbienteOidc } from './dados/oidc';

const gerenciador = new UserManager(configuracaoOidc(lerAmbienteOidc(import.meta.env, window.location.origin)));

void gerenciador.signinSilentCallback();
