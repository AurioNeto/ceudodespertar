import { Aviso } from '../Aviso';

export function Recado({ texto, onFechar }: { texto: string; onFechar: () => void }) {
  return (
    <Aviso tom="confirmado" role="status" aoFechar={onFechar} rotuloDeFechar="fechar recado">
      {texto}
    </Aviso>
  );
}
