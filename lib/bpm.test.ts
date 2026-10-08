import { describe, it, expect } from 'vitest'
import { parseBpm, BPM_RANGE_ERROR } from './bpm'

describe('parseBpm', () => {
  it.each([null, '', '   ', '0'])('treats %j as no BPM', (input) => {
    expect(parseBpm(input)).toEqual({ bpm: null })
  })

  it.each([['30', 30], ['108', 108], ['300', 300], [' 120 ', 120]])('accepts %j', (input, expected) => {
    expect(parseBpm(input)).toEqual({ bpm: expected })
  })

  it.each(['1', '29', '301', '1200', '-5', '12.5', 'abc'])('rejects %j', (input) => {
    expect(parseBpm(input)).toEqual({ error: BPM_RANGE_ERROR })
  })
})
