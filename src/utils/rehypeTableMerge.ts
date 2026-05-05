import { visit } from 'unist-util-visit';

export default function rehypeTableMerge() {
  return (tree: any) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'table') return;

      const grid: any[][] = [];
      const trs: any[] = [];

      // Find all rows and build a basic grid
      const findRows = (n: any) => {
        if (n.tagName === 'tr') {
          trs.push(n);
          const cells: any[] = [];
          if (n.children) {
            n.children.forEach((child: any) => {
              if (child.tagName === 'td' || child.tagName === 'th') {
                cells.push(child);
              }
            });
          }
          grid.push(cells);
          return;
        }
        if (n.children) {
          n.children.forEach(findRows);
        }
      };
      
      node.children.forEach(findRows);
      if (grid.length === 0) return;

      // Track which master cell (by its grid coordinates) owns each coordinate in the resulting layout
      const masterMatrix: { r: number, c: number }[][] = grid.map((row, r) => 
        row.map((_, c) => ({ r, c }))
      );
      
      const toBeRemoved = new Set<any>();

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const cell = grid[r][c];
          if (toBeRemoved.has(cell)) continue;
          
          let content = '';
          const getText = (n: any) => {
            if (n.type === 'text') content += n.value;
            if (n.children) n.children.forEach(getText);
          };
          getText(cell);
          content = content.trim();

          if (content === '<' && c > 0) {
            // Merge left: Find the master cell of the space to the left
            const masterPos = masterMatrix[r][c - 1];
            const masterCell = grid[masterPos.r][masterPos.c];
            
            masterCell.properties = masterCell.properties || {};
            masterCell.properties.colSpan = (masterCell.properties.colSpan || 1) + 1;
            
            toBeRemoved.add(cell);
            masterMatrix[r][c] = masterPos;
            
          } else if (content === '^' && r > 0) {
            // Merge up: Find the master cell of the space above
            const masterPos = masterMatrix[r - 1][c];
            const masterCell = grid[masterPos.r][masterPos.c];
            
            // When merging vertically, we must swallow ALL cells in the current row 
            // that fall within the width of the master cell
            const startCol = masterPos.c;
            const endCol = startCol + (masterCell.properties?.colSpan || 1);
            
            for (let currC = startCol; currC < endCol; currC++) {
              if (currC < grid[r].length) {
                const swallowedCell = grid[r][currC];
                toBeRemoved.add(swallowedCell);
                masterMatrix[r][currC] = masterPos;
              }
            }
            
            masterCell.properties = masterCell.properties || {};
            masterCell.properties.rowSpan = (masterCell.properties.rowSpan || 1) + 1;
          }
        }
      }

      // Final pass: clean up rows by removing merged-away elements
      trs.forEach(tr => {
        if (tr.children) {
          tr.children = tr.children.filter((child: any) => !toBeRemoved.has(child));
        }
      });
    });
  };
}
