// TODO Create platfrom selector
var platform = process.platform;

if (platform !== 'linux') {
  throw new Error(`Platform ${platform} is not supported yet`);
}

module.exports = require('./' + platform + '.js');
