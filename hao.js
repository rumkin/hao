var commander = require('commander');
var HaoApp = require('./app.js');
var co = require('co');


function initHao(config) {
  var hao = new HaoApp({
    dir: config.dir,
    debug: true,
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
.option('-g,--global', 'Global application', Boolean)
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

  co(function*(){
    var hao = initHao(config);
    hao.on('error', (error) => {
      console.error(error.stack);
    });

    var location = yield hao.fetch(provider, name, {tmp: 'tmp'}).then(
      location => location
    );
    var app = yield hao.inspect(location);
    yield hao.installApp(alias||app.pack.name, app, options.global);

    hao.on('error', (error) => {
      console.error(error.stack);
    });
  })
  .catch(error => {
    console.error('' + error);
    return 1;
  })
  .then(code => {
    process.exit(code);
  });
});

commander
.command('uninstall <target>')
.option('-c,--config <path>', 'Path to config file', String)
.option('-g,--global', 'Global application', Boolean)
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
    console.error('' + error);
    return 1;
  })
  .then(code => {
    process.exit(code);
  });
});

commander.parse(process.argv);
