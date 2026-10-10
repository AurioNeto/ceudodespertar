import { afterEach, describe, expect, it, vi } from 'vitest';
import { clicar, desmontarTudo, montar, todos } from '@/testes/montagem';
import { CalendarioMensal, LegendaDeTipos } from './CalendarioMensal';
import {
  chipDoCalendario,
  chipsDoCalendario,
  diasDaGrade,
  diasDestacadosComoHoje,
  nomesPorDiaNoCalendario,
  umTrabalho,
} from './apoioDeTeste';

afterEach(desmontarTudo);

describe('CalendarioMensal: cabeçalho e grade', () => {
  it('cabeçalho — os sete dias da semana, de domingo a sábado, abreviados em minúsculas', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={[]} onAbrir={() => undefined} />);

    const cabecalho = todos<HTMLSpanElement>(container, 'span')
      .filter((span) => span.style.textTransform === 'uppercase')
      .map((span) => span.textContent);

    expect(cabecalho).toEqual(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']);
  });

  it.each([
    { mes: 'setembro de 2026', ano: 2026, numero: 9, celulas: 35, colunaDoDia1: 2, ultimoDia: 30 },
    { mes: 'agosto de 2026 (começa no sábado, seis semanas)', ano: 2026, numero: 8, celulas: 42, colunaDoDia1: 6, ultimoDia: 31 },
    { mes: 'fevereiro de 2026 (começa no domingo, 28 dias: não completa linha extra)', ano: 2026, numero: 2, celulas: 28, colunaDoDia1: 0, ultimoDia: 28 },
    { mes: 'janeiro de 2026 (preenche as cinco semanas sem sobra)', ano: 2026, numero: 1, celulas: 35, colunaDoDia1: 4, ultimoDia: 31 },
    { mes: 'fevereiro de 2027 (28 dias, começa na segunda)', ano: 2027, numero: 2, celulas: 35, colunaDoDia1: 1, ultimoDia: 28 },
    { mes: 'fevereiro de 2028 (ano bissexto, 29 dias)', ano: 2028, numero: 2, celulas: 35, colunaDoDia1: 2, ultimoDia: 29 },
    { mes: 'dezembro de 2026', ano: 2026, numero: 12, celulas: 35, colunaDoDia1: 2, ultimoDia: 31 },
  ])('$mes — tem $celulas células, o dia 1 na coluna $colunaDoDia1 e termina no dia $ultimoDia', async ({ ano, numero, celulas, colunaDoDia1, ultimoDia }) => {
    const { container } = await montar(<CalendarioMensal ano={ano} mes={numero} trabalhos={[]} onAbrir={() => undefined} />);

    const grade = diasDaGrade(container);

    expect({
      celulas: grade.length,
      colunaDoDia1: grade.indexOf('1'),
      ultimoDia: Math.max(...grade.map(Number)),
    }).toEqual({ celulas, colunaDoDia1, ultimoDia });
  });

  it('dias do mês — aparecem em ordem, de 1 até o último, sem repetir nem pular', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={[]} onAbrir={() => undefined} />);

    expect(diasDaGrade(container).filter(Boolean)).toEqual(Array.from({ length: 30 }, (_, i) => String(i + 1)));
  });

  it('células fora do mês — não têm número e usam o fundo rebaixado, enquanto as do mês usam o fundo de cartão', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={[]} onAbrir={() => undefined} />);

    const celulas = todos<HTMLDivElement>(container, 'div[style*="min-height: 96px"]');

    expect([celulas[0]!.style.background, celulas[2]!.style.background]).toEqual(['var(--bg-sunken)', 'var(--bg-card)']);
  });

  it('última coluna da semana — fica sem borda à direita, as outras têm o fio', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={[]} onAbrir={() => undefined} />);

    const celulas = todos<HTMLDivElement>(container, 'div[style*="min-height: 96px"]');

    expect([celulas[5]!.style.borderRight, celulas[6]!.style.borderRight]).toEqual(['var(--border-hairline)', '0px']);
  });
});

describe('CalendarioMensal: hoje', () => {
  it('setembro de 2026 — só o dia 2 (hoje da demonstração) é destacado, em royal com texto invertido', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={[]} onAbrir={() => undefined} />);

    const numeroDeHoje = todos<HTMLSpanElement>(container, 'span').find((span) => span.textContent === '2')!;

    expect(diasDestacadosComoHoje(container)).toEqual(['2']);
    expect([numeroDeHoje.style.background, numeroDeHoje.style.color]).toEqual(['var(--color-royal)', 'var(--color-ink-inverse)']);
  });

  it.each([
    { quando: 'agosto de 2026', ano: 2026, mes: 8 },
    { quando: 'outubro de 2026', ano: 2026, mes: 10 },
    { quando: 'setembro de 2025 (mesmo dia e mês, outro ano)', ano: 2025, mes: 9 },
    { quando: 'setembro de 2027 (mesmo dia e mês, outro ano)', ano: 2027, mes: 9 },
  ])('$quando — nenhum dia é destacado como hoje', async ({ ano, mes }) => {
    const { container } = await montar(<CalendarioMensal ano={ano} mes={mes} trabalhos={[]} onAbrir={() => undefined} />);

    expect(diasDestacadosComoHoje(container)).toEqual([]);
  });

  it('dia que não é hoje — usa o texto de meta e fundo transparente', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={[]} onAbrir={() => undefined} />);

    const outroDia = todos<HTMLSpanElement>(container, 'span').find((span) => span.textContent === '3')!;

    expect([outroDia.style.background, outroDia.style.color]).toEqual(['transparent', 'var(--text-meta)']);
  });
});

describe('CalendarioMensal: chips dos trabalhos', () => {
  const trabalhos = [
    umTrabalho({ id: 1, nome: 'Primeiro do dia 5', dia: 5 }),
    umTrabalho({ id: 2, nome: 'Segundo do dia 5', dia: 5, horario: '19:00 às 21:00' }),
    umTrabalho({ id: 3, nome: 'Do dia 20', dia: 20 }),
    umTrabalho({ id: 4, nome: 'De outubro', mes: 10, dia: 5 }),
    umTrabalho({ id: 5, nome: 'De setembro de 2025', ano: 2025, dia: 5 }),
    umTrabalho({ id: 6, nome: 'Dia 31 de setembro', dia: 31 }),
  ];

  it('mês aberto — mostra só os trabalhos daquele mês e ano, cada um no seu dia, na ordem recebida', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={trabalhos} onAbrir={() => undefined} />);

    expect(nomesPorDiaNoCalendario(container)).toEqual({
      '5': ['Primeiro do dia 5', 'Segundo do dia 5'],
      '20': ['Do dia 20'],
    });
  });

  it('trabalho com dia que o mês não tem (31 de setembro) — não aparece em lugar nenhum', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={trabalhos} onAbrir={() => undefined} />);

    expect(chipsDoCalendario(container).map((chip) => chip.textContent)).not.toContain('Dia 31 de setembro');
  });

  it('outro mês e outro ano — cada um mostra apenas os seus trabalhos', async () => {
    const outubro = await montar(<CalendarioMensal ano={2026} mes={10} trabalhos={trabalhos} onAbrir={() => undefined} />);
    const setembroDe2025 = await montar(<CalendarioMensal ano={2025} mes={9} trabalhos={trabalhos} onAbrir={() => undefined} />);

    expect(nomesPorDiaNoCalendario(outubro.container)).toEqual({ '5': ['De outubro'] });
    expect(nomesPorDiaNoCalendario(setembroDe2025.container)).toEqual({ '5': ['De setembro de 2025'] });
  });

  it('chip — o title junta o nome e o horário', async () => {
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={trabalhos} onAbrir={() => undefined} />);

    expect(chipDoCalendario(container, 'Segundo do dia 5').title).toBe('Segundo do dia 5 · 19:00 às 21:00');
  });

  it('clicar no chip — chama onAbrir uma vez, com o id daquele trabalho', async () => {
    const aoAbrir = vi.fn();
    const { container } = await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={trabalhos} onAbrir={aoAbrir} />);

    await clicar(chipDoCalendario(container, 'Do dia 20'));

    expect(aoAbrir).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('abrir o calendário — não chama onAbrir sozinho', async () => {
    const aoAbrir = vi.fn();

    await montar(<CalendarioMensal ano={2026} mes={9} trabalhos={trabalhos} onAbrir={aoAbrir} />);

    expect(aoAbrir).not.toHaveBeenCalled();
  });

  it.each([
    { tipo: 'Concentração' as const, cor: 'oklch(0.52 0.13 265)' },
    { tipo: 'Trabalho de cura' as const, cor: 'oklch(0.64 0.12 155)' },
    { tipo: 'Feitio' as const, cor: 'oklch(0.72 0.13 90)' },
    { tipo: 'Bailado' as const, cor: 'oklch(0.58 0.15 25)' },
    { tipo: 'Reunião do corpo' as const, cor: 'oklch(0.62 0.11 205)' },
  ])('trabalho do tipo $tipo — o chip usa a cor $cor com texto branco e sem risco', async ({ tipo, cor }) => {
    const { container } = await montar(
      <CalendarioMensal ano={2026} mes={9} trabalhos={[umTrabalho({ tipo, nome: 'Qualquer' })]} onAbrir={() => undefined} />,
    );

    const chip = chipDoCalendario(container, 'Qualquer');

    expect([chip.style.background, chip.style.color, chip.style.textDecoration]).toEqual([cor, 'rgb(255, 255, 255)', 'none']);
  });

  it.each([
    { situacao: 'planejada' as const },
    { situacao: 'confirmada' as const },
    { situacao: 'realizada' as const },
  ])('situação $situacao — o chip mantém a cor do tipo, sem risco', async ({ situacao }) => {
    const { container } = await montar(
      <CalendarioMensal ano={2026} mes={9} trabalhos={[umTrabalho({ situacao, nome: 'Qualquer' })]} onAbrir={() => undefined} />,
    );

    const chip = chipDoCalendario(container, 'Qualquer');

    expect([chip.style.background, chip.style.textDecoration]).toEqual(['oklch(0.52 0.13 265)', 'none']);
  });

  it('situação cancelada — o chip fica riscado, com fundo neutro e texto de meta, qualquer que seja o tipo', async () => {
    const { container } = await montar(
      <CalendarioMensal
        ano={2026}
        mes={9}
        trabalhos={[umTrabalho({ situacao: 'cancelada', tipo: 'Bailado', nome: 'Qualquer' })]}
        onAbrir={() => undefined}
      />,
    );

    const chip = chipDoCalendario(container, 'Qualquer');

    expect([chip.style.background, chip.style.color, chip.style.textDecoration]).toEqual([
      'var(--color-neutral-soft)',
      'var(--text-meta)',
      'line-through',
    ]);
  });

  it('trabalho cancelado — continua clicável e abre pelo mesmo id', async () => {
    const aoAbrir = vi.fn();
    const { container } = await montar(
      <CalendarioMensal ano={2026} mes={9} trabalhos={[umTrabalho({ id: 9, situacao: 'cancelada', nome: 'Qualquer' })]} onAbrir={aoAbrir} />,
    );

    await clicar(chipDoCalendario(container, 'Qualquer'));

    expect(aoAbrir).toHaveBeenCalledExactlyOnceWith(9);
  });
});

describe('LegendaDeTipos', () => {
  it('legenda — os cinco tipos na ordem do mapa de cores', async () => {
    const { container } = await montar(<LegendaDeTipos />);

    expect(container.textContent).toBe('ConcentraçãoTrabalho de curaFeitioBailadoReunião do corpo');
  });

  it('legenda — cada tipo traz o quadradinho na mesma cor do chip', async () => {
    const { container } = await montar(<LegendaDeTipos />);

    const cores = todos<HTMLSpanElement>(container, 'span[style*="width: 10px"]').map((quadrado) => quadrado.style.background);

    expect(cores).toEqual([
      'oklch(0.52 0.13 265)',
      'oklch(0.64 0.12 155)',
      'oklch(0.72 0.13 90)',
      'oklch(0.58 0.15 25)',
      'oklch(0.62 0.11 205)',
    ]);
  });
});
