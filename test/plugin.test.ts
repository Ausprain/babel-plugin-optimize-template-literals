import * as babel from '@babel/core'

import unbracePlugin from '../src/index'
import fs from 'fs';

describe('test plugin', () => {
    const input = fs.readFileSync('./test/input.js').toString()
    const output = fs.readFileSync('./test/output.js').toString()

    test('test plugin', async () => {
        const out = await babel.transformAsync(input, {
            plugins: [
                [unbracePlugin, { merging: true }]
            ],
            comments: true,
        })
        expect(out?.code).toBe(output)
    })
})