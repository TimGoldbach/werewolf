import { lookup } from 'node:dns/promises'
import { type IncomingMessage, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { connect } from 'node:net'
import { networkInterfaces } from 'node:os'

/** Interfaces of container runtimes and VPNs; their addresses are useless for other devices. */
const VIRTUAL_INTERFACE =
  /^(docker|br-|veth|virbr|vmnet|vboxnet|cni|flannel|cali|tailscale|zt|utun|tun|tap|wg|llw|awdl|bridge)/

function isPrivateIPv4(address: string): boolean {
  const [a, b] = address.split('.').map(Number)
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
}

/** The address other devices in the local network can use to reach this host. */
export function lanAddress(): string | undefined {
  const candidates: string[] = []
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (VIRTUAL_INTERFACE.test(name)) continue
    for (const info of addresses ?? []) {
      if (info.family === 'IPv4' && !info.internal) candidates.push(info.address)
    }
  }
  return candidates.find(isPrivateIPv4) ?? candidates[0]
}

/** All addresses of this host, including loopback. */
export function localAddresses(): Set<string> {
  const addresses = new Set<string>()
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos ?? []) addresses.add(info.address)
  }
  return addresses
}

export interface DomainCheck {
  addresses: string[]
  pointsHere: boolean
}

export async function checkDomain(domain: string): Promise<DomainCheck> {
  let addresses: string[] = []
  try {
    addresses = (await lookup(domain, { all: true })).map((entry) => entry.address)
  } catch {
    return { addresses: [], pointsHere: false }
  }
  const local = localAddresses()
  const pointsHere = addresses.some(
    (address) => local.has(address) || address.startsWith('127.') || address === '::1',
  )
  return { addresses, pointsHere }
}

/** True when something accepts TCP connections on the port (binding would need root for < 1024). */
export async function isPortInUse(port: number): Promise<boolean> {
  const hosts = ['127.0.0.1', '::1']
  const results = await Promise.all(hosts.map((host) => canConnect(host, port)))
  return results.some(Boolean)
}

function canConnect(host: string, port: number, timeoutMs = 700): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    const done = (result: boolean): void => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(timeoutMs, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

/**
 * GETs a URL and resolves with the status code (0 when unreachable). Certificates are not
 * verified: this only checks reachability, and Caddy's local CA is not trusted by Node.
 */
export function httpStatus(url: string, timeoutMs = 5000): Promise<number> {
  return new Promise((resolve) => {
    const target = new URL(url)
    const onResponse = (res: IncomingMessage): void => {
      res.resume()
      resolve(res.statusCode ?? 0)
    }
    const req =
      target.protocol === 'https:'
        ? httpsRequest(target, { timeout: timeoutMs, rejectUnauthorized: false }, onResponse)
        : httpRequest(target, { timeout: timeoutMs }, onResponse)
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve(0))
    req.end()
  })
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
