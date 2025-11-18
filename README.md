# Toolbelt for native apps

This toolbelt is used for different apps (Integreat, Lunes and entitlementcard). It is used to reduce code duplication in every project.

## Usage

### Installation

To use this toolbelt install it locally or in the CI via

`npm install --unsafe-perm -g https://github.com/digitalfabrik/app-toolbelt/archive/refs/heads/main.tar.gz`

You can use the package in your project by adding:

`"github:digitalfabrik/app-toolbelt#semver:<version>"`

### Using commands

Existing commands can be called by, e.g.

`app-toolbelt v0 version calc`

## Updates and breaking changes

- Breaking changes should be marked with a `breaking` label and a description what has to be changed when updating to that version.
- Breaking changes should always include a minor version update.
- To update the package, increase the version in the `package.json`, run `npm install` and commit the changes.
