import vm from 'vm'
import {inspect} from 'util'

import isPromise from 'is-promise'
import test from 'ava'

import wrapAwait from '.'

const createEv = () => {
	const ctx = vm.createContext()

	return code => new vm.Script(code).runInContext(ctx)
}

test('input', t => {
	const err = t.throws(() => {
		wrapAwait(123)
	}, TypeError)

	t.is(err.message, 'Expected a string, got number')
})

test('top level return', t => {
	const err = t.throws(() => {
		wrapAwait('return await 10')
	})

	t.is(err.message, 'Top level return is not allowed')
})

test('transform', async t => {
	const cases = [
		['0', 0],
		['await "fun"', 'fun'],
		['await Promise.resolve(1)', 1],
		['({x: await Promise.resolve(1)})', {x: 1}],
		['Promise.resolve(10)', 'Promise { 10 }'],
		['for await (const x of []) {}', undefined],
		['for (const x of [1, 2, 3]) {await x}', undefined],
		[
			'await Promise.all([1, 2, 3].map(async x => Promise.resolve(x * 2)))',
			[2, 4, 6]
		],
		// eslint-disable-next-line no-template-curly-in-string
		['`str ${await 5}`', 'str 5'],
		['const a = await Promise.resolve(1)', undefined],
		['let b = await Promise.resolve(2)', undefined],
		['var c = await Promise.resolve(3)', undefined],
		['d = await Promise.resolve(4)', 4],
		['const e = await Promise.resolve(5), f = 6', undefined],
		['async function g() {await woke()}', undefined],
		['class h {}; await null', null],
		['const i = async () => {await 0}'],
		['class j extends h {}; await null', null],
		['await 0; function* k() {}', undefined],
		['let l = await 0, m', undefined],
		['const n = 0, o = await 1', undefined],
		['if (await true) {class p {}}', undefined],
		['if (await true) {function r() {}}', undefined],
		['a', 1],
		['b', 2],
		['c', 3],
		['d', 4],
		['e', 5],
		['f', 6],
		['g', 'async function g() {await woke()}'],
		['h', 'class h {}'],
		['i', 'async () => {await 0}'],
		['j', 'class j extends h {}'],
		['k', 'function* k() {}'],
		['l', 0],
		['m', undefined],
		['n', 0],
		['o', 1],
		['typeof p', 'undefined'],
		['r', 'function r() {}']
	]

	const ev = createEv()

	for (const [input, expected] of cases) {
		const wrapped = wrapAwait(input)
		t.log(`${input} -> ${wrapped}`)

		let evaluated = ev(wrapped === null ? input : wrapped)

		if (wrapped !== null) {
			// eslint-disable-next-line no-await-in-loop
			evaluated = await evaluated
		}

		if (typeof evaluated === 'function') {
			t.is(
				evaluated.toString(),
				expected.toString(),
				input
			)
		} else if (isPromise(evaluated)) {
			t.is(
				inspect(evaluated),
				expected,
				input
			)
		} else {
			t.deepEqual(evaluated, expected, input)
		}
	}
})
