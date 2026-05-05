import { visit } from 'unist-util-visit';

export default function remarkLuogu() {
  return (tree: any) => {
    visit(tree, 'containerDirective', (node) => {
      if (['info', 'success', 'warning', 'error'].includes(node.name)) {
        const data = node.data || (node.data = {});
        data.hName = 'luogu-details';
        data.hProperties = {
          type: node.name,
          open: node.attributes?.open !== undefined || 'open' in (node.attributes || {})
        };
      }
    });

    visit(tree, 'paragraph', (node, index, parent) => {
      if (node.data && node.data.directiveLabel) {
        node.data.hName = 'luogu-summary';
        // copy type from parent if it's a luogu container
        if (parent && parent.type === 'containerDirective') {
           node.data.hProperties = {
               type: parent.name
           };
        }
      }
    });
  };
}
