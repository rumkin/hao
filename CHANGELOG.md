# Changelog

### v0.2.9
* Add `list` command.
* refactor code to use `const` for dependencies instead of `var`.

### v0.2.7

* Rename `.hao` into `.app`.
* Add executable comment to `hao.js`.
* Fix installation issue with missed links.
* Rename `fs` provider into `local`.
* Make local installer copy data to tmp folder.
* Add `beforeInstall`, `afterInstall`, `beforeUninstall` and `afterUninstall`
  callbacks.
* Fix temporary folder location.
* Enhance copy error message.
* Add `version` command line action.
