import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, TextField } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { ROTAS_PUBLICAS } from '../../app/navegacao';
import { pedirRedefinicao } from '../../mocks/autenticacao';
import { Aviso } from './Aviso';
import { Portao } from './Portao';

export function EsqueciSenhaPage() {
  const densidade = useDensidade();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    if (enviando || email.trim().length === 0) return;
    setEnviando(true);
    await pedirRedefinicao(email);
    setEnviando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <Portao
        titulo="Link enviado"
        volta={{ para: ROTAS_PUBLICAS.entrar, rotulo: 'Voltar para a entrada' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/*
            A confirmação é deliberadamente vaga: dizer "esse e-mail não existe"
            entregaria quem tem acesso à casa, e a lista de quem frequenta o
            centro é dado sensível por si só (Doc 1 §5.6).
          */}
          <Aviso tom="confirmado" titulo="Se essa conta existir, o link já está a caminho">
            Enviamos para <b>{email}</b> um link de uma hora para definir uma senha nova. Confira também a caixa de
            spam.
          </Aviso>

          <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Não chegou? Fale com a secretaria — ela reenvia o convite ou corrige o e-mail do seu cadastro.
          </p>

          <Link to={`${ROTAS_PUBLICAS.redefinir}?token=link-do-email`} style={{ border: 0 }}>
            <Button variant="quiet" fullWidth density={densidade} iconName="arrow-right" iconAfter>
              Abrir o link (protótipo)
            </Button>
          </Link>
        </div>
      </Portao>
    );
  }

  return (
    <Portao
      titulo="Esqueci minha senha"
      descricao="Diga o e-mail com que você entra. Enviamos um link para definir uma senha nova."
      volta={{ para: ROTAS_PUBLICAS.entrar, rotulo: 'Voltar para a entrada' }}
    >
      <form onSubmit={submeter} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <TextField
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          density={densidade}
          autoComplete="username"
          inputMode="email"
          autoFocus
          placeholder="voce@ceudodespertar.org"
        />

        <Button
          type="submit"
          iconName="send"
          density={densidade}
          fullWidth
          disabled={email.trim().length === 0 || enviando}
        >
          {enviando ? 'Enviando…' : 'Enviar o link'}
        </Button>
      </form>
    </Portao>
  );
}
