// utils/formatters.ts
export function formatarData(dataString: string, incluirHora = false): string {
  const data = new Date(dataString);

  const dia = data.getUTCDate().toString().padStart(2, "0");
  const mes = (data.getUTCMonth() + 1).toString().padStart(2, "0");
  const ano = data.getUTCFullYear();

  if (incluirHora) {
    const horas = data.getUTCHours().toString().padStart(2, "0");
    const minutos = data.getUTCMinutes().toString().padStart(2, "0");
    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
  }

  return `${dia}/${mes}/${ano}`;
}

