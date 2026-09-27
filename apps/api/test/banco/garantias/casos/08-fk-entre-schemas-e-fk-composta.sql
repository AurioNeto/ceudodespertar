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

-- Evita vácuo silencioso: o B0 já tem FKs compostas de verdade (usuario_grupo
-- → usuario, usuario_grupo → grupo, convite → usuario, grupo_permissao →
-- grupo) — a segunda conferência tem que estar examinando pelo menos essas.
SELECT verif.confere('pg_constraint · há FKs compostas com instituicao_id para a conferência examinar (não é vácuo)',
  (SELECT count(*) > 0 FROM pg_constraint con
    JOIN pg_class     rel  ON rel.oid  = con.conrelid
    JOIN pg_namespace nrel ON nrel.oid = rel.relnamespace
   WHERE con.contype = 'f'
     AND nrel.nspname IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
     AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = con.conrelid  AND a.attname = 'instituicao_id' AND NOT a.attisdropped)
     AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attname = 'instituicao_id' AND NOT a.attisdropped)),
  true);
