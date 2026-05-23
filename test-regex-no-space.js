const text = `:::info[证明]
Body
:::`;

let newText = text;
let match;
let count = 0;
while ((match = newText.match(/^\s*:::\s*([a-zA-Z]+)(?:[ \t]*([^\r\n]*))?\r?\n([\s\S]*?)(?:\r?\n\s*:::|$)/m))) {
    if (count++ > 10) break;
    const type = match[1];
    let titleRaw = match[2] ? match[2].trim() : type.charAt(0).toUpperCase() + type.slice(1);
    if (titleRaw.startsWith('[') && titleRaw.endsWith(']')) {
        titleRaw = titleRaw.substring(1, titleRaw.length - 1);
    }
    const title = titleRaw;
    const content = match[3];
    const summaryHtml = `<summary>${title}</summary>\n\n`;
    const replacement = `\n<details>\n${title ? summaryHtml : ''}${content.trim()}\n</details>\n`;
    newText = newText.substring(0, match.index) + replacement + newText.substring(match.index + match[0].length);
}
console.log(newText);
