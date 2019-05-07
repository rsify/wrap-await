/**
 Wrap JavaScript code in an async function, while also preserving the usual
 variable scoping rules. If the input code doesn't include a top level `await`
 expression - `null` is returned.

 @param code - Input code to be wrapped
 @returns - Wrapped code

 @example
 ```
 const wrapAwait = require('wrap-await')

 wrapAwait('await Promise.resolve(5)')
 //=> '(async () {return await Promise.resolve(5)})()'
 ```

 */
declare function wrapAwait(code: string): string | null

export = wrapAwait
