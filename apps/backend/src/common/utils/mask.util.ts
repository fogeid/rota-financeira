/**
 * Mascaramento de dados sensíveis para respostas de API —
 * docs/04-API-SPEC.md (GET /users/me) e docs/05-SECURITY.md seção 2.
 */

/** "12345678909" -> "***.456.***-**" */
export function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  const middle = digits.slice(3, 6);
  return `***.${middle}.***-**`;
}

/** "carlos@email.com" -> "c***@email.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) {
    return '***';
  }
  return `${local.charAt(0)}***@${domain}`;
}

/** "+5511999998888" -> "+55119****8888" */
export function maskPhone(phone: string): string {
  if (phone.length <= 10) {
    return '*'.repeat(phone.length);
  }
  const start = phone.slice(0, 6);
  const end = phone.slice(-4);
  return `${start}****${end}`;
}
