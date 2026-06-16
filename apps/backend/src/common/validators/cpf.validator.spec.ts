import { cleanCpf, isValidCpf } from './cpf.validator';

describe('isValidCpf', () => {
  it('aceita CPF válido formatado', () => {
    expect(isValidCpf('111.444.777-35')).toBe(true);
  });

  it('aceita CPF válido sem formatação', () => {
    expect(isValidCpf('11144477735')).toBe(true);
  });

  it('rejeita CPF com dígito verificador inválido', () => {
    expect(isValidCpf('111.444.777-36')).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
  });

  it('rejeita CPF com quantidade de dígitos incorreta', () => {
    expect(isValidCpf('123456')).toBe(false);
    expect(isValidCpf('111444777350')).toBe(false);
  });

  it('rejeita valores que não são string', () => {
    expect(isValidCpf(11144477735 as unknown as string)).toBe(false);
  });
});

describe('cleanCpf', () => {
  it('remove pontos e hífen, retornando apenas os dígitos', () => {
    expect(cleanCpf('111.444.777-35')).toBe('11144477735');
  });

  it('mantém o valor inalterado se já estiver limpo', () => {
    expect(cleanCpf('11144477735')).toBe('11144477735');
  });
});
