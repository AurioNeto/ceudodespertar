import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { ROTAS_PUBLICAS } from '../../app/navegacao';
import { motivoDoBloqueio, senhaAceita } from '../../lib/senha';
import { redefinirSenha } from '../../mocks/autenticacao';
import { Aviso } from './Aviso';
import { CampoDeSenha } from './CampoDeSenha';
import { Portao } from './Portao';

export function RedefinirSenhaPage() {
  const densidade = useDensidade();
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';

  const [senha, setSenha] = useState('');
  const [repetida, setRepetida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);

  const confere = repetida.length === 0 || senha === repetida;
  const podeEnviar = senhaAceita(senha) && senha === repetida;

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    if (enviando || !podeEnviar) return;
    setEnviando(true);
    await redefinirSenha(token, senha);
    setEnviando(false);
    setPronto(true);
  }

  if (!token) {
    return (
      <Portao titulo="Link inválido" volta={{ para: ROTAS_PUBLICAS.entrar, rotulo: 'Voltar para a entrada' }}>
        <Aviso tom="atencao" titulo="Este link não serve mais">
          Ele pode ter expirado ou já ter sido usado. Peça um novo em “Esqueci minha senha”.
        </Aviso>
      </Portao>
    );
  }

  if (pronto) {
    return (
      <Portao titulo="Senha trocada">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Aviso tom="confirmado" titulo="Pronto — a senha nova já vale">
            As outras sessões abertas em outros aparelhos foram encerradas.
          </Aviso>
          <Link to={ROTAS_PUBLICAS.entrar} style={{ border: 0 }}>
            <Button iconName="log-in" density={densidade} fullWidth>
              Entrar com a senha nova
            </Button>
          </Link>
        </div>
      </Portao>
    );
  }

  return (
    <Portao
      titulo="Nova senha"
      descricao="Escolha uma senha que você não use em outro lugar."
      volta={{ para: ROTAS_PUBLICAS.entrar, rotulo: 'Voltar para a entrada' }}
    >
      <form onSubmit={submeter} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CampoDeSenha
          label="Senha nova"
          valor={senha}
          onChange={setSenha}
          densidade={densidade}
          autoComplete="new-password"
          autoFocus
          regras
        />

        <CampoDeSenha
          label="Repita a senha"
          valor={repetida}
          onChange={setRepetida}
          densidade={densidade}
          autoComplete="new-password"
          erro={confere ? undefined : 'As duas não são iguais.'}
        />

        <Button
          type="submit"
          iconName="key-round"
          density={densidade}
          fullWidth
          disabled={!podeEnviar || enviando}
          blockedReason={motivoDoBloqueio(senha, repetida)}
        >
          {enviando ? 'Trocando…' : 'Trocar a senha'}
        </Button>
      </form>
    </Portao>
  );
}
