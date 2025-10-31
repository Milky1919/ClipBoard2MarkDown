document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');

    // Turndownサービスを初期化
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '*',
        codeBlockStyle: 'fenced',
        emDelimiter: '_',
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
