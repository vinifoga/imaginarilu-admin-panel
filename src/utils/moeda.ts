// src/utils/moeda.ts
export function formatarMoeda(valor: string | number): string {
  const numero =
    typeof valor === "string"
      ? parseFloat(valor.replace(/[^0-9]/g, "")) / 100
      : valor;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

export function parseMoeda(valor: string): number {
  return parseFloat(valor.replace(/[^0-9]/g, "")) / 100;
}

export function parseMoedaCalculoPorcentagem(valor: string): number {
  return parseFloat(valor.replace(/[^0-9]/g, "")) / 10;
}

export function formatarPorcentagem(valor: number): string {
  const valorConvertido = valor / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(valorConvertido);
}

export function parsePorcentagem(valor: string): number {
  return parseFloat(valor.replace(/[^0-9]/g, "")) / 100;
}
