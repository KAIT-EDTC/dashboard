import { strFromU8, strToU8 } from 'fflate'

/** Excel様式（.xlsx を展開した XML）に値を入れる道具。様式の書式・図形はそのまま使う */

export type XlsxFiles = Record<string, Uint8Array>

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const cellXml = (ref: string, style: string, value: string | number) =>
  typeof value === 'number'
    ? `<c r="${ref}"${style}><v>${value}</v></c>`
    : `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`

/** 様式のセルに値を入れる（セルの書式はそのまま使う） */
export function setCell(sheet: string, ref: string, value: string | number | null): string {
  if (value === null || value === '') return sheet
  return sheet.replace(new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`), (_match, attrs: string) =>
    cellXml(ref, attrs.match(/ s="\d+"/)?.[0] ?? '', value),
  )
}

/** 式のセルに計算済みの値も入れておく（Excel以外のビューアは開いたときに計算し直さないことがあるため） */
export function setFormulaResult(sheet: string, ref: string, value: string | number): string {
  return sheet.replace(new RegExp(`<c r="${ref}"([^>]*?)>(<f>[\\s\\S]*?</f>)<v>[\\s\\S]*?</v></c>`), (_match, attrs: string, formula: string) => {
    const style = attrs.match(/ s="\d+"/)?.[0] ?? ''
    return typeof value === 'number'
      ? `<c r="${ref}"${style}>${formula}<v>${value}</v></c>`
      : `<c r="${ref}"${style} t="str">${formula}<v>${escapeXml(value)}</v></c>`
  })
}

/** 様式の最後の行より下に、行を書き足す（書式なし） */
export function appendRows(sheet: string, rows: { row: number; cells: [column: string, value: string | number][] }[]): string {
  if (rows.length === 0) return sheet
  const xml = rows
    .map(({ row, cells }) => `<row r="${row}">${cells.map(([column, value]) => cellXml(`${column}${row}`, '', value)).join('')}</row>`)
    .join('')
  const last = rows[rows.length - 1].row
  return sheet
    .replace('</sheetData>', `${xml}</sheetData>`)
    .replace(/<dimension ref="([A-Z]+\d+):([A-Z]+)\d+"\/>/, (_m, from: string, toColumn: string) => `<dimension ref="${from}:${toColumn}${last}"/>`)
}

export const readXml = (files: XlsxFiles, path: string) => strFromU8(files[path])
export const writeXml = (files: XlsxFiles, path: string, xml: string) => {
  files[path] = strToU8(xml)
}

/**
 * 1〜5 のラジオボタン（様式のフォームコントロール）を選ぶ。
 * 新しいExcelは ctrlProp、古いExcelは VML の図形を見るので両方に入れる
 */
export function checkRadio(files: XlsxFiles, controls: { ctrlProp: string; vmlShape: string }[], vmlPath: string, value: number | null) {
  let vml = readXml(files, vmlPath).replace(/<x:Checked>1<\/x:Checked>/g, '')
  controls.forEach(({ ctrlProp, vmlShape }, index) => {
    const checked = value === index + 1
    const prop = readXml(files, ctrlProp).replace(/ checked="Checked"/g, '')
    writeXml(files, ctrlProp, checked ? prop.replace('objectType="Radio"', 'objectType="Radio" checked="Checked"') : prop)
    if (checked) vml = vml.replace(new RegExp(`(<v:shape id="${vmlShape}"[\\s\\S]*?)(</x:ClientData>)`), '$1<x:Checked>1</x:Checked>$2')
  })
  writeXml(files, vmlPath, vml)
}

/** 開いたときに式を計算し直させる */
export function recalcOnLoad(files: XlsxFiles) {
  const path = 'xl/workbook.xml'
  writeXml(files, path, readXml(files, path).replace(/<calcPr([^>]*?)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>'))
}

/** 2026-09-12 → 2026/09/12 */
export const slashDate = (ymd: string) => ymd.slice(0, 10).replace(/-/g, '/')

/** ISO8601（UTC）を日本時間の日付に */
export const jstDate = (iso: string) => new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

export function download(data: Uint8Array, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
