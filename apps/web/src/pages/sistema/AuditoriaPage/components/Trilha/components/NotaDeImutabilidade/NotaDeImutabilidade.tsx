import { Aviso } from '@/ds';

export function NotaDeImutabilidade() {
  return (
    <Aviso tom="neutro">
      A trilha <b>só cresce</b>. Não há edição, não há exclusão e não há linha que não tenha autor e instante — nem
      para quem administra o sistema. Uma trilha que se pode apagar não serve para a conversa que ela existe para
      sustentar.
    </Aviso>
  );
}
