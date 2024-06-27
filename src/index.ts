import _babel from '@babel/core'
import type { PluginItem, NodePath } from "@babel/core"
import type { BinaryExpression, TemplateLiteral, StringLiteral, NumericLiteral } from "@babel/types"

declare module '@babel/types' {
    interface StringLiteral {
        extra: { raw: string }
    }
    interface NumericLiteral {
        extra: { raw: string }
    }
}
type TSNLiteral = TemplateLiteral | StringLiteral | NumericLiteral
const plugin: (babel: typeof _babel) => PluginItem = ({ types: t }) => {
    const isAlphanumericLiteral = (node: any): node is StringLiteral | NumericLiteral => t.isNumericLiteral(node) || t.isStringLiteral(node)
    const isTSNLiteral = (node: any): node is TSNLiteral => t.isTemplateLiteral(node) || isAlphanumericLiteral(node)
    const stringRaw = (val: string): string => JSON.stringify(val).slice(1, -1)
    /**
     * get raw value for TemplateElement's `value.raw`
     */
    const alphanumericRawValue = (node: StringLiteral | NumericLiteral): string => t.isStringLiteral(node) ? stringRaw(node.value) : node.value.toString()
    /**
     * check if TemplateLiteral can be replaced with StringLiteral, if can return the equivalent StringLiteral
     */
    const checkTemplateNodeToString = (node: TemplateLiteral): TemplateLiteral | StringLiteral => {
        if (node.expressions.length === 0) {
            const value = node.quasis.map(q => q.value.cooked ?? '').join('')
            return t.stringLiteral(value)
        }
        return node
    }
    const mergeTSNLiteral = (left: TSNLiteral, right: TSNLiteral): TSNLiteral => {
        if (t.isNumericLiteral(left) && t.isNumericLiteral(right)) {
            return t.numericLiteral(left.value + right.value)
        }
        if (isAlphanumericLiteral(left) && isAlphanumericLiteral(right)) {
            // don't use raw (alphanumericRawValue) for StringLiteral
            // cause 'a\n' must be 'a\n' not 'a\\n'
            return t.stringLiteral(left.value.toString() + right.value)
        }
        if (t.isTemplateLiteral(left) && t.isTemplateLiteral(right)) {
            const leftLastRaw = left.quasis[left.quasis.length - 1].value.raw
            const rightFirstRaw = right.quasis[0].value.raw
            const quasis = [...left.quasis.slice(0, -1), t.templateElement({ raw: leftLastRaw + rightFirstRaw }), ...right.quasis.slice(1)]
            return checkTemplateNodeToString(t.templateLiteral(quasis, [...left.expressions, ...right.expressions]))
        }
        else if (t.isTemplateLiteral(left) && isAlphanumericLiteral(right)) {
            const leftLastRaw = left.quasis[left.quasis.length - 1].value.raw
            const rightVal = alphanumericRawValue(right)
            const quasis = [...left.quasis.slice(0, -1), t.templateElement({ raw: leftLastRaw + rightVal })]
            return checkTemplateNodeToString(t.templateLiteral(quasis, left.expressions))
        }
        else if (isAlphanumericLiteral(left) && t.isTemplateLiteral(right)) {
            const leftVal = alphanumericRawValue(left)
            const rightFirstRaw = right.quasis[0].value.raw
            const quasis = [t.templateElement({ raw: leftVal + rightFirstRaw }), ...right.quasis.slice(1)]
            return checkTemplateNodeToString(t.templateLiteral(quasis, right.expressions))
        }
        else {
            throw Error('exhausted')
        }
    }
    /**
     * optimize BinaryExpression between Literals like which `esbuild` can do.
     * ```js
     * 1 + 2 => 3
     * 'bb' + 2 => bb2
     * 1 * 2 => 1 * 2
     * 1 + aNum => 1 + aNum
     * 1 + 2 + aNum => 3 + aNum
     * `aaa${'bbb'}` + `ccc${foo()}` => `aaabbbccc${foo()}`
     * foo() + 'aa' + 'bb' + bar() => foo() + 'aabb' + bar()
     * ```
     */
    const mergeAdjacentLiteralsInBinaryExpression = (path: NodePath<BinaryExpression>) => {
        let left = path.node.left
        let right = path.node.right
        if (t.isBinaryExpression(left)) {
            mergeAdjacentLiteralsInBinaryExpression(path.get('left') as NodePath<BinaryExpression>)
        }
        else if (t.isTemplateLiteral(left)) {
            checkReplaceLiteralTemplate(path.get('left') as NodePath<TemplateLiteral>)
        }
        if (t.isBinaryExpression(right)) {
            mergeAdjacentLiteralsInBinaryExpression(path.get('right') as NodePath<BinaryExpression>)
        }
        else if (t.isTemplateLiteral(right)) {
            checkReplaceLiteralTemplate(path.get('right') as NodePath<TemplateLiteral>)
        }
        right = path.node.right
        if (!isTSNLiteral(right) || path.node.operator !== '+') {
            return
        }
        left = path.node.left
        if (isTSNLiteral(left)) {
            path.replaceWith(mergeTSNLiteral(left, right))
            return
        }
        if (t.isBinaryExpression(left)) {
            const leftLast = left.right
            if (!isTSNLiteral(leftLast)) {
                return
            }
            const newRight = mergeTSNLiteral(leftLast, right)
            path.replaceWith(t.binaryExpression('+', left.left, newRight))
        }
    }
    /**
     * replace literal templates in TemplateLiterals, all literal templates will be replaced with string literals.
     * ```ts
     * `aa${'bb'}` => "aabb"
     * `aa${'bb' + 'cc'}` => "aabbcc"
     * `aa${1 + 2 + '3'}` => "aa33"
     * `aa${1 + '2' + 3}` => "aa123"
     * `aa${1 + 2 + foo()}` => `aa${3 + foo()}`
     *
     * ```
     */
    const checkReplaceLiteralTemplate = (path: NodePath<TemplateLiteral>) => {
        const expressions = path.node.expressions
        const quasis = path.node.quasis
        if (!expressions.length) {
            path.replaceWith(t.stringLiteral(quasis.map(q => q.value.cooked ?? '').join('')))
            return
        }
        for (let i = 0; i < expressions.length; i++) {
            const exp = expressions[i]
            if (t.isTemplateLiteral(exp)) {
                // recursion
                checkReplaceLiteralTemplate(path.get('expressions.' + i) as NodePath<TemplateLiteral>)
            }
            else if (t.isBinaryExpression(exp)) {
                mergeAdjacentLiteralsInBinaryExpression(path.get('expressions.' + i) as NodePath<BinaryExpression>)
            }
        }
        const qs: TemplateLiteral['quasis'] = []
        const es: TemplateLiteral['expressions'] = []
        let j = 0
        // traverse expressions to unbrace literal templates and merge adjacent TemplateElements one by one
        for (let i = 0; i < expressions.length; i++) {
            const exp = expressions[i]
            if (!isAlphanumericLiteral(exp)) {
                es.push(exp)
                qs.push(quasis[i])
                continue
            }
            j = i + 1
            const pre = quasis[i]
            let next = quasis[j]
            const expRaw = alphanumericRawValue(exp)
            let raw = pre.value.raw + expRaw + next.value.raw
            while (j < expressions.length) {
                const exp1 = expressions[j]
                if (isAlphanumericLiteral(exp1)) {
                    next = quasis[j + 1]
                    const expRaw = alphanumericRawValue(exp1)
                    raw += expRaw + next.value.raw
                    j++
                    continue
                }
                break
            }
            qs.push(t.templateElement({ raw }))
            if (j < expressions.length) {
                es.push(expressions[j])
            }
            i = j
        }
        // the last expression is not StringLiteral | NumericLiteral
        if (j < expressions.length) {
            qs.push(quasis[quasis.length - 1])
        }

        if (es.length) {
            path.replaceWith(t.templateLiteral(qs, es))
            path.skip()
        }
        else {
            path.replaceWith(t.stringLiteral(qs.map(q => q.value.cooked ?? '').join('')))
        }
    }


    return {
        name: 'plugin-optimize-template-literals',
        visitor: {
            TemplateLiteral(path) {
                checkReplaceLiteralTemplate(path)
            },
            BinaryExpression(path, state) {
                if (state.opts.merging) {
                    mergeAdjacentLiteralsInBinaryExpression(path)
                }
            }
        }
    }
}
export default plugin