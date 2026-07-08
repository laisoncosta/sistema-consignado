import * as XLSX from "xlsx";

export type LinhaPlanilha = Record<string, string | number>;

export function exportarPlanilhaXls(
  linhas: LinhaPlanilha[],
  nomeArquivo: string,
  nomeAba = "Dados",
): void {
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, nomeAba);
  XLSX.writeFile(livro, nomeArquivo.endsWith(".xls") ? nomeArquivo : `${nomeArquivo}.xls`, {
    bookType: "xls",
  });
}

export function lerPlanilhaXls(buffer: ArrayBuffer): LinhaPlanilha[] {
  const livro = XLSX.read(buffer, { type: "array" });
  const primeiraAba = livro.SheetNames[0];

  if (!primeiraAba) {
    return [];
  }

  const planilha = livro.Sheets[primeiraAba];
  const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(planilha, {
    defval: "",
  });

  return linhas.map((linha) => {
    const normalizada: LinhaPlanilha = {};

    for (const [chave, valor] of Object.entries(linha)) {
      normalizada[chave] =
        valor === null || valor === undefined ? "" : String(valor).trim();
    }

    return normalizada;
  });
}

function normalizarChaveColuna(chave: string): string {
  return chave
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function obterValorColuna(
  linha: LinhaPlanilha,
  aliases: string[],
): string {
  const mapa = new Map<string, string>();

  for (const [chave, valor] of Object.entries(linha)) {
    mapa.set(normalizarChaveColuna(chave), String(valor).trim());
  }

  for (const alias of aliases) {
    const encontrado = mapa.get(normalizarChaveColuna(alias));
    if (encontrado) {
      return encontrado;
    }
  }

  return "";
}
