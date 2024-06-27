# @babel/plugin-optimize-template-literals
> Unbrace literal templates in each TemplateLiteral and optimize them.

```js
`aa${'bb'}cc${foo()}` -> `aabb${foo()}`
`aa${'bb' + 'cc'}dd${1+2+'3'}ee${1+'2'+3}` -> `aabbccdd33ee123`
```

```shell
npm i -D @babel/plugin-optimize-template-literals
```


## Options

### `merging`
type: `boolean`  
default: `false`  
Merge adjacent TemplateLiterals and StringLiterals
```js
const a = `aaa${'bbb'}` + `ccc${foo()}` + 'ddd'
=>
const a = `aaabbbccc${foo()}ddd`
```


## Use case
It is useful to optimize template-literals statements after using `tsc`(TypeScript) with `const enum`.
```ts
export const enum TableName {
    USER = 'users'
}
export const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${TableName.USER} (name TEXT);
`
```
After tsc
```js
export const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${'users'} (name TEXT);
```
After babel with this plugin
```js
export const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (name TEXT);
```