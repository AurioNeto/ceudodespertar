import { hoje } from '@/pages/mocks/relogio';
import {
  ANO_MAIS_ANTIGO_DE_NASCIMENTO,
  IDADE_MINIMA_PELO_LINK,
  MENSAGEM_DE_MENOR_PELO_LINK,
  MENSAGEM_DE_NASCIMENTO_INVALIDO,
} from '../constantes';

interface DiaDoCalendario {
  dia: number;
  mes: number;
  ano: number;
}

const DIA_MES_ANO = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const HOJE_DA_DEMONSTRACAO: DiaDoCalendario = {
  ano: Number(hoje.slice(0, 4)),
  mes: Number(hoje.slice(5, 7)),
  dia: Number(hoje.slice(8, 10)),
};

function lerDiaMesAno(texto: string): DiaDoCalendario | null {
  const achado = DIA_MES_ANO.exec(texto.trim());
  if (!achado) return null;
  const dia = Number(achado[1]);
  const mes = Number(achado[2]);
  const ano = Number(achado[3]);
  const data = new Date(ano, mes - 1, dia);
  const existe = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return existe && ano >= ANO_MAIS_ANTIGO_DE_NASCIMENTO ? { dia, mes, ano } : null;
}

const chave = ({ ano, mes, dia }: DiaDoCalendario) => ano * 10000 + mes * 100 + dia;

function idadeEm(nascimento: DiaDoCalendario, referencia: DiaDoCalendario): number {
  const fezAniversario = chave({ ...referencia, ano: nascimento.ano }) >= chave(nascimento);
  return referencia.ano - nascimento.ano - (fezAniversario ? 0 : 1);
}

export function erroDoNascimento(texto: string): string | undefined {
  if (!texto.trim()) return undefined;
  const nascimento = lerDiaMesAno(texto);
  if (!nascimento || chave(nascimento) > chave(HOJE_DA_DEMONSTRACAO)) return MENSAGEM_DE_NASCIMENTO_INVALIDO;
  return idadeEm(nascimento, HOJE_DA_DEMONSTRACAO) < IDADE_MINIMA_PELO_LINK ? MENSAGEM_DE_MENOR_PELO_LINK : undefined;
}
