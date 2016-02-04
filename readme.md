# Hao

Application management made easy with nodejs. Install application in `~/apps`
and link it in `~/bin` to make accessible from shell.

No more need to install application with `-g` flag. Just install it at home.

## Install

Install from npmjs.com
```
npm install hao -g
```

## Examples

Install npm hosted application:
```
hao install npm sample-app
```

Install github hosted application:
```
hao install github author/repo
```

Install local application:
```
hao install local ~/projects/hello-world
```

## Appfile

Application file name is `.app` it provide information about application, it's
dependencies and event callbacks.

Now appfile contains several directives:
* name
* description
* version
* bin
* beforeInstall
* afterInstall
* beforeUninstall
* afterUninstall

### Example

```yaml
# Application metadata
name: app
version: 0.1.0
description: Example application

# Application binary
bin: app.js

# Before installation event handler
beforeInstall:
    - npm install .
    - mkdir $HOME/data/app

# After uninstallation event handler
afterUninstall:
    - rm -rf $HOME/data/app
```
