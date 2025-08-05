# AI UX Customizer 設定項目

## 概要

各プロパティの用途・記述例・指定できる値や注意点を表でまとめました。  
カスタマイズ時に迷ったらこのページを参照してください。

**ただし基本的にはGUI設定画面での設定を推奨します。本資料は技術情報として参照してください。**  
**なおJSON直接編集で想定外の値を設定した場合は、インポート時にスクリプトが許可する値にフォールバックされます。**

【注意】本スクリプトの設定で使うプロパティ名と、CSSのプロパティ名は異なります。対応するCSSのプロパティ名は備考欄に書いてありますので、仕様をインターネットで検索する際はCSSのプロパティ名で検索してください。

---

## JSON構造

以下はJSON構造を示すためのサンプルです。**コピー＆貼り付けやインポートして使えるサンプル**は [`samples`](../../samples/UX-Customizer) フォルダにあります。

```json
{
  "options": {
    "icon_size": 64,
    "chat_content_max_width": null,
    "respect_avatar_space": true
  },
  "features": {
    "collapsible_button": {
      "enabled": true
    },
    "scroll_to_top_button": {
      "enabled": true
    },
    "sequential_nav_buttons": {
      "enabled": true
    },
    "fixed_nav_console": {
      "enabled": true
    }
  },
  "themeSets": [
    {
      "metadata": {
        "id": "gptux-theme-example-1",
        "name": "My Project Theme 1",
        "matchPatterns": [
          "/\\[theme1\\]/i",
          "/My Project/i"
        ]
      },
      "user": {
        "name": "You",
        "icon": "url, SVG, base64, ...",
        "standingImageUrl": "",
        "textColor": "#89c4f4",
        "font": "Meiryo, sans-serif",
        "bubbleBackgroundColor": "#232e3b",
        "bubblePadding": "10px 14px",
        "bubbleBorderRadius": "16px",
        "bubbleMaxWidth": "70%"
      },
      "assistant": {
        "name": "Assistant",
        "icon": "url, SVG, base64, ...",
        "standingImageUrl": "",
        "textColor": "#ffe4e1",
        "font": "Meiryo, sans-serif",
        "bubbleBackgroundColor": "#384251",
        "bubblePadding": "10px 14px",
        "bubbleBorderRadius": "16px",
        "bubbleMaxWidth": "90%"
      },
      "window": {
        "backgroundColor": "#151b22",
        "backgroundImageUrl": "url here",
        "backgroundSize": "cover",
        "backgroundPosition": "center center",
        "backgroundRepeat": "no-repeat"
      },
      "inputArea": {
        "backgroundColor": "#202531",
        "textColor": "#e3e3e3",
      }
    },
    {
      "metadata": {
        "id": "gptux-theme-example-2",
        "name": "(ここにテーマ名)",
        "matchPatterns": [
          "(ここに正規表現)"
        ]
      },
      "..." : "(テーマ設定はいくつでも追加できます)"
    }
  ],
  "defaultSet": {
    "user": {
      "name": "You",
      "icon": "",
      "standingImageUrl": null,
      "textColor": null,
      "font": null,
      "bubbleBackgroundColor": null,
      "bubblePadding": null,
      "bubbleBorderRadius": null,
      "bubbleMaxWidth": null
    },
    "assistant": {
      "name": "AIサービス",
      "icon": "",
      "standingImageUrl": null,
      "textColor": null,
      "font": null,
      "bubbleBackgroundColor": null,
      "bubblePadding": null,
      "bubbleBorderRadius": null,
      "bubbleMaxWidth": null
    },
    "window": {
      "backgroundColor": null,
      "backgroundImageUrl": null,
      "backgroundSize": "cover",
      "backgroundPosition": "center center",
      "backgroundRepeat": "no-repeat"
    },
    "inputArea": {
      "backgroundColor": null,
      "textColor": null
    }
  }
}
````

-----

## 全体構成

| 項目名 | 説明・例 |
| --- | --- |
| `options` | スクリプトの動作や表示に関する共通設定。 |
| `features` | UI改善機能の有効/無効を切り替える設定。 |
| `themeSets` | テーマ設定の配列。複数のテーマを作成可能。 |
| `defaultSet` | デフォルトのテーマ設定。`themeSets`で定義したどのテーマにもマッチしなかった場合に適用される。 |

-----

## `"options"`の設定項目

| プロパティ名 | 用途・説明 | 記述例 | 備考・指定可能な値 |
| --- | --- | --- | --- |
| `icon_size` | アイコンサイズ | `64` | 数値。デフォルトは`64`。<br>表示のバランスから`64`,`96`,`128`,`160`,`192`を指定可能値としている。 |
| `chat_content_max_width` | チャット内容部分の最大幅 | `'70vw'` | CSSの`max-width`で有効な値を文字列で指定。ただし本スクリプトでは`vw`指定に限定している。<br>空欄または`null`でAIサービスのデフォルト。 |
| `respect_avatar_space` | 立ち絵画像表示時にアバターアイコンを考慮するか否か | `true` | `true`:立ち絵画像がアバターアイコンに重ならないように表示幅が調整される。<br>`false`:立ち絵画像がアバターアイコンに重なることを許容する。立ち絵を最大限大きく表示したい場合は`false`にする。<br>デフォルトは`true` |

-----

## `"features"`の設定項目

便利なUI改善機能のON/OFFや、動作の閾値などを設定します。

| プロパティ名 | 用途・説明 | 記述例 | 備考・指定可能な値 |
| --- | --- | --- | --- |
| `collapsible_button` | メッセージを折りたたむボタンを各メッセージバブル上部に表示する。 | `{ "enabled": true }` | `true`/`false`<br>アシスタント側は左上に、ユーザー側は右上に表示する。<br>なおGeminiにおいてはユーザーバブルにサイト標準の折りたたみボタンが付いているため、Gemini用スクリプトではユーザーバブルに対しては処理しない。<br>また本機能が有効な場合、メッセージ入力欄右側に、全メッセージの折りたたみ状態をトグルするボタンを表示する。 |
| `scroll_to_top_button` | メッセージの先頭（ターンの先頭）へスクロールするボタンを、各メッセージバブル下部に表示する。 | `{ "enabled": true }` | `true`/`false`<br>アシスタント側は左下に、ユーザー側は右下に表示する。 |
| `sequential_nav_buttons` | 同じ作者（ユーザーまたはアシスタント）の次/前のメッセージへジャンプするボタンを、各メッセージバブルの横に表示する。 | `{ "enabled": true }` | `true`/`false`<br>アシスタント側は左上に、ユーザー側は右上に表示する。 |
| `fixed_nav_console` | 統合ナビコンソールをメッセージ入力欄上部に表示する。 | `{ "enabled": true }` | `true`/`false`<br>メッセージの移動を効率的に行うためのボタンを集約したコンソールバーを表示する。 |

-----

## `"themeSets"`の設定項目

テーマはオブジェクトの配列として`themeSets`に複数定義できます。

### `"metadata"` (テーマ情報)

各テーマオブジェクトの最初に、テーマの情報を定義する`metadata`を記述します。

| プロパティ名 | 用途・説明 | 記述例 | 備考・指定可能な値 |
| --- | --- | --- | --- |
| `id` | テーマのユニークID | `"gptux-theme-12345"` | スクリプトが内部で管理するためのIDです。通常は編集する必要はありません。テーマエディタで新規作成すると自動で付与されます。なおJSONテキスト上で重複していても、インポート時に自動で重複を回避します。 |
| `name` | テーマ名 | `"My Project Theme"` | テーマエディタの選択肢に表示される名前です。わかりやすい名前を付けてください。 |
| `matchPatterns` | テーマ適用条件 | `[ "/myproject/i", "/^Project\\\\d+/" ]` | **正規表現文字列の配列**で指定します。ウィンドウタイトルがこの条件にマッチした場合にテーマが適用されます。<br>**バックスラッシュ（\\）はJSON上で二重（\\）にエスケープする必要があります。**<br><br>**例:**<br>- `"myproject"`を含む(`/i`で大文字小文字を区別しない)<br>- `"Project"+数字`で始まる |

-----

### ユーザー/アシスタントの設定 (`"user"` / `"assistant"`)

| プロパティ名 | 用途・説明 | 記述例 | 備考・指定可能な値 |
| --- | --- | --- | --- |
| `name` | 表示名 | `"You"`, `"AIサービス"` | 文字列 |
| `icon` | アイコン画像 | `"https://.../icon.png"`<br>`"<svg>..."` | URL、SVGコード、Base64など。<br>JSON直接編集時は、SVGコードの `"` は `\"` にエスケープが必要です。<br>GUI設定画面ではエスケープ不要ですので、GUIでの設定を推奨します。 |
| `standingImageUrl` | 立ち絵画像URL | `"https://.../sample.png"` | 対応CSSプロパティ: `background-image`形式。<br>単一URLの他、`linear-gradient`等との組み合わせも可能。 |
| `textColor` | 文字色 | `"#89c4f4"` | CSSカラーコード（\#記法/rgb()/名前など）<br>対応CSSプロパティ: `color` |
| `font` | バブルのフォント指定 | `"游ゴシック", sans-serif` | CSSフォント指定 |
| `bubbleBackgroundColor` | バブルの背景色 | `"#222833"` | 対応CSSプロパティ: `background-color` |
| `bubblePadding` | バブルの内側余白 | `"10px 14px"` | 対応CSSプロパティ: `padding` |
| `bubbleBorderRadius` | バブルの角丸 | `"16px"` | 対応CSSプロパティ: `border-radius` |
| `bubbleMaxWidth` | バブルの最大幅 | `"70%"` | 対応CSSプロパティ: `max-width` |

-----

### 背景の設定 (`"window"`)

| プロパティ名 | 用途・説明 | 記述例 | 備考・指定可能な値 |
| --- | --- | --- | --- |
| `backgroundColor` | チャットウィンドウの背景色 | `"#11131c"` | 対応CSSプロパティ: `background-color` |
| `backgroundImageUrl` | チャットウィンドウの背景画像 | `"https://.../bg.png"` | 対応CSSプロパティ: `background-image`形式。<br>単一URLの他、`linear-gradient`等との組み合わせも可能。 |
| `backgroundSize` | 背景画像のサイズ指定 | `"cover"`, `"contain"` | 対応CSSプロパティ: `background-size` |
| `backgroundPosition` | 背景画像の位置指定 | `"center center"` | 対応CSSプロパティ: `background-position` |
| `backgroundRepeat` | 背景画像の繰り返し設定 | `"no-repeat"`, `"repeat"` | 対応CSSプロパティ: `background-repeat` |

-----

### チャット入力欄の設定 (`"inputArea"`)

| プロパティ名 | 用途・説明 | 記述例 | 備考・指定可能な値 |
| --- | --- | --- | --- |
| `backgroundColor` | 入力欄の背景色 | `"#21212a"` | 対応CSSプロパティ: `background-color` |
| `textColor` | 入力欄の文字色 | `"#e3e3e3"` | 対応CSSプロパティ: `color` |

-----

## `"defaultSet"`の設定項目

デフォルトのテーマを設定します。`"themeSets"`のどのテーマにもマッチしなかった場合に適用されます。  
設定項目は`"themeSets"`の各テーマから`"metadata"`を除いたものと同じです。

-----

## Tips

  * デフォルトのテーマをAIサービス標準のものから変えたくない場合、`defaultSet`の各プロパティを全て`null`に設定してください。
  * ローカルの画像をアイコンや背景に使いたい場合は`base64`エンコードが有用ですが、設定JSONの肥大化やパフォーマンス低下を招く可能性があるため、オンラインのリソースを指定することを推奨します。
