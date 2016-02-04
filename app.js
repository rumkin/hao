'use strict';

var format = require('util').format;
var co = require('co');
var Stream = require('stream');

module.exports = HaoApp;

var EventEmitter = require('events').EventEmitter;

function HaoApp(options_) {
  EventEmitter.call(this);
  var options = options_ || {};

  this.debug = options.debug;

  this.dir = options.dir || 'apps';
  this.rcfile = options.rcfile || '.app';

  // Hao Application modules
  this.modules = options.modules || {};
  // Hao Installation plugins
  this.plugins = {};
}

Object.setPrototypeOf(HaoApp.prototype, EventEmitter.prototype);

HaoApp.prototype.method = function (name, fn) {
  if (this.hasOwnProperty(name)) {
    throw new Error(`Property ${name} exists already`);
  }

  this[name] = (function ()  {
    var result = fn(...arguments);
    // TODO check if thenable instead of checking on Promise instance
    if (result instanceof Promise === false) {
      this.emit(':' + name, ...arguments);
      return result;
    }

    return result.then(
      result => {
        this.emit(':' + name, ...arguments);
        return result;
      },
      error => {
        this.emit('error', error);
        throw error;
      }
    );
  }).bind(this);
};

HaoApp.prototype.init = function (module, options) {
  return new this.modules[module](this, options);
};

HaoApp.prototype.log = function() {
  this.stdio.out.write(format(...arguments));
};

HaoApp.prototype.debug = function() {
  this.debugio.out.write(format(...arguments));
};
