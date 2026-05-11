const localProvider = require('./localProvider');
const gcpProvider = require('./gcpProvider');

const providerType = process.env.STORAGE_PROVIDER || 'local';

let provider;

if (providerType === 'gcp') {
  provider = gcpProvider;
} else {
  provider = localProvider;
}

module.exports = provider;
