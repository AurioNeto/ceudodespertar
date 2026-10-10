import { afterEach, describe, expect, it } from 'vitest';
import { PermissionDenied } from './PermissionDenied';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';
import { atributosComTexto } from '../../apoioDeTeste';

afterEach(desmontarTudo);

const raizDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div');
const paragrafosDe = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('p')).map((paragrafo) => paragrafo.textContent);

const FRASE_DO_BLOQUEIO = (
  <>
    Grupo <b>Voluntários</b>, chave <code>x.y.z</code>.
  </>
);

describe('PermissionDenied', () => {
  it('mostra o título e a explicação que o consumidor passa, nessa ordem', async () => {
    const { container } = await montar(<PermissionDenied title="Sem acesso ao Fechamento" description={FRASE_DO_BLOQUEIO} />);

    expect(container.textContent).toBe('Sem acesso ao FechamentoGrupo Voluntários, chave x.y.z.');
    expect(paragrafosDe(container)).toEqual(['Grupo Voluntários, chave x.y.z.']);
  });

  it('a marcação da explicação chega intacta: o negrito e o código são do consumidor', async () => {
    const { container } = await montar(<PermissionDenied title="T" description={FRASE_DO_BLOQUEIO} />);

    expect(elemento(container, 'b').textContent).toBe('Voluntários');
    expect(elemento(container, 'code').textContent).toBe('x.y.z');
  });

  it('textos vazios — o componente não escreve nenhum texto de acesso, nem em atributo', async () => {
    const { container } = await montar(<PermissionDenied title="" description="" />);

    expect(container.textContent).toBe('');
    expect(atributosComTexto(container)).toEqual([]);
  });

  it('sinaliza o bloqueio com o ícone ban', async () => {
    const { container } = await montar(<PermissionDenied title="T" description="D" />);

    expect(elemento<SVGElement>(container, 'svg').classList.contains('lucide-ban')).toBe(true);
  });

  it('style próprio — sobrepõe o fundo', async () => {
    const { container } = await montar(<PermissionDenied title="T" description="D" style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});
