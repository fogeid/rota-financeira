/**
 * Converte valores que podem vir como string (Decimal do Prisma serializado
 * em JSON), number, null ou undefined em um number seguro.
 * Retorna 0 como fallback se não for possível converter.
 */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Formata um valor (que pode vir como string ou number do Prisma) como
 * moeda brasileira. Exemplo: formatBRL(item.amount) → "R$ 150,00"
 */
export function formatBRL(value: unknown): string {
  return `R$ ${toNumber(value).toFixed(2).replace('.', ',')}`;
}

/**
 * Formata um valor numérico (que pode vir como string) com o número de
 * casas decimais especificado. Exemplo: formatNumber(item.liters, 1) → "40,5"
 */
export function formatNumber(value: unknown, decimals = 2): string {
  return toNumber(value).toFixed(decimals).replace('.', ',');
}
