import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Convite, FalhaDeConvite } from '@cdd/contracts';
import { Button, Icon, SkeletonList } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { formatarData } from '../../lib/formato';
import { motivoDoBloqueio, senhaAceita } from '../../lib/senha';
import { ROTAS, ROTAS_PUBLICAS } from '../../app/navegacao';
import { useSessao } from '../../app/sessao';
import { CONVITE_DEMONSTRACAO, buscarConvite, definirSenhaDoConvite } from '../../mocks/autenticacao';
import { Aviso } from './Aviso';
import { CampoDeSenha } from './CampoDeSenha';
import { Portao } from './Portao';

const ehFalha = (r: Convite | FalhaDeConvite): r is FalhaDeConvite => typeof r === 'string';

export function ConvitePage() {
  const densidade = useDensidade();
  const navigate = useNavigate();
  const { abrir } = useSessao();
  const [parametros] = useSearchParams();

  // Sem token o protótipo abre o convite de exemplo; em produção isso é 404.
  const token = parametros.get('token') ?? CONVITE_DEMONSTRACAO;

  const [carga, setCarga] = useState<Convite | FalhaDeConvite | null>(null);
  const [senha, setSenha] = useState('');
  const [repetida, setRepetida] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarga(null);
    void buscarConvite(token).then((r) => {
      if (vivo) setCarga(r);
    });
    return () => {
      vivo = false;
    };
  }, [token]);

  const confere = repetida.length === 0 || senha === repetida;
  const podeEnviar = senhaAceita(senha) && senha === repetida;

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    if (enviando || !podeEnviar) return;

    setEnviando(true);
    const resultado = await definirSenhaDoConvite(token, senha);
    if (resultado.ok) {
      // Quem define a senha já entra: pedir o login de novo agora seria pedir
      // duas vezes a mesma coisa.
      abrir(resultado.usuario);
      navigate(ROTAS.painel, { replace: true });
      return;
    }
    setEnviando(false);
  }

  if (carga === null) {
    return (
      <Portao titulo="Primeiro acesso" descricao="Abrindo o convite…">
        <SkeletonList rows={2} />
      </Portao>
    );
  }

  if (ehFalha(carga)) return <ConviteSemValor falha={carga} />;

  return (
    <Portao
      titulo={`Olá, ${primeiroNome(carga.nome)}`}
      descricao="Seu acesso já foi criado. Defina uma senha para entrar."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FichaDoConvite convite={carga} />

        <form onSubmit={submeter} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CampoDeSenha
            label="Crie sua senha"
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
            iconName="log-in"
            density={densidade}
            fullWidth
            disabled={!podeEnviar || enviando}
            blockedReason={motivoDoBloqueio(senha, repetida)}
          >
            {enviando ? 'Entrando…' : 'Definir senha e entrar'}
          </Button>
        </form>
      </div>
    </Portao>
  );
}

const primeiroNome = (nome: string) => nome.split(' ')[0] ?? nome;

/** O convite nasce de uma pessoa já cadastrada — mostrar isso evita o susto. */
function FichaDoConvite({ convite }: { convite: Convite }) {
  const linhas = [
    { icone: 'mail' as const, rotulo: 'Entra com', valor: convite.email },
    { icone: 'shield-half' as const, rotulo: 'Grupo', valor: convite.grupoNome },
    { icone: 'user-round' as const, rotulo: 'Quem convidou', valor: convite.convidadoPor },
  ];

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
    >
      {linhas.map((l) => (
        <div key={l.rotulo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name={l.icone} size={16} color="var(--color-royal)" />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', minWidth: 96 }}>{l.rotulo}</span>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{l.valor}</span>
        </div>
      ))}
      <div style={{ borderTop: 'var(--border-hairline)', paddingTop: 10, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        O convite vale até {formatarData(convite.expiraEm.slice(0, 10))}.
      </div>
    </div>
  );
}

function ConviteSemValor({ falha }: { falha: FalhaDeConvite }) {
  const texto = {
    INVALIDO: {
      titulo: 'Não encontramos este convite',
      corpo: 'O endereço pode ter vindo cortado do WhatsApp. Peça à secretaria para reenviar.',
    },
    EXPIRADO: {
      titulo: 'Este convite venceu',
      corpo: 'Convites valem por tempo limitado. A secretaria consegue reenviar um novo em um clique.',
    },
    JA_USADO: {
      titulo: 'Este convite já foi usado',
      corpo: 'A senha desta conta já foi definida. Entre normalmente, ou use “Esqueci minha senha”.',
    },
  }[falha];

  return (
    <Portao titulo="Primeiro acesso" volta={{ para: ROTAS_PUBLICAS.entrar, rotulo: 'Ir para a entrada' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Aviso tom={falha === 'JA_USADO' ? 'neutro' : 'atencao'} titulo={texto.titulo}>
          {texto.corpo}
        </Aviso>
        <Link to={ROTAS_PUBLICAS.esqueci} style={{ border: 0 }}>
          <Button variant="quiet" fullWidth iconName="key-round">
            Pedir um link de senha
          </Button>
        </Link>
      </div>
    </Portao>
  );
}
