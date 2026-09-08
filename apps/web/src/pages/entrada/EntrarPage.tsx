import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { FalhaDeEntrada } from '@cdd/contracts';
import { Button, TextField } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { ROTAS, ROTAS_PUBLICAS } from '../../app/navegacao';
import { useSessao } from '../../app/sessao';
import { CONTA_DEMONSTRACAO, CONVITE_DEMONSTRACAO, entrar } from '../../mocks/autenticacao';
import { Aviso } from './Aviso';
import { CampoDeSenha } from './CampoDeSenha';
import { Portao } from './Portao';

export function EntrarPage() {
  const densidade = useDensidade();
  const { usuario, abrir } = useSessao();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<FalhaDeEntrada | null>(null);

  const destino = (location.state as { de?: string } | null)?.de ?? ROTAS.painel;
  const podeEnviar = email.trim().length > 0 && senha.length > 0;

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    if (enviando || !podeEnviar) return;

    setEnviando(true);
    setFalha(null);

    const resultado = await entrar({ email, senha });
    if (resultado.ok) {
      abrir(resultado.usuario);
      navigate(destino, { replace: true });
      return;
    }

    setFalha(resultado.falha);
    setSenha('');
    setEnviando(false);
  }

  // Quem já entrou não volta para o formulário — inclusive no botão "voltar".
  if (usuario) return <Navigate to={destino} replace />;

  return (
    <Portao titulo="Entrar" descricao="O acesso é pessoal: cada lançamento fica no nome de quem o registrou.">
      <form onSubmit={submeter} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {falha ? <FalhaNaEntrada falha={falha} /> : null}

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

        <CampoDeSenha label="Senha" valor={senha} onChange={setSenha} densidade={densidade} />

        <Button
          type="submit"
          iconName="log-in"
          density={densidade}
          fullWidth
          disabled={!podeEnviar || enviando}
          style={{ marginTop: 2 }}
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link to={ROTAS_PUBLICAS.esqueci} style={{ font: 'var(--text-small)', border: 0 }}>
            Esqueci minha senha
          </Link>
        </div>
      </form>

      <DicaDoPrototipo
        onPreencher={() => {
          setEmail(CONTA_DEMONSTRACAO.email);
          setSenha(CONTA_DEMONSTRACAO.senha);
          setFalha(null);
        }}
      />
    </Portao>
  );
}

function FalhaNaEntrada({ falha }: { falha: FalhaDeEntrada }) {
  switch (falha.tipo) {
    case 'CREDENCIAL_INVALIDA':
      return (
        <Aviso tom="atencao" titulo="E-mail ou senha não conferem">
          Confira o e-mail e digite a senha de novo. Se você nunca definiu uma, entre pelo link do convite que a
          secretaria enviou.
        </Aviso>
      );

    case 'CONVITE_PENDENTE':
      return (
        <Aviso
          tom="pendente"
          titulo="Este acesso ainda não tem senha"
          acao={
            <Link to={`${ROTAS_PUBLICAS.convite}?token=${CONVITE_DEMONSTRACAO}`} style={{ border: 0 }}>
              <Button variant="ghost" iconName="key-round">
                Definir minha senha
              </Button>
            </Link>
          }
        >
          O convite para <b>{falha.email}</b> foi enviado, mas ninguém definiu a senha ainda.
        </Aviso>
      );

    case 'SUSPENSO':
      return (
        <Aviso tom="atencao" titulo="Seu acesso está suspenso">
          A conta existe e o histórico está guardado, mas a entrada está bloqueada. Fale com a direção ou com um
          administrador para reativar.
        </Aviso>
      );

    case 'REVOGADO':
      return (
        <Aviso tom="neutro" titulo="Este acesso foi revogado">
          Os lançamentos feitos por esta pessoa continuam no sistema — o que saiu foi a entrada. Se isso é engano, um
          administrador consegue conceder o acesso de novo.
        </Aviso>
      );

    case 'INFRAESTRUTURA':
      return (
        <Aviso tom="atencao" titulo="Não deu para verificar sua entrada">
          O sistema não respondeu. Tente de novo em alguns instantes.
        </Aviso>
      );
  }
}

/** Sai junto com o mock de autenticação, no dia em que o Keycloak entrar. */
function DicaDoPrototipo({ onPreencher }: { onPreencher: () => void }) {
  return (
    <div
      style={{
        marginTop: 26,
        paddingTop: 16,
        borderTop: '1px dashed var(--color-line-gold)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div
          style={{
            font: 'var(--text-label)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--text-field-label)',
          }}
        >
          Protótipo
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Ainda não há Keycloak: entre com <code>{CONTA_DEMONSTRACAO.email}</code> e a senha{' '}
          <code>{CONTA_DEMONSTRACAO.senha}</code>.
        </p>
      </div>
      <Button variant="quiet" onClick={onPreencher}>
        Preencher
      </Button>
    </div>
  );
}
