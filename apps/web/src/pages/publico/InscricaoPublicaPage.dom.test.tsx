import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { TEXTO_DA_FAIXA_DE_DEMONSTRACAO } from '../../ds';
import '../../app/apoioDeTeste';
import { InscricaoPublicaPage } from './InscricaoPublicaPage';

describe('InscricaoPublicaPage', () => {
  it('mostra a faixa de demonstração', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const raiz = createRoot(container);
    await act(async () => {
      raiz.render(
        <MemoryRouter>
          <InscricaoPublicaPage />
        </MemoryRouter>,
      );
    });

    const faixa = container.querySelector('[role="note"]');
    expect(faixa?.textContent).toBe(TEXTO_DA_FAIXA_DE_DEMONSTRACAO);

    await act(async () => {
      raiz.unmount();
    });
    container.remove();
  });
});
