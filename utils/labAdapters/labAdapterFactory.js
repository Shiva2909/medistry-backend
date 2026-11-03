const redcliffeAdapter = require('./redcliffeAdapter');
const orangeHealthAdapter = require('./orangeHealthAdapter');

const getAdapter = (providerKey) => {
    switch (providerKey.toUpperCase()) {
        case 'REDCLIFFE':
            return redcliffeAdapter;
        case 'ORANGE':
            return orangeHealthAdapter;
        default:
            throw new Error(`No adapter found for provider: ${providerKey}`);
    }
};

module.exports = { getAdapter };