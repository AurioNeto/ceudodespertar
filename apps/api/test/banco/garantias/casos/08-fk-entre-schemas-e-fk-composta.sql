-- verificacoes: 3
-- B0 · restrições de FK (Documento 7 §15): nenhuma FK cruza schema — cada
-- módulo referencia dentro do próprio schema, nunca direto para outro — e
-- toda FK entre duas tabelas que têm `instituicao_id` é composta com
-- `instituicao_id`, para não ser possível referenciar a tupla certa mas de
-- outra casa. Roda como dono, porque lê o catálogo (pg_constraint).

SELECT verif.confere('pg_constraint · nenhuma FK cruza schema',
  (SELECT count(*) FROM pg_constraint con
    JOIN pg_class     rel  ON rel.oid  = con.conrelid
    JOIN pg_namespace nrel ON nrel.oid = rel.relnamespace
    JOIN pg_class     fel  ON fel.oid  = con.confrelid
    JOIN pg_namespace nfel ON nfel.oid = fel.relnamespace
   WHERE con.contype = 'f'
     AND nrel.nspname IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
     AND nrel.nspname <> nfel.nspname), 0::bigint);

SELECT verif.confere('pg_constraint · toda FK entre tabelas com instituicao_id é composta (instituicao_id no conkey e no confkey)',
  (SELECT count(*) FROM pg_constraint con
    JOIN pg_class     rel  ON rel.oid  = con.conrelid
    JOIN pg_namespace nrel ON nrel.oid = rel.relnamespace
   WHERE con.contype = 'f'
     AND nrel.nspname IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
     AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = con.conrelid  AND a.attname = 'instituicao_id' AND NOT a.attisdropped)
     AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attname = 'instituicao_id' AND NOT a.attisdropped)
     AND (
       NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = con.conrelid  AND a.attname = 'instituicao_id' AND a.attnum = ANY (con.conkey))
       OR
       NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attname = 'instituicao_id' AND a.attnum = ANY (con.confkey))
     )), 0::bigint);

-- Evita vácuo silencioso e evita que uma FK composta seja removida sem que a
-- conferência perceba (a segunda conferência só reprova a FK que EXISTE e não
-- é composta — uma FK apagada some do pg_constraint e passa batida): fixa o
-- conjunto EXATO das FKs compostas do B0, um par (tabela filha → tabela mãe)
-- por linha.
SELECT verif.confere('pg_constraint · o conjunto exato de FKs compostas com instituicao_id é o esperado do B0',
  (SELECT array_agg(con.conrelid::regclass::text || ' → ' || con.confrelid::regclass::text
                     ORDER BY con.conrelid::regclass::text, con.confrelid::regclass::text)
     FROM pg_constraint con
     JOIN pg_class     rel  ON rel.oid  = con.conrelid
     JOIN pg_namespace nrel ON nrel.oid = rel.relnamespace
    WHERE con.contype = 'f'
      AND nrel.nspname IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = con.conrelid  AND a.attname = 'instituicao_id' AND NOT a.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attname = 'instituicao_id' AND NOT a.attisdropped)),
  ARRAY[
    'identidade.convite → identidade.usuario',
    'identidade.grupo_permissao → identidade.grupo',
    'identidade.usuario_grupo → identidade.grupo',
    'identidade.usuario_grupo → identidade.usuario'
  ]);
