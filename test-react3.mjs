import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

const remarkAddLineNumbers = () => {
  return (tree) => {
    // simplified
    tree.children.forEach(node => {
      if (node.type === 'code') {
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties['data-line'] = 1;
      }
    });
  };
};

const md = '```javascript\nconst greeting = "Hello, world!";\n```';

console.log(renderToString(React.createElement(Markdown, { 
    remarkPlugins: [remarkAddLineNumbers],
    rehypePlugins: [rehypeRaw, rehypeHighlight] 
}, md)));
