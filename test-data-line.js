import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from 'unist-util-visit';

const doc = `
:::info
Line 1
Line 2
Line 3
Line 4
:::
Next line
`;

const remarkLuoguDetails = () => (tree) => {
    visit(tree, (node) => {
        if (node.type === 'containerDirective' && !['table', 'figure'].includes(node.name)) {
            const data = node.data || (node.data = {});
            const tagName = node.name === 'details' ? 'details' : 'luogu-details';
            data.hName = tagName;
            data.hProperties = { ...node.attributes, type: node.name };
        }
    });
};

const remarkSourceLine = () => (tree) => {
    visit(tree, (node) => {
        if (node.position && node.position.start && node.position.start.line) {
            node.data = node.data || {};
            node.data.hProperties = node.data.hProperties || {};
            node.data.hProperties['data-line'] = node.position.start.line;
        }
    });
};

const file = unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkLuoguDetails)
  .use(remarkSourceLine)
  .use(remarkRehype)
  .use(rehypeStringify)
  .processSync(doc);

console.log(String(file));
