/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo, useDeferredValue, startTransition, memo, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkDirective from 'remark-directive';
import remarkLuogu from './utils/remarkLuogu';
import rehypeFilterTags from './utils/rehypeFilterTags';
import rehypeTableMerge from './utils/rehypeTableMerge';
import rehypeHighlight from 'rehype-highlight';
import { useReactToPrint } from 'react-to-print';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { FileDown, Type, FolderOpen, Sun, Moon, Monitor, Table, X, Trash2, AlignLeft, AlignCenter, AlignRight, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Info, CheckCircle2, AlertTriangle, XCircle, Sigma, ListCollapse, FileText, Download, Plus, Keyboard, Eye, Code } from 'lucide-react';
import { LATEX_SYMBOLS } from './utils/latexSymbols';
import { VirtualKeyboard } from './components/VirtualKeyboard';

const remarkAddLineNumbers = () => {
  return (tree: any) => {
    const visit = (node: any) => {
      const blockTypes = ['heading', 'paragraph', 'blockquote', 'list', 'listItem', 'code', 'table', 'math', 'html', 'containerDirective'];
      if (node?.position?.start?.line && blockTypes.includes(node.type)) {
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties['data-line'] = node.position.start.line;
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    };
    visit(tree);
  };
};


const preprocessLatex = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
      if (math.includes('\n')) {
        return `$$${math}$$`;
      }
      return `$\\displaystyle ${math}$`;
    })
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);
};

const DEFAULT_MARKDOWN = `# Welcome to Live Markdown Editor!

**Live Markdown Editor** is a powerful, real-time editor with deep support for academic writing, math formulas, and Luogu-flavored extensions.

## Core Features

- **Real-Time Preview**: No lag between your thoughts and the screen.
- **Scroll Sync**: The preview follows your exact cursor position.
- **Visual Table Editor**: Quickly insert and manage Markdown tables visually.
- **Custom Details**: Support for standard \`details\` and Luogu-flavored \`:::info\` callouts.
- **Full LaTeX Math**: Supports all major math rendering.

---

## 🧮 LaTeX Math Equations

Math rendering is built on top of **KaTeX**. Use single \`$\` for inline math, and double \`$$\` or \`\\[ \\]\` for block math. We have a robust symbol palette accessible from the top toolbar ("$\\sum$").

### Common Operations
Fractions, roots, and combinations:
$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\quad \\binom{n}{k} = \\frac{n!}{k!(n-k)!}
$$

### Big Operators & Calculus
Integrals and summations are fully supported:
$$
\\int_{0}^{\\infty} x^n e^{-x} dx = n! \\quad \\sum_{i=1}^{n} i^3 = \\left(\\frac{n(n+1)}{2}\\right)^2
$$

### Matrices and Arrays
You can easily create aligned systems:
$$
\\begin{pmatrix}
\\alpha & \\beta \\\\
\\gamma & \\delta
\\end{pmatrix}
\\times
\\begin{pmatrix}
1 & 0 \\\\
0 & 1
\\end{pmatrix}
=
\\begin{pmatrix}
\\alpha & \\beta \\\\
\\gamma & \\delta
\\end{pmatrix}
$$

---

## 📊 Visual Table Editor

Our editor provides a fully functional visual table editor, accessible directly from the toolbar or via hover actions on any existing table:

| Function | Description | Status |
| :--- | :---: | ---: |
| \`openTableEditor()\` | Opens a visual grid for editing headers/rows | ✅ Complete |
| \`save()\` | Serializes back to perfectly padded Markdown | ✅ Complete |

---

## 💡 Callouts and Callouts (Luogu Syntax)

You can use standard \`<details>\` tags or use **Luogu's container directives** for neat callouts. Click the Convert button on the toolbar to transform them automatically!

:::info[Note]
This is an informational callout block. Useful for hints and tips!
:::

:::success[Success]
You successfully learned how to use the editor!
:::

:::warning[Warning]
Always remember to save your snippets!
:::

:::error[Danger]
This action is irreversible.
:::

---

## 📝 General Markdown

### Task Lists
- [x] Create project
- [x] Implement editor
- [x] Add extended LaTeX support
- [ ] Become a Markdown master

### Code Blocks
We support automatic syntax highlighting:

\`\`\`typescript
interface User {
  id: string;
  name: string;
}

const greet = (user: User): string => {
  return \`Hello, \${user.name}!\`;
};
\`\`\`

> *"Simplicity is the ultimate sophistication."* — Leonardo da Vinci

Enjoy writing!
`;

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const LineNumberComponent = memo(({ length }: { length: number }) => {
  const html = useMemo(() => {
    let str = '';
    for (let i = 1; i <= length; i++) {
        str += `<div>${i}</div>`;
    }
    return str;
  }, [length]);
  return <div dangerouslySetInnerHTML={{ __html: html }} className="contents" />;
});

const MirrorComponent = memo(({ lines }: { lines: string[] }) => {
  const html = useMemo(() => {
    let str = '';
    for (let i = 0; i < lines.length; i++) {
      const line = escapeHtml(lines[i]) || ' ';
      str += `<div data-mirror-line="${i + 1}" class="min-h-[1.6rem]">${line}</div>`;
    }
    return str;
  }, [lines]);
  return <div dangerouslySetInnerHTML={{ __html: html }} className="contents" />;
});

const EditorTextarea = memo(({ content, onChange, onScroll, onKeyDown, isDark, editorRef, showKeyboard }: any) => {
  const contentRef = useRef(content);
  useEffect(() => {
    if (contentRef.current !== content) {
      contentRef.current = content;
      if (editorRef.current && editorRef.current.value !== content) {
        editorRef.current.value = content;
      }
    }
  }, [content, editorRef]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    contentRef.current = val;
    startTransition(() => {
      onChange(val);
    });
  };

  return (
    <textarea
      ref={editorRef}
      defaultValue={content}
      onChange={handleChange}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      className={`absolute inset-0 w-full h-full p-4 resize-none outline-none font-mono text-sm leading-[1.6rem] bg-transparent block transition-colors overflow-y-scroll overflow-x-hidden ${isDark ? 'text-[#D4D4D4]' : 'text-gray-800'}`}
      placeholder="Type your markdown here..."
      spellCheck={false}
      inputMode={showKeyboard ? "none" : undefined}
    />
  );
});

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setDebouncedValue(value);
      });
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function App() {
  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem('markdown_files');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      { name: 'DOCUMENTATION.md', content: DEFAULT_MARKDOWN },
      { name: 'CHANGELOG.md', content: '# Changelog\n\n## [Unreleased]\n- Added real-time preview\n- Added GitHub Flavored Markdown support\n- Added LaTeX Math support\n- Scroll Sync integration' }
    ];
  });
  const [activeFileIndex, setActiveFileIndex] = useState(() => {
    const saved = localStorage.getItem('markdown_active_file_index');
    if (saved) {
      try {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('markdown_files', JSON.stringify(files));
    localStorage.setItem('markdown_active_file_index', activeFileIndex.toString());
  }, [files, activeFileIndex]);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showLatexSymbols, setShowLatexSymbols] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState('');
  const [hoverSize, setHoverSize] = useState({ r: 0, c: 0 });
  const [editingTable, setEditingTable] = useState<{ startLine: number; endLine: number; headers: string[]; rows: string[][]; alignments: string[]; } | null>(null);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latexPaletteRef = useRef<HTMLDivElement>(null);
  const convertMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<{ editor: boolean; preview: boolean }>({ editor: false, preview: false });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (latexPaletteRef.current && !latexPaletteRef.current.contains(event.target as Node)) {
        setShowLatexSymbols(false);
      }
      if (convertMenuRef.current && !convertMenuRef.current.contains(event.target as Node)) {
        setShowConvertMenu(false);
      }
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setShowFileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFile = files[activeFileIndex];
  const deferredContent = useDebounce(activeFile.content, 400);

  const contentRef = useRef(activeFile.content);
  useEffect(() => {
    contentRef.current = activeFile.content;
  }, [activeFile.content]);

  const handleContentChange = useCallback((content: string) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      newFiles[activeFileIndex] = { ...newFiles[activeFileIndex], content };
      return newFiles;
    });
  }, [activeFileIndex]);

  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    
    editor.focus();
    if (start >= prefix.length && end <= text.length - suffix.length && 
        text.substring(start - prefix.length, start) === prefix &&
        text.substring(end, end + suffix.length) === suffix) {
      // Unwrap
      editor.setSelectionRange(start - prefix.length, end + suffix.length);
      document.execCommand('insertText', false, text.substring(start, end));
      queueMicrotask(() => {
        if (editorRef.current) handleContentChange(editorRef.current.value);
      });
      setTimeout(() => {
        editor.setSelectionRange(start - prefix.length, end - prefix.length);
      }, 0);
    } else {
      // Wrap
      const selectedText = text.substring(start, end);
      document.execCommand('insertText', false, prefix + selectedText + suffix);
      queueMicrotask(() => {
        if (editorRef.current) handleContentChange(editorRef.current.value);
      });
      setTimeout(() => {
        const newStart = start + prefix.length;
        const newEnd = start === end ? newStart : end + prefix.length;
        editor.setSelectionRange(newStart, newEnd);
      }, 0);
    }
  }, [handleContentChange]);

  const insertTextAtCursor = useCallback((textToInsert: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const start = editor.selectionStart;
    
    editor.focus();
    document.execCommand('insertText', false, textToInsert);
    queueMicrotask(() => {
      if (editorRef.current) handleContentChange(editorRef.current.value);
    });
    
    setTimeout(() => {
      editor.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  }, []);

  const handleVirtualKeyPress = useCallback((key: string, modifiers: { select?: boolean, ctrl?: boolean } = {}) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    
    // Save scroll to avoid jump
    const currentScroll = editor.scrollTop;

    let cursorStart = editor.selectionStart;
    let cursorEnd = editor.selectionEnd;
    const textBase = editor.value;

    let newContent = textBase;
    let newCursorStart = cursorStart;
    let newCursorEnd = cursorEnd;
    let updateContent = false;

    if (key.startsWith('Arrow')) {
       let pos = (cursorStart === cursorEnd || !modifiers.select) ? cursorEnd : cursorEnd;
       
       if (key === 'ArrowLeft') {
          if (!modifiers.select && cursorStart !== cursorEnd) pos = cursorStart;
          else {
             if (modifiers.ctrl) {
                 const prevSpace = textBase.lastIndexOf(' ', pos - 2);
                 const prevNewline = textBase.lastIndexOf('\n', pos - 2);
                 pos = Math.max(0, Math.max(prevSpace, prevNewline));
             } else {
                 pos = Math.max(0, pos - 1);
             }
          }
       } else if (key === 'ArrowRight') {
          if (!modifiers.select && cursorStart !== cursorEnd) pos = cursorEnd;
          else {
             if (modifiers.ctrl) {
                 const nextSpace = textBase.indexOf(' ', pos + 1);
                 const nextNewline = textBase.indexOf('\n', pos + 1);
                 pos = nextSpace !== -1 && nextNewline !== -1 ? Math.min(nextSpace, nextNewline)
                       : nextSpace !== -1 ? nextSpace : nextNewline !== -1 ? nextNewline : textBase.length;
             } else {
                 pos = Math.min(textBase.length, pos + 1);
             }
          }
       } else if (key === 'ArrowUp') {
          const lines = textBase.substring(0, pos).split('\n');
          const lastLine = lines[lines.length - 1];
          const col = lastLine.length;
          if (lines.length > 1) {
              const prevLine = lines[lines.length - 2];
              const prevCol = Math.min(col, prevLine.length);
              pos -= (lastLine.length + 1 + (prevLine.length - prevCol));
          } else {
              pos = 0;
          }
       } else if (key === 'ArrowDown') {
          const linesBefore = textBase.substring(0, pos).split('\n');
          const col = linesBefore[linesBefore.length - 1].length;
          const afterPos = textBase.substring(pos);
          const nextNewline = afterPos.indexOf('\n');
          if (nextNewline !== -1) {
              const remainderOfCurrentLine = nextNewline;
              const nextLineAfter = afterPos.substring(nextNewline + 1);
              const nextNextNewline = nextLineAfter.indexOf('\n');
              const nextLineLength = nextNextNewline !== -1 ? nextNextNewline : nextLineAfter.length;
              pos += remainderOfCurrentLine + 1 + Math.min(col, nextLineLength);
          } else {
              pos = textBase.length;
          }
       }

       if (modifiers.select) {
           // Standard selection logic: anchor remains where it was. Focus moves.
           // Since we can't reliably know anchor from selectionStart/End (they are ordered), 
           // we assume cursorStart is the anchor if we move right, and cursorEnd is anchor if we move left
           // For simplicity in synthetic selection:
           if (pos > cursorStart) {
               newCursorEnd = pos;
               newCursorStart = (cursorStart === cursorEnd) ? cursorEnd : cursorStart;
           } else {
               newCursorStart = pos;
               newCursorEnd = (cursorStart === cursorEnd) ? cursorStart : cursorEnd;
           }
       } else {
           newCursorStart = pos;
           newCursorEnd = pos;
       }
       
       if (newCursorStart > newCursorEnd) {
           const t = newCursorStart; newCursorStart = newCursorEnd; newCursorEnd = t;
       }
    } else if (modifiers.ctrl && (key.toLowerCase() === 'a')) {
       newCursorStart = 0;
       newCursorEnd = textBase.length;
       updateContent = false;
    } else if (modifiers.ctrl && (key.toLowerCase() === 'b')) {
       wrapSelection('**', '**');
       return;
    } else if (modifiers.ctrl && (key.toLowerCase() === 'i')) {
       wrapSelection('*', '*');
       return;
    } else if (modifiers.ctrl && (key.toLowerCase() === 'u')) {
       wrapSelection('<u>', '</u>');
       return;
    } else if (modifiers.ctrl && (key.toLowerCase() === 'k')) {
       wrapSelection('[', '](url)');
       return;
    } else if (modifiers.ctrl && (key.toLowerCase() === 'z')) {
       if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand('undo');
          queueMicrotask(() => {
              if (editorRef.current) handleContentChange(editorRef.current.value);
          });
       }
       return;
    } else if (modifiers.ctrl && (key.toLowerCase() === 'y')) {
       if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand('redo');
          queueMicrotask(() => {
              if (editorRef.current) handleContentChange(editorRef.current.value);
          });
       }
       return;
    } else if (key === 'Backspace') {
       editor.focus();
       if (cursorStart === cursorEnd && cursorStart > 0) {
          if (modifiers.ctrl) {
             const prevSpace = textBase.lastIndexOf(' ', cursorStart - 2);
             const prevNewline = textBase.lastIndexOf('\n', cursorStart - 2);
             let deleteTo = Math.max(0, Math.max(prevSpace, prevNewline));
             
             editor.setSelectionRange(deleteTo, cursorEnd);
             document.execCommand('delete');
          } else {
             document.execCommand('delete');
          }
       } else if (cursorStart !== cursorEnd) {
          document.execCommand('delete');
       }
       queueMicrotask(() => {
           if (editorRef.current) {
               handleContentChange(editorRef.current.value);
               editorRef.current.scrollTop = currentScroll;
           }
       });
       return;
    } else {
       editor.focus();
       document.execCommand('insertText', false, key);
       queueMicrotask(() => {
           if (editorRef.current) {
               handleContentChange(editorRef.current.value);
               editorRef.current.scrollTop = currentScroll;
           }
       });
       return;
    }

    if (updateContent) {
        handleContentChange(newContent);
    }
    
    // Need to wait for render cycle before setting selection
    queueMicrotask(() => {
      if (editorRef.current) {
        if (document.activeElement !== editorRef.current) {
           editorRef.current.focus({ preventScroll: true });
        }
        editorRef.current.setSelectionRange(newCursorStart, newCursorEnd);
        editorRef.current.scrollTop = currentScroll;
      }
    });
  }, [handleContentChange, wrapSelection]);

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newFile = { name: file.name, content };
      setFiles([...files, newFile]);
      setActiveFileIndex(files.length);
    };
    reader.readAsText(file);
  };

  const insertTable = (rows: number, cols: number) => {
    if (rows === 0 || cols === 0) return;
    const textarea = editorRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;

    const beforeCursor = activeFile.content.substring(0, startPos);
    let tableText = '';
    if (beforeCursor.length > 0 && !beforeCursor.endsWith('\n\n')) {
      tableText += beforeCursor.endsWith('\n') ? '\n' : '\n\n';
    }

    tableText += '|';
    for (let c = 0; c < cols; c++) {
      tableText += ` Header ${c + 1} |`;
    }
    tableText += '\n|';
    for (let c = 0; c < cols; c++) {
      tableText += ' --- |';
    }
    for (let r = 0; r < rows; r++) {
      tableText += '\n|';
      for (let c = 0; c < cols; c++) {
        tableText += ` Cell ${r + 1}-${c + 1} |`;
      }
    }
    tableText += '\n\n';

    const newContent = activeFile.content.substring(0, startPos) + tableText + activeFile.content.substring(endPos);
    handleContentChange(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + tableText.length, startPos + tableText.length);
    }, 0);
    
    setShowTablePicker(false);
    setHoverSize({ r: 0, c: 0 });
  };

  const modifyLines = (startLine: number, endLine: number, modifier: (text: string) => string) => {
    const allLines = contentRef.current.split('\n');
    const targetBlock = allLines.slice(startLine - 1, endLine).join('\n');
    const newBlock = modifier(targetBlock);
    const newLines = [...allLines.slice(0, startLine - 1), newBlock, ...allLines.slice(endLine)];
    handleContentChange(newLines.join('\n'));
  };

  const convertToStandardDetails = (startLine: number, endLine: number) => {
    modifyLines(startLine, endLine, (text) => {
      const match = text.match(/^\s*:::\s*([a-zA-Z]+)(?:[ \t]*([^\r\n]*))?\r?\n([\s\S]*?)(?:\r?\n\s*:::|$)/);
      if (match) {
         const type = match[1];
         let title = match[2] ? match[2].trim() : type.charAt(0).toUpperCase() + type.slice(1);
         if (title.startsWith('[') && title.endsWith(']')) {
             title = title.substring(1, title.length - 1);
         }
         const content = match[3];
         return `<details>\n<summary>${title}</summary>\n\n${content.trim()}\n</details>`;
      }
      return text;
    });
  };

  const convertToLuoguDetails = (startLine: number, endLine: number) => {
     modifyLines(startLine, endLine, (text) => {
         const match = text.match(/<details[^>]*>([\s\S]*?)<\/details>/i);
         if (match) {
             const block = match[1];
             let summary = '';
             let contentText = block;
             const summaryMatch = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
             if (summaryMatch) {
                 summary = summaryMatch[1].trim();
                 contentText = block.replace(summaryMatch[0], '');
             }
             if (summary.toLowerCase() === 'info') summary = '';
             return `:::info${summary ? '[' + summary + ']' : ''}\n${contentText.trim()}\n:::`;
         }
         return text;
     });
  };

  const changeLuoguType = (startLine: number, endLine: number, newType: string) => {
      modifyLines(startLine, endLine, (text) => {
          const lines = text.split('\n');
          if (lines[0].startsWith(':::')) {
              const m = lines[0].match(/^:::\s*([a-zA-Z]+)/);
              if (m) {
                  lines[0] = lines[0].replace(/^:::\s*([a-zA-Z]+)/, `:::${newType}`);
              } else {
                  lines[0] = lines[0].replace(/^:::(\s*)/, `:::${newType}$1`);
              }
          }
          return lines.join('\n');
      });
  };

  const openTableEditor = (startLine: number, endLine: number) => {
    const lines = contentRef.current.split('\n').slice(startLine - 1, endLine);
    const parseRow = (line: string) => {
      let row = line.trim().split('|');
      if (row.length > 0 && row[0].trim() === '') row.shift();
      if (row.length > 0 && row[row.length - 1].trim() === '') row.pop();
      return row.map(c => c.trim());
    };

    const parsedRows = lines.filter(l => l.trim().startsWith('|')).map(parseRow);
    if (parsedRows.length < 2) return;

    const headers = parsedRows[0];
    const alignmentRow = parsedRows[1];
    const alignments = alignmentRow.map(cell => {
      const isLeft = cell.startsWith(':');
      const isRight = cell.endsWith(':');
      if (isLeft && isRight) return 'center';
      if (isRight) return 'right';
      return 'left';
    });
    const rows = parsedRows.slice(2);

    setEditingTable({ startLine, endLine, headers, rows, alignments });
  };

  const saveTable = (editedData: any) => {
    if (!editingTable) return;
    const { headers, rows, alignments } = editedData;
    const numCols = headers.length;
    
    const colWidths = Array(numCols).fill(3);
    headers.forEach((h: string, i: number) => colWidths[i] = Math.max(colWidths[i], h.length));
    rows.forEach((row: string[]) => row.forEach((c: string, i: number) => colWidths[i] = Math.max(colWidths[i], (c||'').length)));
    
    const generateRow = (cells: string[], isAlignment = false) => {
       let str = '|';
       for(let i=0; i<numCols; i++){
         const cell = (cells[i] || '');
         const width = colWidths[i];
         if (isAlignment) {
            let dash = '-'.repeat(width);
            const align = alignments[i];
            if (align === 'center') dash = ':' + '-'.repeat(width > 2 ? width - 2 : 1) + ':';
            else if (align === 'right') dash = '-'.repeat(width > 1 ? width - 1 : 2) + ':';
            else if (align === 'left' && cell.startsWith(':')) dash = ':' + '-'.repeat(width > 1 ? width - 1 : 2);
            
            if (dash.length < 3) dash = dash.padEnd(3, '-');
            str += ` ${dash} |`;
         } else {
            str += ` ${cell.padEnd(width, ' ')} |`;
         }
       }
       return str;
    };
    
    const tableLines = [
      generateRow(headers, false),
      generateRow([], true),
      ...rows.map((r: string[]) => generateRow(r, false))
    ];
    
    const allLines = contentRef.current.split('\n');
    const start = editingTable.startLine - 1;
    const end = editingTable.endLine;
    
    const newLines = [...allLines.slice(0, start), ...tableLines, ...allLines.slice(end)];
    handleContentChange(newLines.join('\n'));
    setEditingTable(null);
  };

  const convertAllDetailsToLuogu = () => {
     let newText = contentRef.current;
     let match;
     let count = 0;
     while ((match = newText.match(/<details[^>]*>([\s\S]*?)<\/details>/i))) {
         if (count++ > 50) break;
         const block = match[1];
         let summary = '';
         let contentText = block;
         const summaryMatch = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
         if (summaryMatch) {
             summary = summaryMatch[1].trim();
             contentText = block.replace(summaryMatch[0], '');
         }
         if (summary.toLowerCase() === 'info') summary = '';
         const replacement = ':::info' + (summary ? '[' + summary + ']' : '') + '\n' + contentText.trim() + '\n:::';
         newText = newText.substring(0, match.index) + replacement + newText.substring(match.index! + match[0].length);
     }
     handleContentChange(newText);
  };
  
  const convertAllDetailsToStandard = () => {
     let newText = contentRef.current;
     let match;
     let count = 0;
     while ((match = newText.match(/(?:^|\n)\s*:::\s*([a-zA-Z]+)(?:[ \t]*([^\r\n]*))?\r?\n([\s\S]*?)(?:\r?\n\s*:::|$)/))) {
         if (count++ > 50) break;
         const startsWithNewline = match[0].startsWith('\n');
         const type = match[1];
         let title = match[2] ? match[2].trim() : type.charAt(0).toUpperCase() + type.slice(1);
         if (title.startsWith('[') && title.endsWith(']')) {
             title = title.substring(1, title.length - 1);
         }
         const content = match[3];
         const summaryHtml = `<summary>${title}</summary>\n\n`;
         const replacement = (startsWithNewline ? '\n' : '') + `<details>\n${summaryHtml}${content.trim()}\n</details>`;
         newText = newText.substring(0, match.index) + replacement + newText.substring(match.index! + match[0].length);
     }
     handleContentChange(newText);
  };

  const getThemeClass = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-mode' : 'light-mode';
    }
    return theme === 'dark' ? 'dark-mode' : 'light-mode';
  };

  const isElementVisible = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    let current: HTMLElement | null = el;
    while (current) {
        if (current.tagName === 'DETAILS' && !(current as HTMLDetailsElement).open) {
            // The details element *itself* is visible (shows summary)
            if (current !== el) {
                const summary = current.querySelector('summary');
                // Elements inside the summary are also visible
                if (!summary || !summary.contains(el)) {
                    return false;
                }
            }
        }
        current = current.parentElement;
    }
    return true;
  };

  const getElementOffset = (el: HTMLElement, container: HTMLElement) => {
    return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  };

  const handleEditorScroll = useCallback(() => {
    if (!editorRef.current || !previewRef.current) return;
    
    // Sync line numbers
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editorRef.current.scrollTop;
    }

    if (isScrolling.current.preview) {
      isScrolling.current.preview = false;
      return;
    }
    isScrolling.current.editor = true;
    
    const editor = editorRef.current;
    const preview = previewRef.current;
    const mirror = mirrorRef.current;

    if (editor.scrollTop <= 0) {
      preview.scrollTop = 0;
      return;
    }
    if (editor.scrollTop + editor.clientHeight >= editor.scrollHeight - 1) {
      preview.scrollTop = preview.scrollHeight - preview.clientHeight;
      return;
    }

    if (!mirror) return;
    
    // Find precise logical line from mirror
    const scrollPos = editor.scrollTop + 16; // Account for paddingTop
    const mirrorLines = mirror.firstElementChild ? mirror.firstElementChild.children : mirror.children;
    if (!mirrorLines || mirrorLines.length === 0) return;

    let targetMirrorLine: HTMLElement | null = null;
    let nextMirrorLine: HTMLElement | null = null;
    let currentLineFraction = 1;

    let left = 0;
    let right = mirrorLines.length - 1;
    let foundIndex = mirrorLines.length;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const el = mirrorLines[mid] as HTMLElement;
        if (el.offsetTop > scrollPos) {
            foundIndex = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    if (foundIndex < mirrorLines.length) {
        nextMirrorLine = mirrorLines[foundIndex] as HTMLElement;
        targetMirrorLine = foundIndex > 0 ? mirrorLines[foundIndex - 1] as HTMLElement : mirrorLines[0] as HTMLElement;
    }

    if (!targetMirrorLine && !nextMirrorLine) {
        targetMirrorLine = mirrorLines[mirrorLines.length - 1] as HTMLElement;
    } else if (!targetMirrorLine && nextMirrorLine) {
        targetMirrorLine = nextMirrorLine;
    }

    if (targetMirrorLine) {
        const line = parseInt(targetMirrorLine.getAttribute('data-mirror-line') || '1', 10);
        currentLineFraction = line;
        
        if (nextMirrorLine && nextMirrorLine !== targetMirrorLine) {
            const nextLine = parseInt(nextMirrorLine.getAttribute('data-mirror-line') || '1', 10);
            const posDiff = nextMirrorLine.offsetTop - targetMirrorLine.offsetTop;
            if (posDiff > 0) {
                const fraction = (scrollPos - targetMirrorLine.offsetTop) / posDiff;
                currentLineFraction = line + Math.max(0, Math.min(1, fraction)) * (nextLine - line);
            }
        }
    }

    const currentLine = currentLineFraction;
    
    // Explicitly check for details open state to skip hidden elements
    const elements = (Array.from(preview.querySelectorAll('[data-line]')) as HTMLElement[]).filter(isElementVisible);
    if (elements.length === 0) return;

    let targetElement: HTMLElement | null = null;
    let nextElement: HTMLElement | null = null;
    
    for (let i = 0; i < elements.length; i++) {
        const line = parseInt(elements[i].getAttribute('data-line') || '1', 10);
        if (line > currentLine) {
            nextElement = elements[i];
            targetElement = i > 0 ? elements[i - 1] : elements[0];
            break;
        }
    }
    
    if (!targetElement && !nextElement) {
        targetElement = elements[elements.length - 1];
    } else if (!targetElement && nextElement) {
        targetElement = nextElement;
    }
    
    if (targetElement) {
       const elTop = getElementOffset(targetElement, preview);
       let targetScrollTop = elTop;

       if (nextElement && nextElement !== targetElement) {
           const targetLine = parseInt(targetElement.getAttribute('data-line') || '1', 10);
           const nextLine = parseInt(nextElement.getAttribute('data-line') || '1', 10);
           
           if (nextLine > targetLine) {
               const fraction = (currentLine - targetLine) / (nextLine - targetLine);
               const nextTop = getElementOffset(nextElement, preview);
               targetScrollTop = elTop + (nextTop - elTop) * Math.max(0, Math.min(1, fraction));
           }
       }
       
       preview.scrollTop = Math.max(0, targetScrollTop - 32);
    }
  }, []);

  const handlePreviewScroll = () => {
    if (!editorRef.current || !previewRef.current) return;
    
    if (isScrolling.current.editor) {
      isScrolling.current.editor = false;
      return;
    }
    isScrolling.current.preview = true;
    
    const editor = editorRef.current;
    const preview = previewRef.current;

    if (preview.scrollTop <= 0) {
      editor.scrollTop = 0;
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = 0;
      return;
    }
    if (preview.scrollTop + preview.clientHeight >= preview.scrollHeight - 1) {
      editor.scrollTop = editor.scrollHeight - editor.clientHeight;
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = editor.scrollTop;
      return;
    }

    const elements = (Array.from(preview.querySelectorAll('[data-line]')) as HTMLElement[]).filter(isElementVisible);
    if (elements.length === 0) return;

    const scrollPos = preview.scrollTop + 32;

    let targetElement: HTMLElement | null = null;
    let nextElement: HTMLElement | null = null;
    let targetElTop = 0;

    for (let i = 0; i < elements.length; i++) {
      const elTop = getElementOffset(elements[i], preview);
      
      if (elTop > scrollPos) {
        nextElement = elements[i];
        targetElement = i > 0 ? elements[i - 1] : elements[0];
        targetElTop = getElementOffset(targetElement, preview);
        break;
      }
    }

    if (!targetElement && !nextElement) {
        targetElement = elements[elements.length - 1];
        targetElTop = getElementOffset(targetElement, preview);
    } else if (!targetElement && nextElement) {
        targetElement = nextElement;
        targetElTop = getElementOffset(targetElement, preview);
    }

    if (targetElement) {
      const targetLine = parseInt(targetElement.getAttribute('data-line') || '1', 10);
      let currentLine = targetLine;

      if (nextElement && nextElement !== targetElement) {
        const nextLine = parseInt(nextElement.getAttribute('data-line') || '1', 10);
        const nextTop = getElementOffset(nextElement, preview);

        const posDiff = nextTop - targetElTop;
        if (posDiff > 0) {
            const fraction = (scrollPos - targetElTop) / posDiff;
            currentLine = targetLine + (nextLine - targetLine) * Math.max(0, Math.min(1, fraction));
        }
      }

      const style = window.getComputedStyle(editor);
      const lh = parseFloat(style.lineHeight);
      const pt = parseFloat(style.paddingTop);
      const lineHeight = isNaN(lh) ? 25.6 : lh;
      const paddingTop = isNaN(pt) ? 16 : pt;

      const mirror = mirrorRef.current;
      let editorScrollTop = 0;

      if (mirror) {
          const mirrorLines = mirror.firstElementChild ? mirror.firstElementChild.children : mirror.children;
          if (!mirrorLines || mirrorLines.length === 0) return;
          const baseLineIndex = Math.max(0, Math.min(mirrorLines.length - 1, Math.floor(currentLine) - 1));
          const nextLineIndex = Math.min(mirrorLines.length - 1, baseLineIndex + 1);
          
          const baseLineEl = mirrorLines[baseLineIndex] as HTMLElement;
          const nextLineEl = mirrorLines[nextLineIndex] as HTMLElement;
          
          if (baseLineEl) {
              const baseTop = baseLineEl.offsetTop;
              let targetTop = baseTop;
              
              if (nextLineEl && nextLineEl !== baseLineEl) {
                  const fraction = currentLine - Math.floor(currentLine);
                  const nextTop = nextLineEl.offsetTop;
                  targetTop = baseTop + (nextTop - baseTop) * fraction;
              }
              editorScrollTop = Math.max(0, targetTop - paddingTop);
          }
      } else {
          editorScrollTop = (currentLine - 1) * lineHeight + paddingTop;
      }
      
      editor.scrollTop = editorScrollTop;
      
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = editor.scrollTop;
      }
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        wrapSelection('**', '**');
      } else if (e.key === 'i') {
        e.preventDefault();
        wrapSelection('*', '*');
      } else if (e.key === 'u') {
        e.preventDefault();
        wrapSelection('<u>', '</u>');
      } else if (e.key === 'k') {
        e.preventDefault();
        wrapSelection('[', '](url)');
      } else if (e.key === 's') {
        e.preventDefault();
        // Just prevent the browser from saving the page. 
        // Our app auto-saves to state automatically.
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      insertTextAtCursor('  ');
    }
  }, [wrapSelection, insertTextAtCursor]);

  const currentTheme = getThemeClass();
  const isDark = currentTheme === 'dark-mode';

  const reactToPrintFn = useReactToPrint({
    contentRef: previewRef,
    documentTitle: activeFile.name.replace(/\.md$/, ''),
    bodyClass: isDark ? 'dark-mode bg-[#121212] text-[#d4d4d4]' : 'bg-white text-gray-900',
  });

  const handleExportPDF = () => {
    alert("To export as PDF, the Print dialog will open. Please select 'Save as PDF' as your destination.");
    reactToPrintFn();
  };

  const handleDownload = () => {
    setSaveFileName(activeFile.name);
    setShowSaveDialog(true);
  };

  const confirmDownload = () => {
    const blob = new Blob([activeFile.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = saveFileName.endsWith('.md') ? saveFileName : `${saveFileName}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveDialog(false);
  };

  const handleNewFile = () => {
    const newName = `Untitled-${files.length + 1}.md`;
    const newFiles = [...files, { name: newName, content: '' }];
    setFiles(newFiles);
    setActiveFileIndex(newFiles.length - 1);
    setShowFileMenu(false);
  };

  const processedContent = useMemo(() => preprocessLatex(deferredContent), [deferredContent]);
  const deferredContentLines = useMemo(() => deferredContent.split('\n'), [deferredContent]);

  const markdownComponents = useMemo(() => ({
    table: ({node, ...props}: any) => {
      const startLine = node?.position?.start?.line;
      const endLine = node?.position?.end?.line;
      return (
        <div className="relative group overflow-x-auto not-prose mb-4 mt-4">
          <button
            onClick={() => {
              if (startLine && endLine) openTableEditor(startLine, endLine);
            }}
            className={`absolute top-2 right-2 flex md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs shadow hover:bg-blue-700 z-10`}
            title="Visual Edit Table"
          >
            <Table size={12} /> Edit
          </button>
          <table {...props} className={`w-full border-collapse border text-sm ${isDark ? 'border-[#333]' : 'border-gray-300'}`} />
        </div>
      );
    },
    thead: (props: any) => <thead {...props} className={isDark ? 'bg-[#2A2A2A]' : 'bg-gray-100'} />,
    th: (props: any) => <th {...props} className={`border p-2 font-semibold text-left ${isDark ? 'border-[#333]' : 'border-gray-200'}`} />,
    td: (props: any) => <td {...props} className={`border p-2 ${isDark ? 'border-[#333]' : 'border-gray-300'}`} />,
    'luogu-details': ({ node, children, ...props }: any) => {
        const type = node.properties?.type || 'info';
        const isOpen = node.properties?.open !== undefined && node.properties?.open !== false && node.properties?.open !== "false";
        const borderColors: any = { info: 'border-blue-500', success: 'border-green-500', warning: 'border-amber-500', error: 'border-red-500' };
        const bgColors: any = { 
          info: 'bg-[#eff6ff]', 
          success: 'bg-[#f0fdf4]', 
          warning: 'bg-[#fffbeb]', 
          error: 'bg-[#fef2f2]' 
        };
        const bgColorsDark: any = { 
          info: 'dark:bg-blue-900/30', 
          success: 'dark:bg-green-900/30', 
          warning: 'dark:bg-amber-900/30', 
          error: 'dark:bg-red-900/30' 
        };

        // Better summary detection
        const childrenArray = React.Children.toArray(children);
        const summaryIndex = childrenArray.findIndex((child: any) => 
            child && typeof child === 'object' && 
            (child.type === 'luogu-summary' || (child.props && child.props.node && child.props.node.tagName === 'luogu-summary') || (child.type && child.type.name === 'luogu-summary'))
        );
        
        let summary = summaryIndex !== -1 ? childrenArray[summaryIndex] : null;
        const content = summaryIndex !== -1 
            ? [...childrenArray.slice(0, summaryIndex), ...childrenArray.slice(summaryIndex + 1)]
            : childrenArray;

        const startLine = node?.position?.start?.line;
        const endLine = node?.position?.end?.line;

        return (
            <div className="relative group not-prose my-6">
              <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={() => startLine && endLine ? convertToStandardDetails(startLine, endLine) : null}
                  className="bg-blue-600/90 text-white px-2 py-1 rounded text-xs shadow hover:bg-blue-700 transition"
                  title="Convert to Standard Details"
                >
                  To Standard
                </button>
                <select 
                  onChange={(e) => {
                      if (e.target.value && startLine && endLine) {
                          changeLuoguType(startLine, endLine, e.target.value);
                      }
                  }}
                  value=""
                  className="bg-indigo-600/90 text-white px-2 py-1 rounded text-xs shadow hover:bg-indigo-700 transition cursor-pointer outline-none appearance-none text-center"
                  title="Change Type (info/success/warning/error)"
                >
                  <option value="" disabled hidden>Type ▾</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <details 
                  className={`border-l-[4px] ${borderColors[type]} ${bgColors[type]} ${bgColorsDark[type]} group/details overflow-hidden rounded-r-md transition-all duration-200 shadow-sm`} 
                  open={isOpen} 
                  {...props} 
              >
                  {summary || (
                      <summary className={`flex items-center gap-2 px-5 py-3 font-bold cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${type === 'info' ? 'text-blue-600 dark:text-blue-400' : ''} [&::-webkit-details-marker]:hidden border-b border-transparent group-open/details:border-black/5 dark:group-open/details:border-white/5`}>
                          {type === 'info' && <Info size={18}/>}
                          {type === 'success' && <CheckCircle2 size={18}/>}
                          {type === 'warning' && <AlertTriangle size={18}/>}
                          {type === 'error' && <XCircle size={18}/>}
                          <span className="flex-1 capitalize">{type}</span>
                          <ChevronDown size={18} className="transform transition-transform duration-200 group-open/details:rotate-180 opacity-70" />
                      </summary>
                  )}
                  <div className={`px-5 pt-4 pb-5 prose prose-sm dark:prose-invert max-w-none prose-headings:border-b-0 prose-headings:pb-0 prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0`}>
                      {content}
                  </div>
              </details>
            </div>
        );
    },
    'luogu-summary': ({ node, children, ...props }: any) => {
        const type = node.properties?.type || 'info';
        const textColors: any = { info: 'text-blue-600 dark:text-blue-400', success: 'text-green-600 dark:text-green-400', warning: 'text-amber-600 dark:text-amber-400', error: 'text-red-600 dark:text-red-400' };
        const textColor = textColors[type] || textColors.info;
        
        return (
            <summary className={`flex items-center gap-2 px-5 py-3 font-bold cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${textColor} [&::-webkit-details-marker]:hidden border-b border-transparent group-open/details:border-black/5 dark:group-open/details:border-white/5`}>
                {type === 'info' && <Info size={18}/>}
                {type === 'success' && <CheckCircle2 size={18}/>}
                {type === 'warning' && <AlertTriangle size={18}/>}
                {type === 'error' && <XCircle size={18}/>}
                <span className="flex-1">{children}</span>
                <ChevronDown size={18} className="transform transition-transform duration-200 group-open/details:rotate-180 opacity-70" />
            </summary>
        );
    },
    details: ({ node, children, ...props }: any) => {
        const childrenArray = React.Children.toArray(children);
        const summaryIndex = childrenArray.findIndex((child: any) => 
            child && typeof child === 'object' && 
            (child.type === 'summary' || (child.props && child.props.node && child.props.node.tagName === 'summary') || (child.type && child.type.name === 'summary'))
        );
        
        let summary = summaryIndex !== -1 ? childrenArray[summaryIndex] : null;
        const content = summaryIndex !== -1 
            ? [...childrenArray.slice(0, summaryIndex), ...childrenArray.slice(summaryIndex + 1)]
            : childrenArray;

        const startLine = node?.position?.start?.line;
        const endLine = node?.position?.end?.line;

        return (
           <div className="relative group not-prose my-6">
              <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={() => startLine && endLine ? convertToLuoguDetails(startLine, endLine) : null}
                  className="bg-blue-600/90 text-white px-2 py-1 rounded text-xs shadow hover:bg-blue-700 transition"
                  title="Convert to Luogu Details"
                >
                  To Luogu
                </button>
              </div>
              <details className="border border-gray-200 dark:border-[#333] rounded-xl shadow-sm group/details bg-white dark:bg-[#1A1A1A] overflow-hidden transition-all duration-200" {...props}>
                  {summary || (
                      <summary className="px-5 py-3.5 font-bold cursor-pointer select-none border-b border-transparent group-open/details:border-gray-200 dark:group-open/details:border-[#333] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors [&::-webkit-details-marker]:hidden flex justify-between items-center">
                          <div className="flex-1 m-0 text-gray-500 dark:text-gray-400">Details</div>
                          <ChevronRight size={18} className="group-open/details:rotate-90 transform transition-transform text-gray-400"/>
                      </summary>
                  )}
                  <div className={`px-5 pt-4 pb-5 prose prose-sm dark:prose-invert max-w-none prose-headings:border-b-0 prose-headings:pb-0 prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0`}>
                      {content}
                  </div>
              </details>
           </div>
        );
    },
    summary: (props: any) => (
        <summary className="px-5 py-3.5 font-bold cursor-pointer select-none border-b border-transparent group-open/details:border-gray-200 dark:group-open/details:border-[#333] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors [&::-webkit-details-marker]:hidden flex justify-between items-center" {...props}>
            <div className="flex-1 m-0">{props.children}</div>
            <ChevronRight size={18} className="group-open/details:rotate-90 transform transition-transform text-gray-400"/>
        </summary>
    )
  }), [isDark]);

  const remarkPluginsMain = useMemo(() => [remarkGfm, remarkMath, remarkAddLineNumbers, remarkDirective, remarkLuogu], []);
  const rehypePluginsMain = useMemo(() => [rehypeKatex, rehypeRaw, rehypeFilterTags, rehypeTableMerge, [rehypeHighlight, { ignoreMissing: true }]] as any, []);

  const renderedMarkdown = useMemo(() => (
    <Markdown 
      remarkPlugins={remarkPluginsMain}
      rehypePlugins={rehypePluginsMain}
      components={markdownComponents as any}
    >
      {processedContent}
    </Markdown>
  ), [processedContent, remarkPluginsMain, rehypePluginsMain, markdownComponents]);

  return (
    <div className={`flex flex-col h-screen font-sans border-r transition-colors duration-200 ${isDark ? 'dark-mode bg-[#0A0A0A] text-[#D4D4D4] border-[#333]' : 'bg-gray-50 text-gray-900 border-gray-200'} overflow-hidden print:h-auto print:overflow-visible`}>
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleOpenFile} 
        accept=".md,.txt" 
        className="hidden" 
      />

      {/* Header */}
      <header className={`h-10 border-b flex items-center px-3 justify-between shrink-0 transition-colors print:hidden ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-2 md:gap-6 h-full min-w-0">
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-[#FF5F56]' : 'bg-red-400'}`}></div>
            <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-[#FFBD2E]' : 'bg-yellow-400'}`}></div>
            <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-[#27C93F]' : 'bg-green-400'}`}></div>
          </div>
          
          {/* Mobile Sidebar Toggle */}
          <button 
            className="md:hidden p-1 -ml-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#333] rounded transition-colors"
            onClick={() => setShowMobileSidebar(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          
          <nav className="hidden md:flex h-full flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {files.map((file, index) => (
              <div 
                key={file.name}
                onClick={() => setActiveFileIndex(index)}
                className={`px-4 flex items-center gap-2 border-r h-full text-xs cursor-pointer select-none transition-all ${
                  index === activeFileIndex 
                    ? (isDark ? 'bg-[#1E1E1E] border-[#333] border-t-2 border-t-blue-500 font-medium text-[#D4D4D4]' : 'bg-gray-50 border-gray-200 border-t-2 border-t-blue-600 font-semibold text-gray-900') 
                    : (isDark ? 'text-gray-500 hover:bg-[#252525] border-[#333]' : 'text-gray-500 hover:bg-gray-100 border-gray-200')
                }`}
              >
                <Type size={14} className={index === activeFileIndex ? (isDark ? "text-blue-400" : "text-blue-600") : "text-gray-500"} />
                {file.name}
              </div>
            ))}
          </nav>
        </div>
        <div className="flex gap-2 sm:gap-4 items-center shrink-0">
          <div className="hidden md:flex items-center gap-1 p-1 bg-black/10 dark:bg-white/5 rounded-lg">
            <button 
              onClick={() => setTheme('light')}
              className={`p-1 rounded ${theme === 'light' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Light Mode"
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`p-1 rounded ${theme === 'dark' ? 'bg-[#333] shadow text-blue-400' : 'text-gray-500 hover:text-gray-400'}`}
              title="Dark Mode"
            >
              <Moon size={14} />
            </button>
            <button 
              onClick={() => setTheme('system')}
              className={`p-1 rounded ${theme === 'system' ? (isDark ? 'bg-[#333] text-blue-400' : 'bg-white text-blue-600 shadow') : 'text-gray-500'}`}
              title="Follow System"
            >
              <Monitor size={14} />
            </button>
          </div>

          <div className="relative" ref={fileMenuRef}>
            <button 
              onClick={() => setShowFileMenu(!showFileMenu)}
              className={`px-3 py-1.5 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1.5 transition-all focus:outline-none ${showFileMenu ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') : (isDark ? 'bg-[#333] hover:bg-[#444] text-[#D4D4D4]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')}`}
            >
              <FileText size={14} />
              <span className="hidden sm:inline">FILE</span>
              <ChevronDown size={12} className={`transition-transform ${showFileMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showFileMenu && (
              <div className={`absolute top-full right-0 mt-1 w-48 rounded-lg shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col py-1">
                  <button 
                    onClick={handleNewFile}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-[#333] text-[#D4D4D4]' : 'hover:bg-gray-100 text-gray-800'}`}
                  >
                    <Plus size={14} className={isDark ? "text-gray-400" : "text-gray-500"} />
                    New File
                  </button>
                  <button 
                    onClick={() => { fileInputRef.current?.click(); setShowFileMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-[#333] text-[#D4D4D4]' : 'hover:bg-gray-100 text-gray-800'}`}
                  >
                    <FolderOpen size={14} className={isDark ? "text-gray-400" : "text-gray-500"} />
                    Open File...
                  </button>
                  <div className={`my-1 border-b ${isDark ? 'border-[#333]' : 'border-gray-100'}`}></div>
                  <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Export As
                  </div>
                  <button 
                    onClick={() => { handleDownload(); setShowFileMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-[#333] text-[#D4D4D4]' : 'hover:bg-gray-100 text-gray-800'}`}
                  >
                    <FileDown size={14} className="text-blue-500" />
                    Markdown (.md)
                  </button>
                  <button 
                    onClick={() => { handleExportPDF(); setShowFileMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-[#333] text-[#D4D4D4]' : 'hover:bg-gray-100 text-gray-800'}`}
                  >
                    <Download size={14} className="text-indigo-500" />
                    PDF Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col flex-1 overflow-hidden print:overflow-visible relative">
        <div className="flex flex-col md:flex-row flex-1 h-full w-full print:block overflow-hidden">
          {/* Editor Pane */}
          <section className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 h-full border-r flex-col font-mono text-sm leading-relaxed overflow-hidden transition-colors print:hidden ${isDark ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-gray-200'}`}>
            <div className={`h-8 border-b pl-4 pr-2 flex items-center justify-between shrink-0 transition-colors ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest shrink-0">
                  Editor
                </span>
                <div className="flex items-center gap-1 relative flex-1 min-w-0">
                  <button 
                    onClick={() => setShowLatexSymbols(!showLatexSymbols)}
                    className={`p-1 rounded flex items-center justify-center transition-colors ${isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    title="LaTeX Symbols"
                  >
                    <Sigma size={14} />
                  </button>
                  <button 
                    onClick={() => setShowTablePicker(!showTablePicker)}
                    className={`p-1 rounded flex items-center justify-center transition-colors ${isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    title="Insert Table"
                  >
                    <Table size={14} />
                  </button>
                  <div className="relative flex items-center h-full" ref={convertMenuRef}>
                    <button 
                      onClick={() => setShowConvertMenu(!showConvertMenu)}
                      className={`p-1 rounded flex items-center justify-center transition-colors ${showConvertMenu ? (isDark ? 'bg-[#333] text-gray-200' : 'bg-gray-200 text-gray-800') : (isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-gray-200 text-gray-500')}`}
                      title="Convert Details Blocks"
                    >
                      <ListCollapse size={14} />
                    </button>
                    {showConvertMenu && (
                      <div className={`fixed top-[72px] left-28 md:absolute md:top-full md:left-auto md:right-0 mt-1 w-[180px] z-[60]`}>
                         <div className={`p-2 rounded-lg shadow-xl border ${isDark ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-gray-200'}`}>
                            <div className="flex flex-col gap-1">
                               <button onClick={() => { convertAllDetailsToLuogu(); setShowConvertMenu(false); }} className={`text-left text-xs px-2 py-1.5 rounded transition ${isDark ? 'hover:bg-[#333] text-[#D4D4D4]' : 'hover:bg-gray-100 text-gray-800'}`}>All to Luogu Details (:::)</button>
                               <button onClick={() => { convertAllDetailsToStandard(); setShowConvertMenu(false); }} className={`text-left text-xs px-2 py-1.5 rounded transition ${isDark ? 'hover:bg-[#333] text-[#D4D4D4]' : 'hover:bg-gray-100 text-gray-800'}`}>All to Standard Details</button>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                  
                  {showLatexSymbols && (
                    <div ref={latexPaletteRef} className={`fixed top-[72px] left-4 right-4 md:absolute md:top-full md:left-0 md:right-auto mt-1 p-3 md:w-[450px] max-w-[450px] rounded-lg shadow-xl z-50 border ${isDark ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-gray-200'}`}>
                      <div className="flex flex-col gap-3 max-h-[40vh] md:max-h-[300px] overflow-y-auto pb-1 pr-1 custom-scrollbar">
                        {LATEX_SYMBOLS.map((category) => (
                          <div key={category.category} className="flex flex-col gap-1">
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{category.category}</div>
                            <div className="flex flex-wrap gap-1">
                              {category.symbols.map((symbol) => (
                                <button
                                  key={symbol.cmd}
                                  onClick={() => {
                                    insertTextAtCursor(symbol.cmd + ' ');
                                    setShowLatexSymbols(false);
                                  }}
                                  title={symbol.cmd}
                                  className={`w-8 h-8 rounded flex items-center justify-center relative group text-base transition-colors ${
                                    isDark ? 'hover:bg-[#333] text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  <span dangerouslySetInnerHTML={{ __html: katex.renderToString(symbol.cmd, { throwOnError: false, displayMode: false }) }} />
                                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                    {symbol.cmd}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showTablePicker && (
                    <div className={`fixed top-[72px] left-4 md:absolute md:top-full md:left-0 mt-1 p-2 rounded shadow-lg z-50 border ${isDark ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-gray-200'}`}>
                      <div className="flex flex-col gap-1" onMouseLeave={() => setHoverSize({ r: 0, c: 0 })}>
                        <div className="text-[10px] text-center mb-1 text-gray-500 font-bold">
                          {hoverSize.r > 0 ? `${hoverSize.c} × ${hoverSize.r}` : 'Insert Table'}
                        </div>
                        {Array.from({ length: 6 }).map((_, r) => (
                          <div key={r} className="flex gap-1">
                            {Array.from({ length: 6 }).map((_, c) => (
                              <div 
                                key={c}
                                onMouseEnter={() => setHoverSize({ r: r + 1, c: c + 1 })}
                                onClick={() => insertTable(hoverSize.r, hoverSize.c)}
                                className={`w-4 h-4 rounded-sm border cursor-pointer transition-colors ${
                                  r < hoverSize.r && c < hoverSize.c 
                                    ? (isDark ? 'bg-blue-500/50 border-blue-400' : 'bg-blue-100 border-blue-300')
                                    : (isDark ? 'border-[#444]' : 'border-gray-200')
                                }`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-[10px] font-mono ${isDark ? 'text-[#5A5A5A]' : 'text-gray-400'}`}>
                {activeFile.content.length} chars
              </span>
            </div>
            <div className="flex-1 relative flex overflow-hidden">
              <div 
                ref={lineNumbersRef}
                className={`hidden sm:flex flex-col items-center py-4 w-10 border-r text-[11px] leading-[1.6rem] select-none shrink-0 overflow-hidden transition-colors ${isDark ? 'bg-[#1A1A1A] border-[#333] text-[#5A5A5A]' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
              >
                <LineNumberComponent length={Math.max(50, deferredContentLines.length + 10)} />
              </div>
              <div className="flex-1 relative w-full h-full overflow-hidden flex">
                <EditorTextarea
                  editorRef={editorRef}
                  content={activeFile.content}
                  onChange={handleContentChange}
                  onScroll={handleEditorScroll}
                  onKeyDown={handleKeyDown}
                  isDark={isDark}
                  showKeyboard={showKeyboard}
                />
                <div 
                  ref={mirrorRef} 
                  className={`absolute inset-0 p-4 font-mono text-sm leading-[1.6rem] whitespace-pre-wrap invisible pointer-events-none break-words overflow-y-scroll overflow-x-hidden`} 
                  aria-hidden="true"
                >
                  <MirrorComponent lines={deferredContentLines} />
                </div>
              </div>
            </div>
          </section>

          {/* Preview Pane */}
          <section className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 h-full flex-col overflow-hidden relative transition-colors ${isDark ? 'bg-[#121212] text-[#D4D4D4]' : 'bg-white text-gray-900'} print:h-auto print:overflow-visible`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div className={`h-8 border-b px-4 flex items-center justify-between shrink-0 transition-colors print:hidden ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
               <span className="text-[10px] font-bold text-gray-500 uppercase">Live Preview</span>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 <span className="text-[10px] text-gray-400">Syncing...</span>
               </div>
            </div>
            <div 
              ref={previewRef}
              className="flex-1 p-8 overflow-y-auto w-full print:p-0 print:overflow-visible"
              onScroll={handlePreviewScroll}
            >
              <div id="preview-content" className={`prose prose-sm max-w-none prose-headings:border-b prose-headings:pb-2 prose-code:before:content-none prose-code:after:content-none transition-all ${isDark ? 'prose-invert prose-headings:border-[#333] text-[#D4D4D4]' : 'prose-slate prose-headings:border-gray-100 text-gray-800'}`}>
                {renderedMarkdown}
              </div>
            </div>
          </section>
        </div>
        
        {/* Virtual Keyboard rendering for Mobile */}
        {showKeyboard && mobileTab === 'editor' && (
          <div className="md:hidden shrink-0">
             <VirtualKeyboard isDark={isDark} onKeyPress={handleVirtualKeyPress} />
          </div>
        )}
      </main>

      {/* Mobile Tab Navigation & Keyboard Toggle */}
      <div className={`md:hidden flex h-14 border-t items-center justify-around shrink-0 transition-colors print:hidden ${isDark ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-gray-200'}`}>
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${mobileTab === 'editor' ? 'text-blue-500' : 'text-gray-500'}`}
        >
          <Code size={20} />
          <span className="text-[10px] font-semibold">Editor</span>
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${mobileTab === 'preview' ? 'text-blue-500' : 'text-gray-500'}`}
        >
          <Eye size={20} />
          <span className="text-[10px] font-semibold">Preview</span>
        </button>
        <button
          onClick={() => setShowKeyboard(!showKeyboard)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${showKeyboard ? 'text-blue-500' : 'text-gray-500'}`}
        >
          <Keyboard size={20} />
          <span className="text-[10px] font-semibold">Keyboard</span>
        </button>
      </div>

      {/* Footer Status Bar */}
      <footer className="hidden md:flex h-6 bg-[#007ACC] text-white items-center px-3 justify-between text-[11px] font-medium shrink-0 print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
             <Type size={12} />
             Main*
          </div>
          <div>UTF-8</div>
        </div>
        <div className="flex items-center gap-4 h-full">
          <div>Markdown</div>
          <div className="flex items-center gap-1">
             <span className="opacity-80">Characters:</span> {activeFile.content.length}
          </div>
          <div className="bg-white/20 px-2 flex items-center h-full">
             PREVIEW SYNCED
          </div>
        </div>
      </footer>

      {editingTable && (
        <TableEditorModal 
          key={editingTable ? `${editingTable.startLine}-${editingTable.endLine}` : 'none'}
          data={editingTable} 
          onClose={() => setEditingTable(null)} 
          onSave={saveTable} 
          isDark={isDark} 
        />
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setShowSaveDialog(false);
        }}>
          <div className={`w-full max-w-sm rounded-xl shadow-2xl p-6 ${isDark ? 'bg-[#1E1E1E] text-white' : 'bg-white text-gray-900'}`}>
            <h3 className="text-lg font-bold mb-4">Save Markdown File</h3>
            <div className="mb-6">
              <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>File Name</label>
              <div className="flex border rounded overflow-hidden">
                <input
                  type="text"
                  value={saveFileName.replace(/\.md$/, '')}
                  onChange={(e) => setSaveFileName(e.target.value)}
                  className={`flex-1 px-3 py-2 outline-none w-full bg-transparent ${isDark ? 'text-white' : 'text-gray-900 border-gray-300'}`}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmDownload();
                    if (e.key === 'Escape') setShowSaveDialog(false);
                  }}
                />
                <div className={`px-3 py-2 border-l ${isDark ? 'bg-[#333] border-[#444] text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>.md</div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowSaveDialog(false)}
                className={`px-4 py-2 text-sm font-medium rounded transition ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded shadow transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar */}
      <div 
        className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${showMobileSidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50"
          onClick={() => setShowMobileSidebar(false)}
        />
        
        {/* Sidebar Content */}
        <div 
          className={`absolute top-0 left-0 bottom-0 w-64 shadow-2xl transition-transform duration-300 transform flex flex-col ${isDark ? 'bg-[#121212] border-r border-[#333] text-[#D4D4D4]' : 'bg-white border-r border-gray-200 text-gray-900'} ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
            <span className="font-bold uppercase tracking-wider text-sm">Files</span>
            <button onClick={() => setShowMobileSidebar(false)} className="p-1 -mr-1 rounded hover:bg-black/10 dark:hover:bg-white/10">
              <X size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {files.map((file, index) => (
              <button
                key={file.name}
                onClick={() => {
                  setActiveFileIndex(index);
                  setShowMobileSidebar(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 text-sm transition-colors text-left ${
                  index === activeFileIndex 
                    ? (isDark ? 'bg-[#1E1E1E] text-blue-400 font-medium' : 'bg-blue-50 text-blue-600 font-semibold')
                    : (isDark ? 'text-gray-400 hover:bg-[#1A1A1A]' : 'text-gray-600 hover:bg-gray-50')
                }`}
              >
                <Type size={16} className={index === activeFileIndex ? (isDark ? "text-blue-400" : "text-blue-600") : "text-gray-400"} />
                <span className="flex-1 truncate">{file.name}</span>
                {index === activeFileIndex && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4">
          <div className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${isDark ? 'bg-[#2A2A2A] border-[#444] text-gray-200' : 'bg-gray-900 border-gray-800 text-white'}`}>
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}

const TableEditorModal = ({ onClose, data, onSave, isDark }: any) => {
  const [headers, setHeaders] = useState<string[]>([...data.headers]);
  const [rows, setRows] = useState<string[][]>(data.rows.map((r: string[]) => [...r]));
  const [alignments, setAlignments] = useState<string[]>([...data.alignments]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Removed useEffect sync as we now use 'key' to reset component state on new data.

  const numCols = headers.length;

  const previewMarkdown = useMemo(() => {
    let md = '|';
    headers.forEach(h => md += ` ${h || ' '} |`);
    md += '\n|';
    headers.forEach((_, i) => {
      const a = alignments[i];
      if (a === 'center') md += ' :---: |';
      else if (a === 'right') md += ' ---: |';
      else md += ' --- |';
    });
    md += '\n';
    rows.forEach(row => {
      md += '|';
      row.forEach(c => md += ` ${c || ' '} |`);
      md += '\n';
    });
    return md;
  }, [headers, rows, alignments]);

  const processedPreviewMarkdown = useMemo(() => preprocessLatex(previewMarkdown), [previewMarkdown]);

  const renderedPreview = useMemo(() => (
    <Markdown 
      remarkPlugins={[remarkGfm, remarkMath, remarkDirective, remarkLuogu]}
      rehypePlugins={[rehypeKatex, rehypeRaw, rehypeFilterTags, rehypeTableMerge]}
      components={{
        table: (props) => <table {...props} className={`w-full border-collapse border text-sm m-0 ${isDark ? 'border-[#333]' : 'border-gray-300'}`} />,
        thead: (props) => <thead {...props} className={isDark ? 'bg-[#2A2A2A]' : 'bg-gray-100'} />,
        th: (props) => <th {...props} className={`border p-2 font-semibold ${isDark ? 'border-[#333]' : 'border-gray-300'}`} />,
        td: (props) => <td {...props} className={`border p-2 ${isDark ? 'border-[#333]' : 'border-gray-300'}`} />
      }}
    >
      {processedPreviewMarkdown}
    </Markdown>
  ), [processedPreviewMarkdown, isDark]);

  const updateHeader = (colIndex: number, val: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = val;
    setHeaders(newHeaders);
  };

  const updateCell = (rowIndex: number, colIndex: number, val: string) => {
    const newRows = [...rows];
    newRows[rowIndex][colIndex] = val;
    setRows(newRows);
  };

  const addColumn = () => {
    setHeaders([...headers, `Header ${numCols + 1}`]);
    setRows(rows.map(r => [...r, '']));
    setAlignments([...alignments, 'left']);
  };

  const removeColumn = (colIndex: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== colIndex));
    setRows(rows.map(r => r.filter((_, i) => i !== colIndex)));
    setAlignments(alignments.filter((_, i) => i !== colIndex));
  };

  const addRow = () => {
    setRows([...rows, Array(numCols).fill('')]);
  };

  const removeRow = (rowIndex: number) => {
    setRows(rows.filter((_, i) => i !== rowIndex));
  };

  const updateAlignment = (colIndex: number, align: string) => {
    const newAlignments = [...alignments];
    newAlignments[colIndex] = align;
    setAlignments(newAlignments);
  };

  const moveColumn = (colIndex: number, direction: number) => {
    const newIndex = colIndex + direction;
    if (newIndex < 0 || newIndex >= headers.length) return;

    const swap = (arr: any[]) => {
      const newArr = [...arr];
      [newArr[colIndex], newArr[newIndex]] = [newArr[newIndex], newArr[colIndex]];
      return newArr;
    };

    setHeaders(swap(headers));
    setAlignments(swap(alignments));
    setRows(rows.map(row => swap(row)));
  };

  const moveRow = (rowIndex: number, direction: number) => {
    const newIndex = rowIndex + direction;
    if (newIndex < 0 || newIndex >= rows.length) return;

    const newRows = [...rows];
    [newRows[rowIndex], newRows[newIndex]] = [newRows[newIndex], newRows[rowIndex]];
    setRows(newRows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 md:p-4 transition-opacity duration-200" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={`flex flex-col w-full h-[95vh] md:max-w-[95vw] md:h-[90vh] rounded-2xl shadow-2xl ${isDark ? 'bg-[#1E1E1E] text-[#D4D4D4] border border-[#333]' : 'bg-white text-gray-900 border border-gray-100'} overflow-hidden shadow-black/40`}>
         {/* Dialog Header */}
         <div className={`px-5 py-4 border-b flex justify-between items-center ${isDark ? 'border-[#333] bg-black/20' : 'border-gray-200 bg-slate-50'}`}>
           <h3 className="font-bold flex items-center gap-2.5 text-base text-blue-600 dark:text-blue-400">
             <span className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-400/10">
               <Table size={18} />
             </span> 
             Visual Table Editor
           </h3>
           <button onClick={onClose} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-black/5 text-gray-500 hover:text-gray-950'} active:scale-95`}><X size={18}/></button>
         </div>
         
         {/* Responsive Segments (Only on Mobile screens) */}
         <div className="flex justify-center p-3 border-b md:hidden border-gray-200 dark:border-[#333] bg-slate-50/50 dark:bg-black/10">
           <div className={`flex p-0.5 rounded-xl text-xs font-bold w-full max-w-[280px] ${isDark ? 'bg-[#1C1C1E]' : 'bg-gray-200/60'}`}>
             <button 
               onClick={() => setActiveTab('editor')}
               className={`flex-1 py-1.5 rounded-lg transition-all duration-150 ${activeTab === 'editor' ? (isDark ? 'bg-[#48484A] text-white shadow-xs font-bold' : 'bg-white text-black shadow-xs font-semibold') : 'text-gray-500 hover:text-[#bbb] dark:hover:text-gray-300'}`}
             >
               Editor Table
             </button>
             <button 
               onClick={() => setActiveTab('preview')}
               className={`flex-1 py-1.5 rounded-lg transition-all duration-150 ${activeTab === 'preview' ? (isDark ? 'bg-[#48484A] text-white shadow-xs font-bold' : 'bg-white text-black shadow-xs font-semibold') : 'text-gray-500 hover:text-[#bbb] dark:hover:text-gray-300'}`}
             >
               Live Preview
             </button>
           </div>
         </div>
         
         <div className="flex-1 flex overflow-hidden">
            {/* Editor Side */}
            <div className={`flex-1 flex flex-col md:border-r ${isDark ? 'border-[#333] bg-black/5' : 'border-gray-200 bg-gray-50/50'} overflow-hidden ${activeTab === 'editor' ? 'flex' : 'hidden md:flex'}`}>
               <div className="p-3 flex gap-2">
                  <button onClick={addColumn} className="px-4 py-2 md:px-3 md:py-1.5 shadow-sm bg-blue-600 font-semibold text-white rounded-lg text-xs hover:bg-blue-700 active:scale-95 duration-100 transition-all">Add Column</button>
                  <button onClick={addRow} className="px-4 py-2 md:px-3 md:py-1.5 shadow-sm bg-blue-600 font-semibold text-white rounded-lg text-xs hover:bg-blue-700 active:scale-95 duration-100 transition-all">Add Row</button>
               </div>
               
               <div className="flex-1 overflow-auto p-4">
                   <table className={`w-fit border-collapse shadow-sm rounded-lg border mb-8 ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-white border-gray-200'}`}>
                     <thead>
                       <tr>
                         {headers.map((h, i) => (
                           <th key={i} className={`border p-2.5 ${isDark ? 'border-[#333] bg-[#2A2A2A]' : 'border-gray-300 bg-gray-100'} group min-w-[220px] align-top`}>
                             <div className="flex flex-col gap-2.5">
                               <div className="flex items-center justify-between gap-1">
                                  <div className="flex bg-black/10 dark:bg-white/10 rounded-lg p-0.5">
                                     <button onClick={() => updateAlignment(i, 'left')} className={`p-1 rounded ${alignments[i] === 'left' || !alignments[i] ? 'bg-white dark:bg-[#333] shadow-sm text-blue-500' : 'opacity-50 hover:opacity-100'}`} title="Align Left"><AlignLeft size={13} /></button>
                                     <button onClick={() => updateAlignment(i, 'center')} className={`p-1 rounded ${alignments[i] === 'center' ? 'bg-white dark:bg-[#333] shadow-sm text-blue-500' : 'opacity-50 hover:opacity-100'}`} title="Align Center"><AlignCenter size={13} /></button>
                                     <button onClick={() => updateAlignment(i, 'right')} className={`p-1 rounded ${alignments[i] === 'right' ? 'bg-white dark:bg-[#333] shadow-sm text-blue-500' : 'opacity-50 hover:opacity-100'}`} title="Align Right"><AlignRight size={13} /></button>
                                  </div>
                                  <div className="flex gap-1.5">
                                     <div className="flex bg-black/10 dark:bg-white/10 rounded-lg p-0.5">
                                       <button onClick={() => moveColumn(i, -1)} disabled={i === 0} className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed" title="Move Left"><ChevronLeft size={13}/></button>
                                       <button onClick={() => moveColumn(i, 1)} disabled={i === headers.length - 1} className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed" title="Move Right"><ChevronRight size={13}/></button>
                                     </div>
                                     <button onClick={() => removeColumn(i)} className="text-red-500 hover:bg-red-500/10 p-1 rounded-md transition" title="Delete Column"><Trash2 size={13}/></button>
                                  </div>
                               </div>
                               <input value={h || ''} onChange={e => updateHeader(i, e.target.value)} className={`w-full bg-transparent outline-none p-1.5 text-sm font-semibold rounded-md ${isDark ? 'focus:bg-[#333]' : 'focus:bg-white border border-transparent focus:border-gray-200'}`} placeholder={`Header ${i+1}`} />
                             </div>
                           </th>
                         ))}
                         <th className="w-28 border-transparent"></th>
                       </tr>
                     </thead>
                     <tbody>
                       {rows.map((row, rIndex) => (
                          <tr key={rIndex} className="group">
                            {row.map((cell, cIndex) => (
                               <td key={cIndex} className={`border p-1 relative ${isDark ? 'border-[#333] hover:bg-[#2A2A2A]' : 'border-gray-300 hover:bg-gray-50'} transition-colors`}>
                                  <textarea 
                                    value={cell||''} 
                                    onChange={e => updateCell(rIndex, cIndex, e.target.value)} 
                                    className={`w-full bg-transparent outline-none p-1.5 text-sm rounded-md resize-none ${isDark ? 'focus:bg-[#333]' : 'focus:bg-white border border-transparent focus:border-gray-200'}`} 
                                    rows={1} 
                                    onInput={(e) => {
                                      const target = e.target as HTMLTextAreaElement;
                                      target.style.height = 'auto';
                                      target.style.height = `${target.scrollHeight}px`;
                                    }}
                                    style={{textAlign: (alignments[cIndex] || 'left') as any}}
                                  />
                               </td>
                            ))}
                            <td className="w-28 p-1 pl-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/5 dark:bg-white/5 md:bg-transparent">
                               <div className="flex items-center gap-1.5">
                                  <div className="flex bg-black/10 dark:bg-white/10 rounded-lg p-0.5 animate-fade-in">
                                    <button onClick={() => moveRow(rIndex, -1)} disabled={rIndex === 0} className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed" title="Move Up"><ChevronUp size={14}/></button>
                                    <button onClick={() => moveRow(rIndex, 1)} disabled={rIndex === rows.length - 1} className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed" title="Move Down"><ChevronDown size={14}/></button>
                                  </div>
                                  <button onClick={() => removeRow(rIndex)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition" title="Delete Row">
                                    <Trash2 size={13} />
                                  </button>
                               </div>
                            </td>
                          </tr>
                       ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Preview Side */}
            <div className={`flex-1 flex flex-col p-6 overflow-auto ${isDark ? 'bg-[#121212]' : 'bg-white'} ${activeTab === 'preview' ? 'flex' : 'hidden md:flex'}`}>
               <span className="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-widest">Live Preview</span>
               <div className={`prose prose-sm max-w-none prose-code:before:content-none prose-code:after:content-none ${isDark ? 'prose-invert' : 'prose-slate'}`}>
                  {renderedPreview}
               </div>
            </div>
         </div>
         
         <div className={`px-4 py-3 border-t flex justify-between items-center bg-black/5 dark:bg-black/20 ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
           <div className="text-xs text-gray-500">Auto-preview shows how your table will render in Markdown.</div>
           <div className="flex gap-2">
             <button onClick={onClose} className={`px-4 py-2 font-medium text-sm rounded transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>Cancel</button>
             <button onClick={() => onSave({ headers, rows, alignments })} className="px-6 py-2 shadow font-medium text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition">Save Table</button>
           </div>
         </div>
      </div>
    </div>
  );
}
