var type = Object.prototype.toString;
var EXP_FLAGS = /^-m\s(GET|PUT|POST|DELETE)$/; // ----------------------------> https://regex101.com/r/Gn3KrT/1/

function xhr(url, flags, a, b, c, d) {
    flags = parseFlags();
    var body;
    var headers;
    var progressFN;
    var next;
    if (a instanceof FormData && type.call(b) === '[object Object]' && typeof(c) === 'function' && typeof(d) === 'function') {
        body = a;
        headers = b;
        progressFN = c;
        next = d;
    }
    else if (a instanceof FormData && typeof(b) === 'function' && typeof(c) === 'function') {
        body = a;
        progressFN = b;
        next = c;
    }
    else if (a instanceof FormData && typeof(b) === 'function') {
        body = a;
        next = b;
    }
    else if (canBeBody(a) && type.call(b) === '[object Object]' && typeof(c) === 'function') {
        body = a;
        headers = b;
        next = c;
    }
    else if (type.call(a) === '[object Object]' && typeof(b) === 'function') {
        headers = a; // ------------------------------------------------------> E.G. { 'Accept': ... }
        next = b;
    }
    else if (typeof(a) === 'function') {
        next = a;
    }
    else {
        throw new Error('Invalid arguments at tail.');
    }
    var k;
    if (headers) {
        for (k in headers) {
            if (headers.hasOwnProperty(k)) {
                headers[k.toLowerCase()] = headers[k];
            }
        }
    }
    if (type.call(body) === '[object Object]' || Array.isArray(body) || typeof(body) === 'string') {
        var tmp = headers['content-type'];
        if (!tmp) {
            throw new Error('Missing content type.');
        }
        if (typeof(body) !== 'string') {
            if (tmp !== 'application/json') {
                throw new Error('Invalid content type.');
            }
            body = JSON.stringify(body);
        }
    }
    var xhr = new XMLHttpRequest();
    xhr.onerror = function() {
        console.error('Unexpected XHR error.'); // eslint-disable-line no-console
        next(new Error('xhr'));
    };
    if (progressFN) {
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                var progress = (e.loaded / e.total) * 100;
                progressFN(progress.toFixed(0));
            }
        };
    }
    var res;
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                res = prepareResponse(xhr.responseText || '');
                var statusCode = xhr.status;
                if (statusCode !== 200) {
                    return next(new Error('' + statusCode), res);
                }
                next(null, res);
            }
            catch (err) {
                console.error('Unable to parse server response to JSON.'); // eslint-disable-line no-console
                next(err);
            }
        }
    };
    xhr.open(flags.method, url, true);
    if (headers) {
        for (k in headers) {
            if (headers.hasOwnProperty(k)) {
                xhr.setRequestHeader(k, headers[k]);
            }
        }
    }
    xhr.send(body); // -------------------------------------------------------> String || FormData
    function parseFlags() {
        var m = flags.match(EXP_FLAGS);
        if (!m) {
            throw new Error('Request "flags" must follow "-m <Value>" syntax.');
        }
        return {
            method: m[1]
        };
    }
    function canBeBody(v) {
        return type.call(v) === '[object Object]' || Array.isArray(v) || typeof(v) === 'string' || v instanceof FormData;
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
$export('<xhr>', xhr);
