// Read-only. Measure direct, visible content in the coordinate system of each parent.
function auditContentFit(root) {
  const findings = [];
  function visit(parent) {
    if (!('children' in parent) || parent.visible === false) return;
    const auto = 'layoutMode' in parent && parent.layoutMode !== 'NONE';
    const isFrame = ['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'].includes(parent.type);
    for (const child of parent.children) {
      if (child.visible === false) continue;
      if (isFrame && (!auto || child.layoutPositioning !== 'ABSOLUTE')) {
        const [[a, b, x], [c, d, y]] = child.relativeTransform;
        const dx = a * child.width, dy = b * child.height;
        const ex = c * child.width, ey = d * child.height;
        const left = x + Math.min(0, dx) + Math.min(0, dy);
        const right = x + Math.max(0, dx) + Math.max(0, dy);
        const top = y + Math.min(0, ex) + Math.min(0, ey);
        const bottom = y + Math.max(0, ex) + Math.max(0, ey);
        if (left < 0 || top < 0 || right > parent.width || bottom > parent.height) {
          findings.push({
            parentId: parent.id, parentName: parent.name, childId: child.id, childName: child.name,
            width: parent.width, height: parent.height, left, right, top, bottom,
            horizontal: parent.layoutSizingHorizontal, vertical: parent.layoutSizingVertical,
            clipsContent: parent.clipsContent
          });
        }
      }
      visit(child);
    }
  }
  visit(root);
  return findings;
}
