import { describe, expect, it } from 'vitest';
import type { PessoaId, TipoPessoa, UsuarioId } from '@cdd/contracts';
import { Pessoa } from './pessoa.js';

const ID = '0198a3c0-0000-7000-8000-000000000001' as PessoaId;
const AUTOR = '0198a3c0-0000-7000-8000-000000000002' as UsuarioId;
const EM = new Date('2026-10-30T12:00:00Z');
const dados = { nome: ' Pessoa de teste ', tipo: 'FISICA' as const, documento: '12345678901' };

function criar() {
  const resultado = Pessoa.cadastrar(ID, dados, AUTOR, EM);
  if (resultado.tipo === 'erro') throw new Error('fixture inválida');
  return resultado.valor;
}

describe('Pessoa mínima', () => {
  it.each([
    ['FISICA', '12345678901'], ['JURIDICA', '12345678901234'], ['FISICA', null], ['JURIDICA', null],
  ] as const)('cadastra %s com documento %s, ativa e na versão 1', (tipo, documento) => {
    const resultado = Pessoa.cadastrar(ID, { ...dados, tipo, documento }, AUTOR, EM);
    expect(resultado.tipo).toBe('ok');
    if (resultado.tipo === 'erro') return;
    expect(resultado.valor).toMatchObject({ id: ID, tipo, nome: 'Pessoa de teste', documento, ativa: true, versao: 1 });
  });

  it.each([
    { nome: '' }, { nome: '  ' }, { nome: 'a'.repeat(201) }, { nome: 'Pessoa\0' },
    { documento: '123.456.789-01' }, { documento: '' }, { documento: '1234567890' },
    { documento: '12345678901234' }, { tipo: 'JURIDICA' as const }, { tipo: 'OUTRO' as TipoPessoa },
  ])('recusa forma inválida no domínio: %j', (alteracao) => {
    const resultado = Pessoa.cadastrar(ID, { ...dados, ...alteracao }, AUTOR, EM);
    expect(resultado).toMatchObject({ tipo: 'erro', erro: { codigo: 'CORPO_INVALIDO' } });
  });

  it('edita tipo, nome e documento em conjunto e preserva id, situação e versão carregada', () => {
    const pessoa = criar();
    pessoa.retirarEventos();
    expect(pessoa.editar({ nome: ' Empresa ', tipo: 'JURIDICA', documento: '12345678901234' }, AUTOR, EM).tipo).toBe('ok');
    expect(pessoa).toMatchObject({ id: ID, nome: 'Empresa', tipo: 'JURIDICA', documento: '12345678901234', ativa: true, versao: 1 });
    expect(pessoa.retirarEventos()).toEqual([expect.objectContaining({ tipo: 'PESSOA_EDITADA', ocorridoEm: EM, dados: { pessoaId: ID, autorId: AUTOR } })]);
  });

  it('edição inválida não altera dados nem emite evento', () => {
    const pessoa = criar();
    pessoa.retirarEventos();
    expect(pessoa.editar({ nome: 'Outro', tipo: 'JURIDICA', documento: dados.documento }, AUTOR, EM).tipo).toBe('erro');
    expect(pessoa.nome).toBe('Pessoa de teste');
    expect(pessoa.tipo).toBe('FISICA');
    expect(pessoa.documento).toBe(dados.documento);
    expect(pessoa.retirarEventos()).toEqual([]);
  });

  it('evento de cadastro identifica autor e pessoa sem copiar nome ou documento', () => {
    const eventos = criar().retirarEventos();
    expect(eventos).toEqual([expect.objectContaining({ tipo: 'PESSOA_CADASTRADA', agregadoTipo: 'Pessoa', agregadoId: ID, ocorridoEm: EM, dados: { pessoaId: ID, autorId: AUTOR } })]);
    expect(JSON.stringify(eventos)).not.toContain(dados.documento);
    expect(JSON.stringify(eventos)).not.toContain('Pessoa de teste');
  });

  it('reconstitui sem emitir evento e permite remover o documento', () => {
    const pessoa = Pessoa.reconstituir({ ...dados, id: ID, ativa: false, versao: 4 });
    expect(pessoa.retirarEventos()).toEqual([]);
    expect(pessoa.editar({ ...dados, documento: null }, AUTOR, EM).tipo).toBe('ok');
    expect(pessoa).toMatchObject({ id: ID, ativa: false, versao: 4, documento: null });
  });
});
