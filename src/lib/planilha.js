// Leitura e escrita de planilhas no navegador. As bibliotecas só são baixadas
// quando alguém usa a importação (import dinâmico).

const extensao = (nome) => nome.toLowerCase().split('.').pop()

// CSV salvo pelo Excel em português costuma vir em Windows-1252, não UTF-8.
async function textoDoCsv(arquivo) {
  const bytes = await arquivo.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(bytes)
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(bytes) : utf8
}

/** Devolve a primeira aba como matriz (linhas x células). */
export async function lerPlanilha(arquivo) {
  const tipo = extensao(arquivo.name)
  if (tipo === 'csv' || tipo === 'txt') {
    const { default: Papa } = await import('papaparse')
    const { data } = Papa.parse(await textoDoCsv(arquivo), {
      skipEmptyLines: 'greedy',
      delimitersToGuess: [';', ',', '\t'],
    })
    return data
  }
  if (tipo === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser')
    return readSheet(arquivo)
  }
  throw new Error('Formato não aceito. Use .xlsx ou .csv.')
}

export async function baixarXlsx(nomeArquivo, matriz) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const larguras = matriz[0].map((_, j) =>
    Math.min(45, Math.max(10, ...matriz.map((l) => String(l[j] ?? '').length + 2))),
  )
  await writeExcelFile(matriz, { columns: larguras.map((width) => ({ width })) }).toFile(
    nomeArquivo,
  )
}
