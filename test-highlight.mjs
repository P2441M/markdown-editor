import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeHighlight, { ignoreMissing: true })
  .use(rehypeStringify);

const vfile = await processor.process("```js\nconst greeting = 'Hello, world!';\n```");
console.log(String(vfile));
