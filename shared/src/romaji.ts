/**
 * カタカナの読みをローマ字（パスポートと同じヘボン式）にする。
 * 長音は書かない（タロウ → taro、オオノ → ono、ユウト → yuto）。ンは b・m・p の前で m（ホンマ → homma）
 */
const DIGRAPHS: Record<string, string> = {
  キャ: 'kya', キュ: 'kyu', キョ: 'kyo', シャ: 'sha', シュ: 'shu', ショ: 'sho', チャ: 'cha', チュ: 'chu', チョ: 'cho',
  ニャ: 'nya', ニュ: 'nyu', ニョ: 'nyo', ヒャ: 'hya', ヒュ: 'hyu', ヒョ: 'hyo', ミャ: 'mya', ミュ: 'myu', ミョ: 'myo',
  リャ: 'rya', リュ: 'ryu', リョ: 'ryo', ギャ: 'gya', ギュ: 'gyu', ギョ: 'gyo', ジャ: 'ja', ジュ: 'ju', ジョ: 'jo',
  ヂャ: 'ja', ヂュ: 'ju', ヂョ: 'jo', ビャ: 'bya', ビュ: 'byu', ビョ: 'byo', ピャ: 'pya', ピュ: 'pyu', ピョ: 'pyo',
  シェ: 'she', ジェ: 'je', チェ: 'che', ティ: 'ti', ディ: 'di', ファ: 'fa', フィ: 'fi', フェ: 'fe', フォ: 'fo', ウィ: 'wi', ウェ: 'we', ウォ: 'wo', ヴァ: 'va', ヴィ: 'vi', ヴェ: 've', ヴォ: 'vo',
}
const SINGLES: Record<string, string> = {
  ア: 'a', イ: 'i', ウ: 'u', エ: 'e', オ: 'o', カ: 'ka', キ: 'ki', ク: 'ku', ケ: 'ke', コ: 'ko',
  サ: 'sa', シ: 'shi', ス: 'su', セ: 'se', ソ: 'so', タ: 'ta', チ: 'chi', ツ: 'tsu', テ: 'te', ト: 'to',
  ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no', ハ: 'ha', ヒ: 'hi', フ: 'fu', ヘ: 'he', ホ: 'ho',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo', ヤ: 'ya', ユ: 'yu', ヨ: 'yo',
  ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro', ワ: 'wa', ヲ: 'o', ン: 'n',
  ガ: 'ga', ギ: 'gi', グ: 'gu', ゲ: 'ge', ゴ: 'go', ザ: 'za', ジ: 'ji', ズ: 'zu', ゼ: 'ze', ゾ: 'zo',
  ダ: 'da', ヂ: 'ji', ヅ: 'zu', デ: 'de', ド: 'do', バ: 'ba', ビ: 'bi', ブ: 'bu', ベ: 'be', ボ: 'bo',
  パ: 'pa', ピ: 'pi', プ: 'pu', ペ: 'pe', ポ: 'po', ヴ: 'vu', ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o', ャ: 'ya', ュ: 'yu', ョ: 'yo',
}

export function kanaToRomaji(kana: string): string {
  const chars = [...kana.replace(/[\s　・]/g, '')]
  let out = ''
  let sokuon = false
  for (let i = 0; i < chars.length; i++) {
    const pair = chars[i] + (chars[i + 1] ?? '')
    let syllable: string
    if (DIGRAPHS[pair]) {
      syllable = DIGRAPHS[pair]
      i++
    } else if (chars[i] === 'ッ') {
      sokuon = true
      continue
    } else if (chars[i] === 'ー') {
      continue // 長音は書かない
    } else {
      syllable = SINGLES[chars[i]] ?? ''
    }
    if (sokuon && syllable) {
      // 促音は次の子音を重ねる（チ・チャ行は t を足す: マッチャ → matcha）
      out += syllable.startsWith('ch') ? 't' : syllable[0]
      sokuon = false
    }
    out += syllable
  }
  return out
    .replace(/n(?=[bmp])/g, 'm')
    .replace(/ou/g, 'o')
    .replace(/oo/g, 'o')
    .replace(/uu/g, 'u')
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

/** 山田 太郎（ヤマダ タロウ）→ YamadaTaro */
export function romanizedName(lastNameKana: string, firstNameKana: string): string {
  return capitalize(kanaToRomaji(lastNameKana)) + capitalize(kanaToRomaji(firstNameKana))
}
