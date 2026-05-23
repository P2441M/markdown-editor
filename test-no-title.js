const text = `::: info
Body
:::`;

const match = text.match(/^:::\s*([a-zA-Z]+)(?:[ \t]+([^\r\n]*))?\r?\n([\s\S]*?)\r?\n:::\s*$/m);
if (match) {
    console.log("Matched index 2:", match[2]);
} else {
    console.log("Not matched");
}
