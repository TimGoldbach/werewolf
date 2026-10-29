# Security policy

## Supported versions

Only the latest release gets security fixes. Self-hosted instances pick them up with
`./werewolf update`.

## Reporting a vulnerability

Please don't open a public issue. Report it privately through
[GitHub's vulnerability reporting][report] instead.

Include what an attacker can do, the steps to reproduce it, and the version you tested
(shown in the app footer). If you have an idea for a fix, add it.

This is a hobby project maintained in spare time. You'll usually get a first reply
within a week. Once a fix is released, the advisory is published, with credit to you if
you want it.

[report]: https://github.com/TimGoldbach/werewolf/security/advisories/new

## Scope

In scope are the app, the API, the `werewolf` CLI and the published container images.

Not a vulnerability on its own:

- Everyone in a group shares one password; there are no individual accounts. Anyone
  with the password can change all of the group's data.
- An instance in `lan` mode serves plain HTTP. Use the `domain` or `proxy` mode for
  anything reachable from the internet.
- Weaknesses in a reverse proxy or server that you configured yourself.
