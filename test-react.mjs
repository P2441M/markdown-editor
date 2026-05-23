import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

const md = '```javascript\nconst greeting = "Hello, world!";\n```';

console.log(renderToString(React.createElement(Markdown, { rehypePlugins: [rehypeHighlight] }, md)));
