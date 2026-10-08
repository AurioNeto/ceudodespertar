import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CODIGOS_DE_ERRO } from '@cdd/contracts';
import { STATUS_POR_CODIGO } from '../../src/shared/infrastructure/http/status-por-codigo.js';
import { RESTRICAO_PARA_CODIGO } from '../../src/shared/infrastructure/http/restricao-para-codigo.js';
import { CODIGOS_DE_GUARDA_MINIMA } from '../../src/shared/infrastructure/http/guardas-minimas-do-banco.js';

const DIRETORIO_DO_TESTE = dirname(fileURLToPath(import.meta.url));
const DIRETORIO_DAS_MIGRACOES = join(DIRETORIO_DO_TESTE, '..', '..', 'src', 'banco', 'migracoes');

const RESTRICOES_QUE_O_DOMINIO_MAPEIA_NO_B0: readonly string[] = [
  'usuario_email_unico',
  'usuario_pessoa_unica',
  'grupo_nome_unico',
  'convite_vigente_unico',
  'usuario_grupo_grupo_fk',
];

const RESTRICOES_SEM_CODIGO_POR_SEREM_GUARDA_INTERNA_DO_BANCO: readonly string[] = [
  'convite_nao_usado_e_revogado',
  'autor_coerente',
  'registro_de_auditoria_operacao_check',
];

function arquivosSqlDeMigracaoRecursivos(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name);
    return entrada.isDirectory()
      ? arquivosSqlDeMigracaoRecursivos(caminho)
      : entrada.name.endsWith('.sql') && entrada.name !== 'desfazer.sql'
        ? [caminho]
        : [];
  });
}

function semComentarios(sql: string): string {
  return sql.replace(/--.*$/gm, '');
}

function conteudoDasMigracoesDeSubida(): string {
  return arquivosSqlDeMigracaoRecursivos(DIRETORIO_DAS_MIGRACOES)
    .map((caminho) => semComentarios(readFileSync(caminho, 'utf8')))
    .join('\n');
}

function restricoesNomeadas(sql: string): Set<string> {
  const nomes = new Set<string>();
  for (const casamento of sql.matchAll(/\bCREATE\s+UNIQUE\s+INDEX\s+(\w+)/gi)) {
    nomes.add(casamento[1] as string);
  }
  const renomeacao = /\bRENAME\s+CONSTRAINT\s+\w+\s+TO\s+(\w+)/gi;
  for (const casamento of sql.matchAll(renomeacao)) {
    nomes.add(casamento[1] as string);
  }
  for (const casamento of sql.replace(renomeacao, '').matchAll(/\bCONSTRAINT\s+(\w+)/gi)) {
    nomes.add(casamento[1] as string);
  }
  return nomes;
}

function prefixosDeGuardaMinima(sql: string): Set<string> {
  const prefixos = new Set<string>();
  for (const casamento of sql.matchAll(/\bRAISE\s+EXCEPTION\s+'([A-Z_]+):/gi)) {
    prefixos.add(casamento[1] as string);
  }
  for (const casamento of sql.matchAll(/\bUSING\s+MESSAGE\s*=\s*'([A-Z_]+):/gi)) {
    prefixos.add(casamento[1] as string);
  }
  return prefixos;
}

describe('catálogo de erros — contrato (Documento 7 §12)', () => {
  const sqlDasMigracoesDeSubida = conteudoDasMigracoesDeSubida();
  const restricoesDasMigracoes = restricoesNomeadas(sqlDasMigracoesDeSubida);

  it('todo código do catálogo tem um status HTTP inteiro no mapa', () => {
    for (const codigo of CODIGOS_DE_ERRO) {
      expect(Number.isInteger(STATUS_POR_CODIGO[codigo])).toBe(true);
    }
  });

  it('fixa os status decididos para identidade e para o corpo da requisição', () => {
    const decididos = {
      USUARIO_CONVITE_PENDENTE: 401,
      USUARIO_SUSPENSO: 401,
      USUARIO_REVOGADO: 401,
      USUARIO_DESCONHECIDO: 401,
      SITUACAO_DO_USUARIO_NAO_PERMITE: 409,
      GRUPO_PROTEGIDO: 409,
      GRUPO_JA_EXISTE: 409,
      CONVITE_JA_PENDENTE: 409,
      CORPO_GRANDE_DEMAIS: 413,
      VERSAO_DESATUALIZADA: 409,
      VERSAO_OBRIGATORIA: 428,
      ERRO_INTERNO: 500,
    } as const;
    for (const [codigo, status] of Object.entries(decididos)) {
      expect(STATUS_POR_CODIGO[codigo as keyof typeof decididos], codigo).toBe(status);
    }
  });

  it('o mapa de status não tem código a mais nem a menos que o catálogo', () => {
    expect(Object.keys(STATUS_POR_CODIGO).toSorted()).toStrictEqual([...CODIGOS_DE_ERRO].toSorted());
  });

  it('toda restrição nomeada que o domínio mapeia neste B0 tem entrada em RESTRICAO_PARA_CODIGO', () => {
    for (const restricao of RESTRICOES_QUE_O_DOMINIO_MAPEIA_NO_B0) {
      expect(restricoesDasMigracoes.has(restricao)).toBe(true);
      expect(RESTRICAO_PARA_CODIGO[restricao]).toBeDefined();
    }
  });

  it('as restrições do mapa existem, com esse nome exato, nas migrations de subida (fora comentário e desfazer.sql)', () => {
    for (const restricao of Object.keys(RESTRICAO_PARA_CODIGO)) {
      expect(restricoesDasMigracoes.has(restricao)).toBe(true);
    }
  });

  it('cada código do mapa de restrições existe no catálogo de códigos de erro', () => {
    for (const codigo of Object.values(RESTRICAO_PARA_CODIGO)) {
      expect(CODIGOS_DE_ERRO).toContain(codigo);
    }
  });

  it('toda restrição com nome explícito nas migrations (CONSTRAINT ou CREATE UNIQUE INDEX; as de nome automático, como _pkey e _fkey, ficam de fora) tem código no mapa ou está na lista explícita de sem-código', () => {
    const semCodigo = new Set(RESTRICOES_SEM_CODIGO_POR_SEREM_GUARDA_INTERNA_DO_BANCO);

    for (const restricao of restricoesDasMigracoes) {
      const temCodigo = RESTRICAO_PARA_CODIGO[restricao] !== undefined;
      const eSemCodigoDocumentado = semCodigo.has(restricao);

      expect(temCodigo || eSemCodigoDocumentado, `${restricao} não está no mapa nem na lista de sem-código`).toBe(
        true,
      );
    }
  });

  it('a lista de restrições sem código é exatamente a das restrições com nome explícito que não estão no mapa', () => {
    const semMapa = [...restricoesDasMigracoes].filter((restricao) => RESTRICAO_PARA_CODIGO[restricao] === undefined);

    expect(semMapa.toSorted()).toStrictEqual([...RESTRICOES_SEM_CODIGO_POR_SEREM_GUARDA_INTERNA_DO_BANCO].toSorted());
  });

  it('todo prefixo de guarda mínima usado nas migrations (RAISE EXCEPTION ou USING MESSAGE) está na lista de guardas mínimas', () => {
    const prefixosUsados = prefixosDeGuardaMinima(sqlDasMigracoesDeSubida);

    expect(prefixosUsados.size).toBeGreaterThan(0);
    for (const prefixo of prefixosUsados) {
      expect(CODIGOS_DE_GUARDA_MINIMA).toContain(prefixo);
    }
  });
});
