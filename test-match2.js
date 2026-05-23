const text = `::: info 
Body
:::`; // space after info!

const match = text.match(/^:::\s*([a-zA-Z]+)(?:[ \t]+([^\r\n]*))?\n([\s\S]*?)(\n:::|$)/);
if (match) {
    console.log("Matched!", match[1], match[2] ? match[2].length : match[2], match[3]);
} else {
    console.log("NOT MATCHED!");
}
