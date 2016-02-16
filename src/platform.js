// TODO Create platfrom selector
const platform = process.platform;

if (platform !== 'linux') {
  throw new Error(`Platform ${platform} is not supported yet`);
}

module.exports = require('./' + platform + '.js');
