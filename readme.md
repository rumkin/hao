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
hao install fs sample-app
```
