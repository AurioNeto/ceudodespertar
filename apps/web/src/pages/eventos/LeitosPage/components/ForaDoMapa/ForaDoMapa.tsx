import { Cartao, ListaDividida, Rotulo, type Density } from '@/ds';
import { foraDoMapa } from '../../mocks/leitos';

export interface ForaDoMapaProps {
  densidade: Density;
}

export function ForaDoMapa({ densidade }: ForaDoMapaProps) {
  return (
    <Cartao density={densidade} style={{ gap: 10 }}>
      <Rotulo>Dormem na casa e não ocupam leito</Rotulo>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Estão aqui porque a operação precisa contá-los — café da manhã, espaço no salão, quem está na chácara à noite
        —, e não estão na grade porque não há leito a alocar.
      </span>
      <ListaDividida itens={foraDoMapa} chave={(x) => x.nome}>
        {(x) => (
          <>
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 140 }}>
              {x.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 2, minWidth: 200 }}>
              {x.razao}
            </span>
          </>
        )}
      </ListaDividida>
    </Cartao>
  );
}
