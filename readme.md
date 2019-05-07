# wrap-await [![Build Status](https://travis-ci.org/nikersify/wrap-await.svg?branch=master)](https://travis-ci.org/nikersify/wrap-await)

> Wraps code that contains await expressions in an async iife


## Install

```
$ npm install wrap-await
```


## Usage

```js
const wrapAwait = require('wrap-await')

wrapAwait('await Promise.resolve(5)')
//=> '(async () {return await Promise.resolve(5)})()'
```


## API

### wrapAwait(input, [options])

Wrap JavaScript code in an async function, while also preserving the usual
variable scoping rules. If the input code doesn't include a top level `await`
expression - `null` is returned.

#### code

Type: `string`

Input code string.


## License

MIT © [nikersify](https://nikerino.com)
