// Pass a loaded scene node. This function only reads the subtree.
function auditIntegerLayout(root) {
  const properties = [
    'x', 'y', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
    'itemSpacing', 'counterAxisSpacing', 'gridRowGap', 'gridColumnGap',
    'strokeWeight', 'strokeTopWeight', 'strokeBottomWeight',
    'strokeLeftWeight', 'strokeRightWeight', 'cornerRadius',
    'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'
  ];
  const findings = [];
  let checkedNodes = 0;

  function visit(node, instanceId) {
    checkedNodes++;
    const values = {};
    function check(property, value) {
      if (typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value)) {
        values[property] = value;
      }
    }
    for (const property of properties) {
      if (property in node) check(property, node[property]);
    }
    for (const property of ['gridRowSizes', 'gridColumnSizes']) {
      if (!(property in node) || !Array.isArray(node[property])) continue;
      node[property].forEach((track, index) => {
        if (track.type === 'FIXED') check(property + '[' + index + ']', track.value);
      });
    }
    if (node.type === 'TEXT') {
      if (typeof node.fontSize === 'number') {
        check('fontSize', node.fontSize);
      } else {
        for (const run of node.getStyledTextSegments(['fontSize'])) {
          check('fontSize[' + run.start + ',' + run.end + ')', run.fontSize);
        }
      }
    }
    if (Object.keys(values).length) {
      findings.push({ id: node.id, name: node.name, type: node.type, instanceId, values });
    }
    if ('children' in node) {
      const owner = node.type === 'INSTANCE' ? node.id : instanceId;
      for (const child of node.children) visit(child, owner);
    }
  }

  visit(root, null);
  return { checkedNodes, affectedNodes: findings.length, findings };
}
