import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

import { visit } from 'unist-util-visit';
const validTags = new Set(['a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'slot', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr', 'luogu-details', 'luogu-summary', 'svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'math', 'mi', 'mn', 'mo', 'ms', 'mspace', 'mtext', 'menclose', 'merror', 'mfenced', 'mfrac', 'mpadded', 'mphantom', 'mroot', 'mrow', 'msqrt', 'mstyle', 'mmultiscripts', 'mover', 'mprescripts', 'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtr', 'munder', 'munderover', 'semantics', 'annotation', 'annotation-xml']);
function rehypeFilterTags() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName && !validTags.has(node.tagName)) {
        node.tagName = 'span';
      }
      if (node.properties) {
        for (const key in node.properties) {
          if (!/^[a-zA-Z_][a-zA-Z0-9_\-:]*$/.test(key) && !key.startsWith('data-') && !key.startsWith('aria-')) {
             delete node.properties[key];
          }
        }
      }
    });
  };
}

const md = '```javascript\nconst greeting = "Hello, world!";\n```';

console.log(renderToString(React.createElement(Markdown, { 
    rehypePlugins: [rehypeKatex, rehypeRaw, rehypeFilterTags, rehypeHighlight] 
}, md)));
