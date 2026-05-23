const text = `::: info
test
:::`;

const match = text.match(/^:::\s*([a-zA-Z]+)(?:[ \t]+([^\r\n]*))?\r?\n([\s\S]*?)(?:\r?\n:::|$)/);
console.log(match ? "Matched To Standard!" : "Not matched standard");

const luoguText = `<details>
<summary>info</summary>

test
</details>`;

const match2 = luoguText.match(/<details[^>]*>([\s\S]*?)<\/details>/i);
console.log(match2 ? "Matched To Luogu!" : "Not matched luogu");
