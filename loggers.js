var log4js = require('log4js');

log4js.addAppender(log4js.fileAppender('./logs/dev.log'), 'dev_log');
var dev = log4js.getLogger('dev_log');
dev.setLevel('DEBUG');
exports.dev = dev;
