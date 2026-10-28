import { HttpException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { LoginThrottle } from './login-throttle'

function setup() {
  let now = 0
  const throttle = new LoginThrottle(() => now)
  return { throttle, advance: (ms: number) => (now += ms) }
}

function failTimes(throttle: LoginThrottle, client: string, n: number) {
  for (let i = 0; i < n; i++) throttle.fail(client)
}

describe('LoginThrottle', () => {
  it('locks a client out after 10 wrong passwords', () => {
    const { throttle } = setup()
    failTimes(throttle, 'a', 9)
    expect(() => throttle.check('a')).not.toThrow()
    throttle.fail('a')
    expect(() => throttle.check('a')).toThrow(HttpException)
  })

  it('answers 429 with the TOO_MANY_ATTEMPTS code and a retry hint', () => {
    const { throttle } = setup()
    failTimes(throttle, 'a', 10)
    try {
      throttle.check('a')
      expect.unreachable()
    } catch (e) {
      const error = e as HttpException
      expect(error.getStatus()).toBe(429)
      expect(error.getResponse()).toMatchObject({ code: 'TOO_MANY_ATTEMPTS', details: { retryAfter: 900 } })
    }
  })

  it('keeps clients apart', () => {
    const { throttle } = setup()
    failTimes(throttle, 'a', 10)
    expect(() => throttle.check('b')).not.toThrow()
  })

  it('lets the client try again once the window is over', () => {
    const { throttle, advance } = setup()
    failTimes(throttle, 'a', 10)
    advance(15 * 60 * 1000)
    expect(() => throttle.check('a')).not.toThrow()
  })

  it('forgets earlier failures after a successful login', () => {
    const { throttle } = setup()
    failTimes(throttle, 'a', 9)
    throttle.succeed('a')
    failTimes(throttle, 'a', 9)
    expect(() => throttle.check('a')).not.toThrow()
  })
})
