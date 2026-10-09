import { describe, expect, it } from 'vitest';
import type { CodigoDeErro } from '@cdd/contracts';
import { ErroDaApi, ErroDeRede } from '../../dados/erros';
import {
  MENSAGEM_DE_INDISPONIBILIDADE_DE_ACESSOS,
  MENSAGEM_DE_REDE_DE_ACESSOS,
  MENSAGEM_GENERICA_DE_ACESSOS,
  mensagemDeErro,
} from './mensagemDeErroDeAcessos';

const erroDaApi = (codigo: CodigoDeErro, status = 409) => new ErroDaApi({ status, codigo });

describe('mensagemDeErro', () => {
  it.each<[CodigoDeErro, RegExp]>([
    ['ULTIMO_ADMINISTRADOR', /último administrador/],
    ['VERSAO_DESATUALIZADA', /Outra pessoa alterou este usuário/],
    ['SITUACAO_DO_USUARIO_NAO_PERMITE', /situação atual/],
    ['CONVITE_JA_USADO', /convite já foi usado/],
    ['GRUPO_INEXISTENTE', /grupos escolhidos não existe/],
    ['EMAIL_JA_CADASTRADO', /Já existe um usuário com este e-mail/],
    ['CONVITE_JA_PENDENTE', /convite pendente/],
    ['MOTIVO_OBRIGATORIO', /Informe o motivo/],
    ['MOTIVO_LONGO_DEMAIS', /500 caracteres/],
  ])('%s tem mensagem própria', (codigo, esperado) => {
    expect(mensagemDeErro(erroDaApi(codigo))).toMatch(esperado);
  });

  it('cada código tratado tem texto distinto', () => {
    const codigos: CodigoDeErro[] = [
      'ULTIMO_ADMINISTRADOR',
      'VERSAO_DESATUALIZADA',
      'SITUACAO_DO_USUARIO_NAO_PERMITE',
      'CONVITE_JA_USADO',
      'GRUPO_INEXISTENTE',
      'EMAIL_JA_CADASTRADO',
      'CONVITE_JA_PENDENTE',
      'MOTIVO_OBRIGATORIO',
      'MOTIVO_LONGO_DEMAIS',
    ];
    const textos = new Set(codigos.map((codigo) => mensagemDeErro(erroDaApi(codigo))));
    expect(textos.size).toBe(codigos.length);
  });

  it('erro de rede pede verificar a conexão', () => {
    expect(mensagemDeErro(new ErroDeRede(new TypeError('fetch failed')))).toBe(MENSAGEM_DE_REDE_DE_ACESSOS);
  });

  it.each([502, 503, 504])('HTTP %i vira indisponibilidade', (status) => {
    expect(mensagemDeErro(erroDaApi('SERVICO_INDISPONIVEL', status))).toBe(MENSAGEM_DE_INDISPONIBILIDADE_DE_ACESSOS);
  });

  it('código sem texto próprio e erro desconhecido caem no genérico sem vazar detalhe interno', () => {
    expect(mensagemDeErro(erroDaApi('ERRO_INTERNO', 500))).toBe(MENSAGEM_GENERICA_DE_ACESSOS);
    expect(mensagemDeErro(erroDaApi('GRUPO_PROTEGIDO'))).toBe(MENSAGEM_GENERICA_DE_ACESSOS);
    expect(mensagemDeErro(new Error('stack secreta'))).toBe(MENSAGEM_GENERICA_DE_ACESSOS);
    expect(mensagemDeErro('qualquer coisa')).toBe(MENSAGEM_GENERICA_DE_ACESSOS);
  });
});
