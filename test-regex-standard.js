const text = `some leading text
::: info My Title
Body
:::
some trailing text`;

let newText = text;
let match;
while ((match = newText.match(/^:::\s*([a-zA-Z]+)(?:[ \t]+([^\r\n]*))?\r?\n([\s\S]*?)\r?\n:::\s*$/m))) {
    console.log("Matched!", match[0]);
    const type = match[1];
    const title = match[2] ? match[2].trim() : type.charAt(0).toUpperCase() + type.slice(1);
    const content = match[3];
    const summaryHtml = `<summary>${title}</summary>\n\n`;
    newText = newText.substring(0, match.index) + `\n<details>\n${summaryHtml}${content.trim()}\n</details>\n` + newText.substring(match.index + match[0].length);
}
console.log(newText);
