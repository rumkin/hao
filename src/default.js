'use strict';

const co = require('co');

module.exports = DefaultModule;

function DefaultModule(hao) {
  this.hao = hao;
}

DefaultModule.prototype.def = function (name, fn) {
  if (fn.constructor.name === 'GeneratorFunction') {
    fn = co.wrap(fn).bind(this);
  } else {
    fn = fn.bind(this);
  }

  this.hao.method(name, fn);
};

DefaultModule.prototype.log = function () {
  if (this.hao.verbose) {
    console.log(...arguments);
  }
};

DefaultModule.prototype.debug = function () {
  if (this.hao.debug) {
    console.error(...arguments);
  }
};
