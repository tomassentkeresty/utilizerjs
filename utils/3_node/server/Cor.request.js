import * as $url from 'url';
import * as $https from 'https';
import * as $http from 'http';

var CONCAT = [null, null];
var EXP_FLAGS = /^-m\s(GET|PUT|POST|DELETE)(?:(?=\s-flw)(?:\s-(flw))|)$/; // https://regex101.com/r/JEx8MB/2/

export default function request(url, flags, a, b, c) {
    flags = parseFlags();
    var body;
    var headers;
    var next;
    if (canBeBody(a) && Object.prototype.toString.call(b) === '[object Object]' && typeof(c) === 'function') {
        body = a;
        headers = b;
        next = c;
    }
    else if (Object.prototype.toString.call(a) === '[object Object]' && typeof(b) === 'function') {
        headers = a;
        next = b;
    }
    else if (typeof(a) === 'function') {
        next = a;
    }
    else {
        throw new Error('Invalid arguments at tail.');
    }
    if (headers) {
        for (var k in headers) {
            if (headers.hasOwnProperty(k)) {
                headers[k.toLowerCase()] = headers[k];
            }
        }
    }
    if (body !== undefined) {
        var tmp = headers['content-type'];
        if (!tmp) {
            throw new Error('Missing content type.');
        }
        if (Object.prototype.toString.call(body) === '[object Object]' || Array.isArray(body)) {
            if (tmp !== 'application/json') {
                throw new Error('Invalid content type.');
            }
            body = JSON.stringify(body);
        }
    }
    (function loop(lastURL) {
        var options = $url.parse(lastURL);
        options.method = flags.method;
        options.headers = headers;
        var h = options.protocol === 'https:' ? $https : $http;
        var req = h.request(options, function(res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && flags.follow) {
                setImmediate(function() {
                    loop(res.headers.location);
                });
            }
            else {
                res.once('error', function(err) {
                    next(err);
                });
                var result = Buffer.alloc(0);
                res.on('data', function(buffer) {
                    CONCAT[0] = result;
                    CONCAT[1] = buffer;
                    result = Buffer.concat(CONCAT);
                });
                res.once('end', function() {
                    result = prepareResponse(result.toString('utf8'));
                    var statusCode = res.statusCode;
                    if (statusCode !== 200) {
                        return next(new Error('' + statusCode), result);
                    }
                    next(null, result);
                });
            }
        });
        req.once('error', function(err) {
            next(err);
        });
        if (body) { // -------------------------------------------------------> Buffer || String
            req.setHeader('content-length', body.length);
            req.write(body);
        }
        req.end();
    }(url));
    function parseFlags() {
        var m = flags.match(EXP_FLAGS);
        if (!m) {
            throw new Error('Request "flags" must follow "-m <Value> -flw?"');
        }
        return {
            method: m[1],
            follow: !!m[2]
        };
    }
    function canBeBody(v) {
        return Object.prototype.toString.call(v) === '[object Object]' || Array.isArray(v) || typeof(v) === 'string' || Buffer.isBuffer(v);
    }
    function prepareResponse(str) {
        try {
            return JSON.parse(str);
        }
        catch (e) {
            return str;
        }
    }
}
if (!global.Cor) global.Cor = {};
global.Cor.request = request;
