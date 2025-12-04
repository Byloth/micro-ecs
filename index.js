'use strict';

if (process.env.NODE_ENV === 'production') {
    module.exports = require('./dist/micro-ecs.cjs');
} else {
    module.exports = require('./dist/micro-ecs.dev.cjs');
}
