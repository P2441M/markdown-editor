import fs from 'fs';

const text = `<details>
<summary>
My Title \`code\`
</summary>
Hello World
</details>`;

let newText = text;
let match;
while ((match = newText.match(/<details[^>]*>([\s\S]*?)<\/details>/i))) {
    const block = match[1];
    let summary = '';
    let contentText = block;
    const summaryMatch = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    if (summaryMatch) {
        summary = summaryMatch[1].trim();
        contentText = block.replace(summaryMatch[0], '');
    }
    if (summary.toLowerCase() === 'info') summary = '';
    const replacement = '\n::: info' + (summary ? ' ' + summary : '') + '\n' + contentText.trim() + '\n:::\n';
    newText = newText.substring(0, match.index) + replacement + newText.substring(match.index + match[0].length);
}
console.log(newText);
