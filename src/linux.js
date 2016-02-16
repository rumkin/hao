'use strict';

const co = require('co');
const _ = require('underscore');
const DefaultModule = require('./default.js');
const path = require('path');
const childprocess = require('child_process');
const crypto = require('crypto');
const fetch = require('node-fetch');
const http = require('http');
const fs = require('fs');
const yaml = require('yamljs');
const chalk = require('chalk');
const pify = require('pify');

module.exports = HaoLinux;

function HaoLinux(hao, options_) {
  DefaultModule.call(this, hao);

  var options = options_ || {};

  // this.def('install', this.install);
  this.def('installApp', this.installApp);
  this.def('inspect', this.inspectApp);
  this.def('find', this.findApp);
  this.def('validate', this.validateApp);
  this.def('uninstallApp', this.uninstallApp);
  this.def('getAppDir', this.getAppDir);
  this.def('fetch', this.fetch);
  this.def('listApps', this.listApps);
}

Object.setPrototypeOf(HaoLinux.prototype, DefaultModule.prototype);

HaoLinux.prototype.fetch = function * (provider, name, options) {
  switch(provider) {
    case 'npm':
      return yield this.fetchNpm(name, options);
    case 'github':
      return yield this.fetchGithub(name, options);
    case 'fs':
    case 'local':
        return yield this.fetchFs(name, options);
    default:
      throw new Error(`Unknown provider ${provider}`);
  }
};

// Install application
HaoLinux.prototype.fetchNpm = function * (name, options) {
  var dir = this.tmpDir(null, options.tmp);

  var pack = yield fetch('http://registry.npmjs.com/' + name).then(res => {
    if (res.status !== 200) {
      throw new Error('Fetch error');
    }

    return res.json();
  });

  var version = pack['dist-tags'].latest;
  var tarfile = '.hao.tgz';
  var tarpath = path.join(dir, tarfile);
  yield fetch(`http://registry.npmjs.org/${name}/-/${name}-${version}.tgz`)
    .then(res => {
      return new Promise((resolve, reject) => {
        var stream = fs.createWriteStream(
          tarpath
        );

        res.body.pipe(stream);

        stream.on('error', reject);
        stream.on('finish', resolve);
      });
    });

  var cmd;

  cmd = this.cmd('tar', ['-xzf', tarfile, '--strip-components=1'], {
    cwd: dir
  });

  if (cmd.status) {
    throw new Error('Npm tar could not be extracted');
  }

  return dir;
};

HaoLinux.prototype.fetchGithub = function * (name, options) {
  return yield this.fetchRepository('http://github.com/' + name, options);
};

HaoLinux.prototype.fetchRepository = function * (url, options) {
  var cmd;
  var tmp = this.tmpDir(null, options.tmp);

  cdm = this.cmd('git', ['clone', url, tmp]);

  if (cmd.status) {
    throw new Error('Repository not cloned');
  }

  return tmp;
};

HaoLinux.prototype.fetchFs = function * (location, options) {
  var cmd;
  if (! fs.existsSync(location)) {
    throw new Error('Source directory not found');
  }

  if (! fs.statSync(location).isDirectory()) {
    throw new Error('Source should be a directory');
  }

  var dir = this.tmpDir(null, options.tmp);

  this.copy(location, dir);

  return path.join(dir, path.basename(location));
};

HaoLinux.prototype.installHao = function * (isGlobal) {
  var base = this.getBaseDir(isGlobal);
  var dir = path.join(base, this.hao.dir);

  if (! fs.existsSync(dir)) {
    this.mkdir(dir);
  }

  var binDir = path.join(base, 'bin');

  if (! fs.existsSync(binDir)) {
    fs.mkdir(binDir);
  }
};

HaoLinux.prototype.installApp = function * (name, app, isGlobal) {
  var cmd;
  var baseDir = this.getBaseDir(isGlobal);
  var dir = this.getDir(isGlobal);

  // yield this.validateApp(path.resolve(process.cwd(), location));
  yield this.installHao(isGlobal);

  if (! fs.existsSync(dir)) {
    this.mkdir(dir);
  }

  if (app.pack.beforeInstall) {
        _.each(app.pack.beforeInstall, cmd => {
            if (this.hao.debug) {
                console.log(chalk.grey(cmd));
            }

            var result = this.run(cmd, {
                cwd: app.location
            });

            if (result.status) {
                throw new Error(`beforeInstall script failed`);
            }
        });
  }

  dir = path.join(dir, name);


  if (fs.existsSync(dir)) {
    throw new Error(`Application ${name} is already installed`);
  }

  this.copy(app.location, dir);

  if (fs.exists(path.join(dir, 'package.json'))) {
    cmd = this.cmd('npm', ['install', '.'], {
      cwd: dir
    });

    if (cmd.status) {
      throw new Error('Package not installed');
    }
  }


  fs.symlinkSync(
    path.join(dir, app.bin),
    path.join(baseDir, 'bin', name)
  );


  if (app.pack.afterInstall) {
        _.each(app.pack.afterInstall, cmd => {

            if (this.hao.debug) {
                console.log(chalk.grey(cmd));
            }

            var result = this.run(cmd, {
                cwd: dir
            });

            if (result.status) {
                throw new Error(`beforeInstall script failed`);
            }
        });
  }

  return dir;
};

HaoLinux.prototype.uninstallApp = function * (name, app, isGlobal) {
  var dir = this.getDir(isGlobal);

  if (fs.existsSync(path.join(app.location, 'var/app.lock'))) {
    // TODO suggest to stop it.
    throw new Error('Application is locked');
  }

  var base = this.getBaseDir(isGlobal);
  var appDir = this.getAppDir(name, isGlobal);

  if (app.pack.beforeUninstall) {
        _.each(app.pack.beforeUninstall, cmd => {
            if (this.hao.debug) {
                console.log(chalk.grey(cmd));
            }

            var result = this.run(cmd, {
                cwd: appDir
            });

            if (result.status) {
                throw new Error(`beforeUninstall script failed`);
            }
        });
  }

  var linkPath = path.join(base, 'bin', name);
  if (fs.existsSync(linkPath)) {
    fs.unlinkSync(linkPath);
  }

  // TODO Remove links
  var cmd = this.cmd('rm', ['-rf', app.location]);

  if (cmd.status) {
    throw new Error('Not removed');
  }

  if (app.pack.afterUninstall) {
        _.each(app.pack.afterUninstall, cmd => {
            if (this.hao.debug) {
                console.log(chalk.grey(cmd));
            }

            var result = this.run(cmd, {
                cwd: appDir
            });

            if (result.status) {
                throw new Error(`beforeUninstall script failed`);
            }
        });
  }
};

HaoLinux.prototype.validateApp = function * (dest) {
  var pack = yaml.load(path.join(dest, this.hao.rcfile));

  var hasBinary = false;

  if (pack.bin && pack.bin !== true) {
    if (fs.existsSync(path.join(dest, pack.bin))) {
      hasBinary = true;
    } else if (fs.existSync(path.join(dest, 'bin', pack.name))) {
      hasBinary = true;
    }
  } else {
    if (! fs.existsSync(path.join(dest, 'bin', pack.name))) {
      hasBinary = true;
    }
  }

  if (! hasBinary) {
    throw new Error('Package error: Binary not found');
  }
};

HaoLinux.prototype.findApp = function * (name, isGlobal) {
  var dir = this.getAppDir(name, isGlobal);

  if (! fs.existsSync(dir)) {
    return;
  }

  return yield this.inspectApp(dir, isGlobal);
};

HaoLinux.prototype.inspectApp = function * (location) {
  location = path.resolve(path.resolve(process.cwd(), location));

  var pack = yaml.load(path.join(location, this.hao.rcfile));

  var bin = pack.bin;
  if (bin === true) {
    bin = path.join('bin', pack.name);
  }

  // TODO Search readme docs, resources, etc.
  return {
    location,
    pack,
    bin,
  };
};

HaoLinux.prototype.listApps = function * (isGlobal) {
    var dir = this.getDir(isGlobal);

    var files = yield pify(fs.readdir)(dir);

    var list = (yield files.map(file => {
        var location = path.join(dir, file);

        return pify(fs.stat)(path.join(location, this.hao.rcfile))
        .then(stat => {
            if (stat.isFile()) {
                return location;
            }
        });
    })).filter(item => !! item);

    return yield list.map(location => this.inspectApp(location));
};

// Utils -----------------------------------------------------------------------

/**
 * Copy files from destination to source;
 *
 * @param  {string} source Source directory.
 * @param  {string} dest   Destination directory.
 * @throw {Error} Throws Error if files was not copied.
 */
HaoLinux.prototype.copy = function (source, dest) {
  var cmd = this.cmd('cp', ['-r', source, dest]);

  if (cmd.status) {
    throw new Error('Could not move files:' + cmd.output);
  }
};


HaoLinux.prototype.tmpDir = function (prefix_, base_) {
  var prefix = prefix_ || 'hao';
  var base = base_ || '/tmp';

  var id = prefix + '-' + process.pid + '-' + crypto.randomBytes(4).toString('hex');
  var dir = path.join(base, id);

  this.mkdir(dir);

  return dir;
};

HaoLinux.prototype.mkdir = function (dir) {
  return childprocess.spawnSync('mkdir', [dir]);
};

HaoLinux.prototype.file = function (dir) {
  return childprocess.spawnSync('touch', [dir]);
};

HaoLinux.prototype.cmd = function (cmd, args, options) {
  options = options || {};

  options.stdio = this.hao.debug
    ? 'inherit'
    : 'ignore';

  return childprocess.spawnSync(...arguments);
};

HaoLinux.prototype.exec = function (cmd, options) {
  options = options || {};

  options.stdio = this.hao.debug
    ? 'inherit'
    : 'ignore';

  return this.cmd('/bin/sh', ['-c', cmd], options);
};

HaoLinux.prototype.run = function (cmd, options) {
    if (_.isObject(cmd)) {
        return this.cmd(cmd[0], cmd.slice(1), options);
    } else {
        return this.exec(cmd, options);
    }
};

HaoLinux.prototype.getDir = function (isGlobal) {
  return isGlobal
    ? this.getGlobalDir()
    : this.getHomeDir();
};

HaoLinux.prototype.getBaseDir = function (isGlobal) {
  return isGlobal
    ? '/'
    : process.env.HOME;
};

HaoLinux.prototype.getAppDir = function (name, isGlobal) {
  return path.join(this.getDir(isGlobal), name);
}

HaoLinux.prototype.getGlobalDir = function () {
  return path.resolve(this.getBaseDir(true), this.hao.dir);
};

HaoLinux.prototype.getHomeDir = function () {
  return path.resolve(this.getBaseDir(false), this.hao.dir);
};
