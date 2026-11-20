# Security

a30m runs AI agents on a server that holds its owner's mail, accounts and keys. A flaw here is serious.

## Reporting a vulnerability

Report it privately through GitHub: the repository's **Security** tab, then **Report a vulnerability**. Do not open a public issue.

You will get an answer within 7 days. Please give us 90 days to fix it before you disclose it.

## What counts

Anything that lets an agent, a web page, a mail or another person:

- read data outside the space it belongs to;
- act without the owner's approval where approval is required;
- reach a credential, a device key or the server's own files;
- pair a device without the owner's confirmation.

The security scenarios in [`docs/security/scenarios.md`](docs/security/scenarios.md) say what must hold. A way to break one of them is a vulnerability.

## Supported versions

Nothing is released yet. Once it is, only the latest release gets fixes.
