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

  function visit(node, instanceId, path) {
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
      const strokes = 'strokes' in node ? node.strokes : undefined;
      const hasPaintedStroke = Array.isArray(strokes)
        ? strokes.some(paint => paint.visible !== false && paint.opacity !== 0)
        : null;
      findings.push({ id: node.id, name: node.name, type: node.type, instanceId, path, hasPaintedStroke, values });
    }
    if ('children' in node) {
      const owner = node.type === 'INSTANCE' ? node.id : instanceId;
      node.children.forEach((child, index) => visit(child, owner, path + "/" + index));
    }
  }

  visit(root, null, ".");
  return { checkedNodes, affectedNodes: findings.length, findings };
}

// Classify each value using the layer's role in this design.
function buildIntegerLedger(audit, classify) {
  const categories = ['layout', 'artwork', 'inactiveStroke', 'unresolved'];
  const rows = [];
  const counts = Object.fromEntries(categories.map(category => [category, { nodes: new Set(), values: 0 }]));
  for (const finding of audit.findings) {
    for (const [property, value] of Object.entries(finding.values)) {
      let decision;
      if (property.startsWith('stroke') && finding.hasPaintedStroke === false) {
        decision = { category: 'inactiveStroke', reason: '描画される線がない' };
      } else if (classify) {
        decision = classify(finding, property);
      }
      if (!decision) decision = { category: 'unresolved', reason: '配置・描画の用途を要確認' };
      if (!categories.includes(decision.category) || !decision.reason?.trim()) {
        throw new Error('Invalid classification for ' + finding.id + ' / ' + property);
      }
      const { id, name, path, instanceId } = finding;
      rows.push({ id, name, path, instanceId, property, value, category: decision.category, reason: decision.reason });
      counts[decision.category].nodes.add(id);
      counts[decision.category].values++;
    }
  }
  const summary = {};
  for (const category of categories) {
    summary[category] = { nodes: counts[category].nodes.size, values: counts[category].values };
  }
  return { checkedNodes: audit.checkedNodes, affectedNodes: audit.affectedNodes, totalValues: rows.length, summary, rows };
}
