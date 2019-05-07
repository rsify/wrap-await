'use strict'

const acorn = require('acorn')
const recast = require('recast')

const b = recast.types.builders

const unaryVoidExpressionStatement = (id, value) =>
	b.expressionStatement(
		b.unaryExpression(
			'void',
			b.assignmentExpression(
				'=',
				id,
				value
			)
		)
	)

module.exports = code => {
	if (typeof code !== 'string') {
		throw new TypeError(`Expected a string, got ${typeof code}`)
	}

	const wrapped = '(async () => {' + code + '\n})()'

	// Using acorn instead of recast's default esprima due to its feature
	// superiority, e.g. `for await of` statements are not supported by esprima
	// at the time of writing.
	const ast = recast.parse(wrapped, {
		parser: {
			parse(source) {
				return acorn.parse(source, {
					ecmaVersion: 10,
					locations: true
				})
			}
		}
	})

	// Body of the wrapper's block statement
	const {body} = ast.program.body[0].expression.callee.body

	const isTopLevel = path => path.parent.parent.parent.name === 'program'

	let containsReturn = false
	let containsAwait = false
	recast.visit(ast, {
		visitFunctionDeclaration(path) {
			const {node} = path

			const fnExpr = b.functionExpression(
				node.id,
				node.params,
				node.body,
				node.generator,
				node.async
			)

			path.replace(unaryVoidExpressionStatement(
				node.id,
				fnExpr
			))

			return false
		},
		visitClassDeclaration(path) {
			if (!isTopLevel(path.parent.parent)) {
				return false
			}

			const {node} = path

			const classExpr = b.classExpression(
				node.id,
				node.body,
				node.superClass
			)

			path.replace(unaryVoidExpressionStatement(
				node.id,
				classExpr
			))

			return false
		},
		visitFunctionExpression() {
			return false
		},
		visitArrowFunctionExpression(path) {
			if (!isTopLevel(path)) {
				return false
			}

			this.traverse(path)
		},
		visitMethodDefinition() {
			return false
		},
		visitAwaitExpression(path) {
			containsAwait = true
			this.traverse(path)
		},
		visitForOfStatement(path) {
			if (path.get('await')) {
				containsAwait = true
			}

			return false
		},
		visitReturnStatement() {
			containsReturn = true

			// Top level return is not allowed
			this.abort()
		},
		visitVariableDeclaration(path) {
			// Replace all variable declarations like `const x = 10` with
			// unary expressions `void (x = 10)`
			// (we're using `void` here because assignment statement
			// returns `undefined`)

			this.traverse(path)

			if (!isTopLevel(path.parent.parent) && path.get('kind') !== 'var') {
				return
			}

			const declarations = path.get('declarations')

			const unaries = declarations.map(({value}) =>
				unaryVoidExpressionStatement(
					value.id,
					value.init === null ? b.identifier('undefined') : value.init
				)
			)

			path.prune()
			path.insertAfter(...unaries)
		}
	})

	if (containsReturn) {
		throw new Error('Top level return is not allowed')
	}

	if (!containsAwait) {
		return null
	}

	const last = body.pop()

	if (last) {
		if (last.type === 'ExpressionStatement') {
			body.push(b.returnStatement(last.expression))
		} else {
			// Not an expression statement, just push it back.
			body.push(last)
		}
	}

	return recast.print(ast).code
}
