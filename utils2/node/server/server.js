import $global from '../../global';
import $malloc from '../../internal/malloc';
import $route1 from './route1';
import $Controller1 from './Controller1';

export default function $server(env, packageJSON, config) {
    var cache = $malloc('__SERVER');
    if (!config) {
        return cache('app') || null;
    }
    function App() {
        this.js = [];
        this.configure = function() {
            if (['DEBUG', 'TEST', 'RELEASE'].indexOf(env) === -1) {
                throw new Error('api-env');
            }
            this.env = env;
            this[env] = true;
            if (typeof(config.https) !== 'boolean') {
                throw new Error('api-config.https');
            }
            if (!config.host || typeof(config.host) !== 'string') {
                throw new Error('api-config.host');
            }
            if (!Number.isInteger(config.port) || config.port <= 0) {
                throw new Error('api-config.port');
            }
            var tmp = config.publicDirectory === undefined ? './public' : config.publicDirectory;
            if (!tmp || typeof(tmp) !== 'string') {
                throw new Error('api-config.publicDirectory');
            }
            config.publicDirectory = tmp;
            config.tmpDirectory = './tmp';
            tmp = config.staticAccepts === undefined
                ? ['.jpg', '.png', '.gif', '.ico', '.js', '.coffee', '.css', '.txt', '.xml', '.woff', '.woff2', '.otf', '.ttf', '.eot', '.svg', '.zip', '.rar', '.pdf', '.docx', '.xlsx', '.doc', '.xls', '.html', '.htm', '.appcache', '.map', '.ogg', '.mp4', '.mp3', '.webp', '.webm', '.swf', '.package', '.json', '.md']
                : config.staticAccepts;
            if (!Array.isArray(tmp)) {
                throw new Error('api-config.staticAccepts');
            }
            config.staticAccepts = tmp;
            this.config = config;
        };
        this.configure();
        this.handleRequest = function(req, res) {
            var controller = new $Controller1(req, res);
            controller.run();
        };
    }
    App.prototype = {
        pushJS: function(filepath) {
            this.js.push(filepath);
        },
        loadJS: function(next) {
            var self = this;
            (function loop(i) {
                var filepath = self.js[i];
                if (!filepath) {
                    return next && next();
                }
                require.cache[filepath] = undefined;
                var file = require(filepath);
                if (typeof(file.init) !== 'function') {
                    throw new Error('Missing "init()" in "' + filepath + '".');
                }
                file.init(function() {
                    loop(++i);
                });
            }(0));
        },
        create: function() {
            var self = this;
            if (self.config.https) {
                var options = {
                    key: self.config.key,
                    cert: self.config.cert
                };
                self.server = require('https').createServer(options, self.handleRequest).listen(self.config.port, self.config.host);
            }
            else {
                self.server = require('http').createServer(self.handleRequest).listen(self.config.port, self.config.host);
            }
            var socketCounter = 0;
            self.socket = {};
            self.server.on('connection', function(socket) {
                var k = socketCounter++;
                self.socket[k] = socket;
                socket.once('close', function() {
                    delete self.socket[k];
                });
            });
        },
        createLog: function() {
            /* eslint-disable no-console */
            console.clear();
            console.log('@pid ' + process.pid + ' (' + [
                new Date().toGMTString(),
                'Node.js: ' + process.version,
                'OS: ' + require('os').platform() + ' ' + require('os').release()
            ].join('; ') + ')');
            console.log('');
            console.log('env     : ' + env);
            console.log('name    : ' + packageJSON.name || '-');
            console.log('version : ' + packageJSON.version || '-');
            console.log('author  : ' + packageJSON.author || '-');
            console.log('');
            console.log('http://' + this.config.host + ':' + this.config.port + '/\n');
            /* eslint-enable no-console */
        },
        destroy: function() {
            this.server.close();
            for (var k in this.socket) {
                if (this.socket.hasOwnProperty(k)) {
                    this.socket[k].destroy();
                }
            }
        }
    };
    $route1('#public', function() { // -------------------------------> LIKE CONTROLLER
        var pathname = this.toPathname(this.req.url);
        var filepath = require('path').resolve(config.publicDirectory, ('.' + pathname));
        this.stream(200, filepath);
    }, '-m GET -s 0kB -t 20s'); // -------------------------------------------> ONLY "-t" USED
    var app = new App();
    cache('app', app);
    return app;
}
$global.$server = $server;