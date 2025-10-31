document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');

    // Turndownサービスを初期化
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '*',
        codeBlockStyle: 'fenced',
        emDelimiter: '_',
        blankReplacement: function (content, node) {
          // 複数の空行や改行が1つの空行にまとめられるように、常に単一の改行を返す
          return '\n\n';
        }
    });

    // --- ★★★ <br>タグの改行ルール ★★★ ---
    // <br>タグを単一の改行に変換します。これにより、余分な空行が生まれるのを防ぎます。
    turndownService.addRule('br', {
        filter: 'br',
        replacement: function (content, node, options) {
            return '\n';
        }
    });

    // GFM プラグインを追加
    turndownService.use(turndownPluginGfm.gfm);

    // --- ★★★ 新規ルール (v3) ★★★ ---
    // コードブロックで言語指定 (class="language-js"など) があればそれを保持するルール。
    // これにより ` ```js ` のような言語指定付きのコードブロックが生成されます。
    turndownService.addRule('fencedCodeBlock', {
      filter: function (node, options) {
        return (
          node.nodeName === 'PRE' &&
          node.firstChild &&
          node.firstChild.nodeName === 'CODE'
        );
      },
      replacement: function (content, node, options) {
        const codeNode = node.firstChild;
        const className = codeNode.getAttribute('class') || '';
        const language = (className.match(/language-(\S+)/) || [null, ''])[1];
        // textContent を使うことで、HTMLタグがエスケープされるのを防ぎ、生のコードを取得します。
        const code = codeNode.textContent;
        
        return '\n\n```' + language + '\n' + code + '\n```\n\n';
      }
    });

    // --- ★★★ 改善ルール (v3) ★★★ ---
    // リスト項目内の<p>タグを扱うルールを改良。
    // <li> の中に <p> が一つだけあるようなシンプルなリストは詰まったリスト (tight) に、
    // <li> の中に複数の <p> があるような複雑なリストは、段落間が空いたリスト (loose) にします。
    turndownService.addRule('tightListItem', {
        filter: function (node) {
            if (node.nodeName !== 'P' || node.parentNode.nodeName !== 'LI') {
                return false;
            }
            const parent = node.parentNode;
            const childNodes = Array.from(parent.childNodes);
            // 親の<li>要素の子要素のうち、要素ノード(タグ)がこの<p>一つだけかチェック
            const elementChildren = childNodes.filter(child => child.nodeType === 1);
            return elementChildren.length === 1;
        },
        replacement: function (content) {
            return content;
        }
    });

    // --- ★★★ テーブル整形ルール ★★★ ---
    // 内部の改行や空白を制御し、パイプを揃えることで、きれいに整形されたテーブルを生成します。
    // セル内の <br> は改行として維持し、それ以外の不要な空白や改行はトリムします。
    turndownService.addRule('table', {
        filter: 'table',

        replacement: function (content, node) {
            // ヘッダー行とボディ行を抽出
            const thead = node.querySelector('thead');
            const tbody = node.querySelector('tbody');
            if (!thead || !tbody) return content; // theadとtbodyがなければ何もしない

            const headers = Array.from(thead.rows[0].cells).map(cell => {
                return cell.innerHTML.replace(/<br\s*\/?>/gi, '\n').trim();
            });

            const rows = Array.from(tbody.rows).map(row => {
                return Array.from(row.cells).map(cell => {
                    // <br>を改行文字に変換し、前後の空白をトリム
                    return cell.innerHTML.replace(/<br\s*\/?>/gi, '\n').trim();
                });
            });

            const colWidths = headers.map((_, i) => {
                const widths = [headers[i].length].concat(rows.map(row => row[i] ? row[i].split('\n').reduce((max, line) => Math.max(max, line.length), 0) : 0));
                return Math.max(...widths, 3); // 最低幅3を確保 (---)
            });

            // ヘッダー行を生成
            const headerLine = '| ' + headers.map((header, i) => {
                return header.padEnd(colWidths[i]);
            }).join(' | ') + ' |';

            // セパレータ行を生成
            const separatorLine = '| ' + colWidths.map(width => {
                return '-'.repeat(width);
            }).join(' | ') + ' |';

            // データ行を生成
            const bodyLines = rows.map(row => {
                // セルごとの最大行数を計算
                const maxLines = Math.max(...row.map(cell => cell ? cell.split('\n').length : 1));
                let lines = [];
                for(let i = 0; i < maxLines; i++) {
                    const line = row.map((cell, j) => {
                        const cellLines = cell ? cell.split('\n') : [''];
                        return (cellLines[i] || '').padEnd(colWidths[j]);
                    }).join(' | ');
                    lines.push('| ' + line + ' |');
                }
                return lines.join('\n');
            }).join('\n');

            return '\n\n' + headerLine + '\n' + separatorLine + '\n' + bodyLines + '\n\n';
        }
    });

    // --- ★★★ インラインコード整形ルール ★★★ ---
    // `<code>` や `<samp>` タグで囲まれた技術要素を一貫してバッククォートで囲みます。
    turndownService.addRule('inlineCode', {
      filter: ['code', 'samp'],
      replacement: function (content) {
        // バッククォートが内容に含まれている場合は、二重バッククォートで囲む
        if (content.includes('`')) {
          return '`` ' + content + ' ``';
        }
        return '`' + content + '`';
      }
    });

    // --- ★★★ 数式整形ルール ★★★ ---
    // `.math-inline` をインライン数式 `$ ... $` に、 `.math-block` をブロック数式 `$$ ... $$` に変換します。
    // 手動でHTML側でクラスを付与することを想定しています。
    turndownService.addRule('math', {
        filter: function (node) {
            return node.classList.contains('math-inline') || node.classList.contains('math-block');
        },
        replacement: function (content, node) {
            if (node.classList.contains('math-inline')) {
                return '$' + content + '$';
            }
            if (node.classList.contains('math-block')) {
                return '\n\n$$\n' + content + '\n$$\n\n';
            }
            return content;
        }
    });

    /**
     * テキストエリアの現在のカーソル位置にテキストを挿入します。
     */
    function insertTextAtCursor(textarea, text) {
        const { selectionStart, selectionEnd, value } = textarea;
        textarea.value = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
        textarea.selectionStart = textarea.selectionEnd = selectionStart + text.length;
        textarea.focus();
    }

    // 貼り付けイベントのリスナー
    editor.addEventListener('paste', (event) => {
        event.preventDefault();
        const clipboardData = event.clipboardData || window.clipboardData;
        const html = clipboardData.getData('text/html');

        if (html) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // 不要な属性を削除してHTMLをクリーンアップ
            tempDiv.querySelectorAll('*').forEach(el => {
                const allowedAttrs = ['href', 'src', 'alt', 'title', 'class']; // 'class'を許可リストに追加
                for (const attr of Array.from(el.attributes)) {
                    if (!allowedAttrs.includes(attr.name.toLowerCase())) {
                        el.removeAttribute(attr.name);
                    }
                }
            });

            // GFMタスクリストのテキスト形式 "[ ]" を<input>に変換する事前処理
            tempDiv.querySelectorAll('p, li').forEach(el => {
                // 子ノードに直接テキストがある場合のみを対象とし、ネストしたリスト内のテキストを誤検知しないようにする
                if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
                     const regex = /^\s*(\[([ x])\])\s*/i;
                     const match = el.firstChild.nodeValue.match(regex);
                     if(match) {
                        const isChecked = match[2] && match[2].toLowerCase() === 'x';
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.checked = isChecked;
                        checkbox.disabled = true;

                        // マッチしたテキスト部分を削除
                        el.firstChild.nodeValue = el.firstChild.nodeValue.substring(match[0].length);
                        // チェックボックスを先頭に挿入
                        el.insertBefore(checkbox, el.firstChild);
                     }
                }

                // <li><p>[ ]...</p></li> のような構造を <li><input/>...</li> に修正
                const pInLi = el.tagName === 'P' && el.parentNode && el.parentNode.tagName === 'LI';
                if (pInLi && el.querySelector('input[type="checkbox"]')) {
                    const parentLi = el.parentNode;
                    while (el.firstChild) {
                        parentLi.insertBefore(el.firstChild, el);
                    }
                    parentLi.removeChild(el);
                }
            });

            // テーブルの最初の行をヘッダーに変換
            tempDiv.querySelectorAll('table:not(:has(thead)) tr:first-child td').forEach(td => {
                const th = document.createElement('th');
                th.innerHTML = td.innerHTML;
                td.parentNode.replaceChild(th, td);
            });

            // HTMLをMarkdownに変換
            let markdown = turndownService.turndown(tempDiv);
            markdown = markdown.replace(/(\d)\\\./g, '$1.');

            insertTextAtCursor(editor, markdown);
        } else {
            const text = clipboardData.getData('text/plain');
            insertTextAtCursor(editor, text);
        }
    });
});
