// utils/formatters.ts
export function formatarData(dataString: string, incluirHora = false): string {
  const data = new Date(dataString);
  const dia = data.getDate().toString().padStart(2, "0");
  const mes = (data.getMonth() + 1).toString().padStart(2, "0");
  const ano = data.getFullYear();

  if (incluirHora) {
    const horas = data.getHours().toString().padStart(2, "0");
    const minutos = data.getMinutes().toString().padStart(2, "0");
    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
  }

  return `${dia}/${mes}/${ano}`;
}
