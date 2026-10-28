// Example configurations for an existing reverse proxy (proxy mode).

export interface Snippet {
  name: string
  code: string
}

/**
 * @param upstream where the proxy reaches the web app, e.g. "127.0.0.1:8080" or "werewolf-web:3000"
 * @param domain the public domain, or a placeholder
 */
export function proxySnippets(upstream: string, domain: string): Snippet[] {
  const host = domain || 'werewolf.example.org'
  return [
    {
      name: 'Caddy',
      code: [`${host} {`, `    reverse_proxy ${upstream}`, '}'].join('\n'),
    },
    {
      name: 'nginx',
      code: [
        'server {',
        '    listen 443 ssl;',
        '    http2 on;',
        `    server_name ${host};`,
        '    # ssl_certificate …; ssl_certificate_key …;',
        '',
        '    location / {',
        `        proxy_pass http://${upstream};`,
        '        proxy_set_header Host $host;',
        '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
        '        proxy_set_header X-Forwarded-Proto $scheme;',
        '    }',
        '}',
      ].join('\n'),
    },
    {
      name: 'Traefik (file provider)',
      code: [
        'http:',
        '  routers:',
        '    werewolf:',
        `      rule: Host(\`${host}\`)`,
        '      entryPoints: [websecure]',
        '      tls:',
        '        certResolver: letsencrypt',
        '      service: werewolf',
        '  services:',
        '    werewolf:',
        '      loadBalancer:',
        '        servers:',
        `          - url: http://${upstream}`,
      ].join('\n'),
    },
  ]
}
