// src/index.ts
import { declare } from "@babel/helper-plugin-utils";
var src_default = declare((api, options) => {
  const { types: t } = api;
  const isAlphanumericLiteral = (node) => t.isNumericLiteral(node) || t.isStringLiteral(node);
  const isTSNLiteral = (node) => t.isTemplateLiteral(node) || isAlphanumericLiteral(node);
  const stringRaw = (val) => JSON.stringify(val).slice(1, -1);
  const alphanumericRawValue = (node) => t.isStringLiteral(node) ? stringRaw(node.value) : node.value.toString();
  const checkTemplateNodeToString = (node) => {
    if (node.expressions.length === 0) {
      const value = node.quasis.map((q) => q.value.cooked ?? "").join("");
      return t.stringLiteral(value);
    }
    return node;
  };
  const mergeTSNLiteral = (left, right) => {
    if (t.isNumericLiteral(left) && t.isNumericLiteral(right)) {
      return t.numericLiteral(left.value + right.value);
    }
    if (isAlphanumericLiteral(left) && isAlphanumericLiteral(right)) {
      return t.stringLiteral(left.value.toString() + right.value);
    }
    if (t.isTemplateLiteral(left) && t.isTemplateLiteral(right)) {
      const leftLastRaw = left.quasis[left.quasis.length - 1].value.raw;
      const rightFirstRaw = right.quasis[0].value.raw;
      const quasis = [...left.quasis.slice(0, -1), t.templateElement({ raw: leftLastRaw + rightFirstRaw }), ...right.quasis.slice(1)];
      return checkTemplateNodeToString(t.templateLiteral(quasis, [...left.expressions, ...right.expressions]));
    } else if (t.isTemplateLiteral(left) && isAlphanumericLiteral(right)) {
      const leftLastRaw = left.quasis[left.quasis.length - 1].value.raw;
      const rightVal = alphanumericRawValue(right);
      const quasis = [...left.quasis.slice(0, -1), t.templateElement({ raw: leftLastRaw + rightVal })];
      return checkTemplateNodeToString(t.templateLiteral(quasis, left.expressions));
    } else if (isAlphanumericLiteral(left) && t.isTemplateLiteral(right)) {
      const leftVal = alphanumericRawValue(left);
      const rightFirstRaw = right.quasis[0].value.raw;
      const quasis = [t.templateElement({ raw: leftVal + rightFirstRaw }), ...right.quasis.slice(1)];
      return checkTemplateNodeToString(t.templateLiteral(quasis, right.expressions));
    } else {
      throw Error("exhausted");
    }
  };
  const mergeAdjacentLiteralsInBinaryExpression = (path) => {
    let left = path.node.left;
    let right = path.node.right;
    if (t.isBinaryExpression(left)) {
      mergeAdjacentLiteralsInBinaryExpression(path.get("left"));
    } else if (t.isTemplateLiteral(left)) {
      checkReplaceLiteralTemplate(path.get("left"));
    }
    if (t.isBinaryExpression(right)) {
      mergeAdjacentLiteralsInBinaryExpression(path.get("right"));
    } else if (t.isTemplateLiteral(right)) {
      checkReplaceLiteralTemplate(path.get("right"));
    }
    right = path.node.right;
    if (!isTSNLiteral(right) || path.node.operator !== "+") {
      return;
    }
    left = path.node.left;
    if (isTSNLiteral(left)) {
      path.replaceWith(mergeTSNLiteral(left, right));
      return;
    }
    if (t.isBinaryExpression(left)) {
      const leftLast = left.right;
      if (!isTSNLiteral(leftLast)) {
        return;
      }
      const newRight = mergeTSNLiteral(leftLast, right);
      path.replaceWith(t.binaryExpression("+", left.left, newRight));
    }
  };
  const checkReplaceLiteralTemplate = (path) => {
    const expressions = path.node.expressions;
    const quasis = path.node.quasis;
    if (!expressions.length) {
      path.replaceWith(t.stringLiteral(quasis.map((q) => q.value.cooked ?? "").join("")));
      return;
    }
    for (let i = 0; i < expressions.length; i++) {
      const exp = expressions[i];
      if (t.isTemplateLiteral(exp)) {
        checkReplaceLiteralTemplate(path.get("expressions." + i));
      } else if (t.isBinaryExpression(exp)) {
        mergeAdjacentLiteralsInBinaryExpression(path.get("expressions." + i));
      }
    }
    const qs = [];
    const es = [];
    let j = 0;
    for (let i = 0; i < expressions.length; i++) {
      const exp = expressions[i];
      if (!isAlphanumericLiteral(exp)) {
        es.push(exp);
        qs.push(quasis[i]);
        continue;
      }
      j = i + 1;
      const pre = quasis[i];
      let next = quasis[j];
      const expRaw = alphanumericRawValue(exp);
      let raw = pre.value.raw + expRaw + next.value.raw;
      while (j < expressions.length) {
        const exp1 = expressions[j];
        if (isAlphanumericLiteral(exp1)) {
          next = quasis[j + 1];
          const expRaw2 = alphanumericRawValue(exp1);
          raw += expRaw2 + next.value.raw;
          j++;
          continue;
        }
        break;
      }
      qs.push(t.templateElement({ raw }));
      if (j < expressions.length) {
        es.push(expressions[j]);
      }
      i = j;
    }
    if (j < expressions.length) {
      qs.push(quasis[quasis.length - 1]);
    }
    if (es.length) {
      path.replaceWith(t.templateLiteral(qs, es));
      path.skip();
    } else {
      path.replaceWith(t.stringLiteral(qs.map((q) => q.value.cooked ?? "").join("")));
    }
  };
  return {
    name: "babel-plugin-optimize-template-literals",
    visitor: {
      TemplateLiteral(path) {
        checkReplaceLiteralTemplate(path);
      },
      BinaryExpression(path) {
        if (options.merging) {
          mergeAdjacentLiteralsInBinaryExpression(path);
        }
      }
    }
  };
});
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
