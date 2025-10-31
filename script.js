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

    // --- ★★★ テーブル整形ルール (v2) ★★★ ---
    // thead/tbodyの有無に依存せず、最初の行をヘッダーとして自動解釈する堅牢なルール。
    // セル内の不要なHTMLタグを除去し、<br>タグは改行として維持します。
    turndownService.addRule('table', {
        filter: 'table',

        replacement: function (content, node) {
            /**
             * セル内のHTMLをクリーンアップし、テキストコンテンツを抽出します。
             * <br>タグは改行文字 '\n' に変換されます。
             * @param {Node} cell - <th> または <td> 要素
             * @returns {string} クリーンアップされたテキスト
             */
            function cleanCellContent(cell) {
                const html = cell.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                return (tempDiv.textContent || tempDiv.innerText || "").trim();
            }

            const allRows = Array.from(node.querySelectorAll('tr'));
            if (allRows.length === 0) return ''; // 行がなければ何もしない

            // 最初の行をヘッダー、残りをボディとして解釈
            const headerRow = allRows.shift();
            const headers = Array.from(headerRow.cells).map(cleanCellContent);
            const bodyRows = allRows.map(row => Array.from(row.cells).map(cleanCellContent));

            // 各列の最大幅を計算
            const colWidths = headers.map((_, i) => {
                const headerWidth = headers[i] ? headers[i].split('\n').reduce((max, line) => Math.max(max, line.length), 0) : 0;
                const bodyWidths = bodyRows.map(row => row[i] ? row[i].split('\n').reduce((max, line) => Math.max(max, line.length), 0) : 0);
                return Math.max(...[headerWidth].concat(bodyWidths), 3); // 最低幅3 (---) を確保
            });

            // ヘッダー行を生成
            const headerLine = '| ' + headers.map((header, i) => (header || '').padEnd(colWidths[i])).join(' | ') + ' |';

            // セパレータ行を生成
            const separatorLine = '| ' + colWidths.map(width => '-'.repeat(width)).join(' | ') + ' |';

            // データ行を生成 (複数行セルに対応)
            const bodyLines = bodyRows.map(row => {
                const maxLinesInRow = Math.max(1, ...row.map(cell => (cell || '').split('\n').length));
                let rowOutput = [];
                for (let i = 0; i < maxLinesInRow; i++) {
                    const line = row.map((cell, j) => {
                        const cellLines = (cell || '').split('\n');
                        return (cellLines[i] || '').padEnd(colWidths[j]);
                    }).join(' | ');
                    rowOutput.push('| ' + line + ' |');
                }
                return rowOutput.join('\n');
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
