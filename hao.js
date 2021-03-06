#!/usr/bin/env node

const commander = require('commander');
const HaoApp = require('./app.js');
const co = require('co');
const chalk = require('chalk');
const path = require('path');

function initHao(config) {
  var hao = new HaoApp({
    dir: config.dir,
    debug: config.debug,
    modules: {
      platform: require(`./src/platform.js`)
    }
  });

  hao.init('platform');
  return hao;
}

commander
.command('install <provider> <name> [name]')
.option('-c,--config <path>', 'Path to config file')
.option('-g,--global', 'Global application')
.option('-d,--debug', 'Debug mode on/off')
.action(function (provider, name, alias, options) {
  if (! name) {
    return 1;
  }

  var config;
  if (options.config) {
    config = require(process.cwd() + '/' + options.config);
  } else {
    config = {};
  }

  config.debug = options.debug;

  co(function*(){
    var hao = initHao(config);
    hao.on('error', (error) => {
      console.error(error.stack);
    });

    var location = yield hao.fetch(provider, name, {tmp: '/tmp'}).then(
      location => location
    );
    var app = yield hao.inspect(location);

    yield hao.installApp(alias||app.pack.name, app, options.global);
  })
  .catch(error => {
    console.error(options.debug ? error.stack : error.toString());
    return 1;
  })
  .then(code => {
    process.exit(code);
  });
});

commander
.command('uninstall <target>')
.option('-c,--config <path>', 'Path to config file', String)
.option('-g,--global', 'Global application')
.option('-d,--debug', 'Debug mode on/off')
.action(function(name, options){
  if (! name) {
    return 1;
  }

  var config;
  if (options.config) {
    config = require(process.cwd() + '/' + options.config);
  } else {
    config = {};
  }

  config.debug = options.debug;

  co(function*(){
    var hao = initHao(config);
    hao.on('error', (error) => {
      console.error(error.stack);
    });

    var isGlobal = options.global;

    var app = yield hao.find(name, isGlobal);
    if (! app) {
      throw new Error('Application not found');
    }
    yield hao.uninstallApp(name, app, isGlobal);

  })
  .catch(error => {
    console.error(options.debug ? error.stack : error.toString());
    return 1;
  })
  .then(code => {
    process.exit(code);
  });
});

commander
.command('list')
.description('List installed application')
.option('-c,--config <path>', 'Path to config file', String)
.option('-g,--global', 'Global application')
.option('-d,--debug', 'Debug mode on/off')
.action(function (options) {
  var config;
  if (options.config) {
    config = require(process.cwd() + '/' + options.config);
  } else {
    config = {};
  }

  config.debug = options.debug;

  co(function*(){
    var hao = initHao(config);
    hao.on('error', (error) => {
      console.error(error.stack);
    });

    var isGlobal = options.global;

    var apps = yield hao.listApps(isGlobal);

    apps.forEach(function(app){
        var name = path.basename(app.location);
        var pack = app.pack;
        var version = app.version || '0.1.0';

        if (pack.name !== name) {
            console.log(name + '/' + pack.name, chalk.grey(version));
        } else {
            console.log(name, chalk.grey(version));
        }
    });
  })
  .catch(error => {
    console.error(options.debug ? error.stack : error.toString());
    return 1;
  })
  .then(code => {
    process.exit(code);
  });
});

commander
.command('version')
.description('Output current hao version')
.action(function(){
    var pack = require('./package.json');
    console.log(pack.version);
});

commander.parse(process.argv);
