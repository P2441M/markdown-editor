const text = `<details>
<summary>
My Title
</summary>
Content
</details>

::: info
Body
:::`;

let newText = text;
let match;
let it = 0;
while ((match = newText.match(/<details[^>]*>\s*(?:<summary[^>]*>([\s\S]*?)<\/summary>)?([\s\S]*?)<\/details>/i))) {
    let summary = match[1] ? ' ' + match[1].trim() : '';
    if(summary.trim().toLowerCase() === 'info') summary = '';
    const content = match[2];
    newText = newText.substring(0, match.index) + '\n::: info' + summary + '\n' + content.trim() + '\n:::\n' + newText.substring(match.index + match[0].length);
    if(it++ > 10) break;
}
console.log(newText);
