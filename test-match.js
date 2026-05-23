import fs from 'fs';

const blockText = `::: info
test
:::`;

const match = blockText.match(/^:::\s*([a-zA-Z]+)(?:[ \t]+([^\r\n]*))?\r?\n([\s\S]*?)(?:\r?\n:::|$)/);
console.log('single match standard:', !!match);

const appContent = `some text

::: info
test
:::

more text`;

const match2 = appContent.match(/^:::\s*([a-zA-Z]+)(?:[ \t]+([^\r\n]*))?\r?\n([\s\S]*?)\r?\n:::\s*$/m);
console.log('multi match standard:', !!match2);
