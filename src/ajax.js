// =================================================================================================
// Boost.js | AJAX Functions
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


// -------------------------------------------------------------------------------------------------
// String Conversions

M.toQueryString = function(data) {
    var pairs = [];

    M.each(data, function(value, key) {
        key = encodeURIComponent(key);
        if (value == null) { pairs.push(key); return; }
        value = M.isArray(value) ? value.join(',') : '' + value;
        value = value.replace(/(\r)?\n/g, '\r\n');
        value = encodeURIComponent(value);
        value = value.replace(/%20/g, '+');

        pairs.push(key + '=' + value);
    });

    return pairs.join('&');
};

M.fromQueryString = function(string) {
    string = string.replace(/^[?,&]/,'');
    var pairs = decodeURIComponent(string).split('&');
    var result = {};
    pairs.each(function(pair) {
        var x = pair.split('=');
        result[x[0]] = x[1];
    });
    return result;
};


// -------------------------------------------------------------------------------------------------
// AJAX

M.ajax = function(url, options) {

    if (!options) options = {};
    var xhr = new XMLHttpRequest();

    var respond = function() {
        var status = xhr.status;

        if (!status && xhr.responseText || status >= 200 && status < 300 || status === 304) {
            if (!options.success) return;

            if (options.dataType === 'html') {
                var doc = document.implementation.createHTMLDocument('');
                doc.open();
                doc.write(xhr.responseText);
                doc.close();
                /* TODO Scripts in Ajax DOM
                $T('script', doc).each(function(script){
                    var s = $N('script', { html: script.html() });
                    document.body.appendChild(s.$el);
                });
                */
                options.success(doc);
            } else if (options.dataType === 'json') {
                options.success(JSON.parse(xhr.responseText));
            } else {
                options.success(xhr.responseText);
            }

        } else {
            if (options.error) options.error(xhr);
        }
    };

    if (xhr.onload) {
        xhr.onload = xhr.onerror = respond;
    } else {
        xhr.onreadystatechange = function() { if (xhr.readyState === 4) respond(); };
    }

    // Default URL
    if (!options.url) options.url = window.location.toString();

    // GET Data
    if (options.method === 'GET' || options.method === 'HEAD') {
        url += (url.indexOf('?') >= 0 ? '&' : '?');
        if (options.data) url += M.toQueryString(options.data) + '&';
        if (options.cache === false) url += '_nocache=' + Date.now();
    }

    // Open XHR Request
    if (options.async == null) options.async = 'true';
    xhr.open(options.method ? options.method.toUpperCase() : 'GET',
             url, options.async, options.user, options.password);

    // Additional headers
    if (options.headers && xhr.setRequestHeader)
        M.each(options.headers, function(header, value) {
			xhr.setRequestHeader(header, value);
		});

    // Check for crossDomain
    if (options.crossDomain == null) options.crossDomain =
        /^([\w-]+:)?\/\/([^\/]+)/.test(options.url) && RegExp.$2 !== window.location.host;
    if (options.crossDomain) xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    // POST Data
    var postData = null;
    if (options.processData == null) options.processData = true;
    if (options.contentType == null) options.contentType = 'application/x-www-form-urlencoded';

    if (options.data && (options.method === 'POST' || options.method === 'PUT')) {
        var postDataInstances = [ArrayBuffer, Blob, Document, FormData];
        if (!options.processData || postDataInstances.indexOf(options.data.constructor) >= 0) {
            postData = options.data;
        } else {
            // NOTE Check Ajax Post Data
            var boundary = '---------------------------' + Date.now().toString(16);
            if (options.contentType === 'multipart\/form-data') {
                xhr.setRequestHeader('Content-Type', 'multipart\/form-data; boundary=' + boundary);
            } else {
                xhr.setRequestHeader('Content-Type', options.contentType);
            }
            postData = '';
            var _data = M.toQueryString(options.data);
            if (options.contentType === 'multipart\/form-data') {
                boundary = '---------------------------' + Date.now().toString(16);
                _data = _data.split('&');
                var _newData = [];
                for (var i = 0; i < _data.length; i++) {
                    _newData.push('Content-Disposition: form-data; name="' +
						_data[i].split('=')[0] + '"\r\n\r\n' + _data[i].split('=')[1] + '\r\n');
                }
                postData = '--' + boundary + '\r\n' + _newData.join('--' + boundary + '\r\n') +
					'--' + boundary + '--\r\n';
            } else {
                postData = options.contentType === 'application/x-www-form-urlencoded' ?
					_data : _data.replace(/&/g, '\r\n');
            }
        }
    }

    // Send XHR Request
    xhr.send(postData);
};


// -------------------------------------------------------------------------------------------------
// Request Wrappers

M.get = function (url, data, success) {
    return M.ajax(url, {
        method: 'GET',
        dataType: 'html',
        data: typeof data === 'function' ? null : data,
        success: typeof data === 'function' ? data : success
    });
};

M.post = function (url, data, success) {
    return M.ajax(url, {
        method: 'POST',
        dataType: 'html',
        data: typeof data === 'function' ? null : data,
        success: typeof data === 'function' ? data : success
    });
};

M.getJSON = function (url, data, success) {
    return M.ajax(url, {
        method: 'GET',
        dataType: 'json',
        data: typeof data === 'function' ? null : data,
        success: typeof data === 'function' ? data : success
    });
};

M.getScript = function(src, success, error) {
    var script = document.createElement('script');
    script.type = 'text/javascript';

    if (error) script.onerror = error;
    if (success) script.onload = success;

    document.head.appendChild(script);
    script.src = src;
};
