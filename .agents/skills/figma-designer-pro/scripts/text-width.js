// Read-only. Inspect instance descendants, including hidden text, on a loaded page.
function auditTextWidths(root) {
  const previous = figma.skipInvisibleInstanceChildren;
  try {
    figma.skipInvisibleInstanceChildren = false;
    const rows = [];
    function visit(node, fixedAncestors) {
      const parent = node.parent;
      const inFlow = parent && ['HORIZONTAL', 'VERTICAL', 'GRID'].includes(parent.layoutMode)
        && node.layoutPositioning !== 'ABSOLUTE';
      if (node.type === 'TEXT') {
        const horizontal = inFlow ? node.layoutSizingHorizontal : null;
        const autoResize = node.textAutoResize;
        rows.push({
          id: node.id, text: node.characters.slice(0, 32), horizontal, autoResize,
          width: node.width, minWidth: node.minWidth, maxWidth: node.maxWidth,
          fixedWidth: inFlow ? horizontal === 'FIXED' : autoResize !== 'WIDTH_AND_HEIGHT',
          fixedAncestors
        });
      } else if ('children' in node) {
        const fixed = node !== root && node.type !== 'GROUP' && node.layoutSizingHorizontal === 'FIXED';
        const ancestors = fixed ? [...fixedAncestors, node.id] : fixedAncestors;
        for (const child of node.children) visit(child, ancestors);
      }
    }
    visit(root, []);
    return rows;
  } finally {
    figma.skipInvisibleInstanceChildren = previous;
  }
}
