/**
 * @filename background.js
 * @author Jan Biniok <jan@biniok.net>
 * @licence GPL v3
 */

var TM_tabs = {};
var TM_storage = {};
var TM_storageListener = [];
var TM_cmds = [];

var condAppendix = '@re';
var storeAppendix = '@st';
var windowExcludes = [];

var urlAll = '://*/*';
var urlAllHttp = 'http' + urlAll;
var urlAllHttps = 'https' + urlAll;
var urlAllInvalid = '*';
var urlSecurityIssue = '.*/';
var urlTld = '.tld/';
var urlAllTlds = '(museum|travel|aero|arpa|coop|info|jobs|name|nvus|biz|com|edu|gov|int|mil|net|org|pro|xxx|ac|ad|ae|af|ag|ai|ak|al|al|am|an|ao|aq|ar|ar|as|at|au|aw|ax|az|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|co|cr|cs|ct|cu|cv|cx|cy|cz|dc|de|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fl|fm|fo|fr|ga|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gu|gw|gy|hi|hk|hm|hn|hr|ht|hu|ia|id|id|ie|il|il|im|in|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|ks|kw|ky|ky|kz|la|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|ma|mc|md|md|me|mg|mh|mi|mk|ml|mm|mn|mn|mo|mo|mp|mq|mr|ms|ms|mt|mt|mu|mv|mw|mx|my|mz|na|nc|nc|nd|ne|ne|nf|ng|nh|ni|nj|nl|nm|no|np|nr|nu|ny|nz|oh|ok|om|or|pa|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|pr|ps|pt|pw|py|qa|re|ri|ro|ru|rw|sa|sb|sc|sc|sd|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|tn|to|tp|tr|tt|tv|tw|tx|tz|ua|ug|uk|um|us|ut|uy|uz|va|va|vc|ve|vg|vi|vi|vn|vt|vu|wa|wf|wi|ws|wv|wy|ye|yt|yu|za|zm|zw)';

var scriptOptions = ['compat_metadata',
                     'compat_foreach',
                     'compat_arrayleft',
                     'compat_wrappedobj',
                     'compat_filterproto',
                     'poll_unsafewindow',
                     'poll_unsafewindow_allvars',
                     'poll_unsafewindow_interval'];

var Script = function() {
    this.observers = [];
    this.icon = '';
    this.fileURL = null;
    this.name = null;
    this.namespace = null;
    this.description = null;
    this.system = false;
    this.enabled = true;
    this.position = 0;
    this.requires = [];
    this.includes = [];
    this.excludes = [];
    this.resources = [];
    this.options = {
        compat_metadata : false,
        compat_foreach : false,
        compat_arrayleft : false,
        compat_wrappedobj : false,
        compat_filterproto : false,
        poll_unsafewindow : false,
        poll_unsafewindow_allvars : false,
        poll_unsafewindow_interval : 10000,
    };
};

/* ###### Helpers ####### */

var getStringBetweenTags = function(source, tag1, tag2) {
    var b = source.search(escapeForRegExp(tag1));
    if (b == -1) {
        return "";
    }
    if (!tag2) {
        return source.substr(b + tag1.length);
    }
    var e = source.substr(b + tag1.length).search(escapeForRegExp(tag2));

    if (e == -1) {
        return "";
    }
    return source.substr(b + tag1.length, e);
};

var versionCmp = function(v1, v2) {
    var a1 = v1.split('.');
    var a2 = v2.split('.');
    var len = a1.length < a2.length ? a1.length : a2.length;

    for (var i=0; i<len; i++) {
        if (a1.length < len) a1[i] = 0;
        if (a2.length < len) a2[i] = 0;
        if (Number(a1[i]) > Number(a2[i])) {
            return true;
        } else if (Number(a1[i]) < Number(a2[i])) {
            return false;
        }
    }

    return null;
};

/* ###### URL Handling ####### */

var escapeForRegExp = function(str) {
    var re = new RegExp( '(\\' + [ '/', '.', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\' ].join('|\\') + ')', 'g');
    return str.replace(re, '\\$1');
};

var getRegExpFromUrl = function(url) {

    var u;
    if (Config.values.tryToFixUrl && url == urlAllInvalid) {
        u = urlAllHttp;
    } else if (Config.values.safeUrls && url != urlAllHttp && url != urlAllHttps && url.search(escapeForRegExp(urlSecurityIssue)) != -1) {
        u = url.replace(escapeForRegExp(urlSecurityIssue), urlTld);
    } else {
        u = url;
    }
    u = escapeForRegExp(u);
    u = u.replace(/\*/gi, '.*');
    u = u.replace(escapeForRegExp(urlTld), '.' + urlAllTlds + '\/');

    return '(' + u + ')';
};

var getNameFromUrl = function(url) {
    var s = url.split('/')
    if (!s.length) return '';
    return s[s.length-1];
};


/* ###### Extension Helpers ####### */

chrome.extension.getVersion = function() {

    if (!chrome.extension.version_) {

        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", chrome.extension.getURL('manifest.json'), false);
            xhr.send(null);
            var manifest = JSON.parse(xhr.responseText);

            chrome.extension.version_ = manifest.version;
            chrome.extension.updateurl_ = manifest.update_url;

        } catch (e) {
            console.log(e);
            chrome.extension.version_ = '0.0.0.0';
            chrome.extension.updateurl_ = null;
        }
    }

    return chrome.extension.version_;
};

chrome.extension.getID = function() {
    var p = chrome.extension.getURL('/');
    var ida = p.replace(/\//gi, '').split(':');
    return (ida.length < 2) ? '' : ida[1];
};

/* ###### version related data conversion ####### */

var convertData = function() {

    var newversion = chrome.extension.getVersion();
    var version = TM_storage.getValue("TM_version", "0.0.0.0");

    if (versionCmp(newversion, version)) {
        if (versionCmp("1.0.0.4", version)) {
            reorderScripts();
        }
        if (versionCmp("1.0.0.5", version)) {
            var names = getAllScriptNames();
            for (var k in names) {
                var n = names[k];
                var r = loadScriptByName(n);
                if (!r.script || !r.cond) {
                    console.log("fatal error!!!");
                    continue;
                }
                if (r.script.options == undefined) {
                    var d = new Script();
                    r.script.options = d.options;
                    for (var i=0; i<scriptOptions.length;i++) {
                        r.script.options[scriptOptions[i]] = r.script[scriptOptions[i]];
                        delete r.script[scriptOptions[i]];
                    }
                    storeScript(r.script.name, r.script);
                }
            }
        }
    }

    TM_storage.setValue("TM_version", newversion);
};

/* ###### Storage ####### */

TM_storage.deleteValue = function(name) {
    localStorage.removeItem(name);
};

TM_storage.listValues = function() {
    var ret = new Array();
    for (var i=0; i<localStorage.length; i++) {
        ret.push(localStorage.key(i));
    }
    return ret;
};

TM_storage.getValue = function(name, defaultValue) {
    var value = localStorage.getItem(name);
    if (!value)
        return defaultValue;
    var type = value[0];
    value = value.substring(1);
    switch (type) {
      case 'b':
          return value == 'true';
      case 'n':
          return Number(value);
      case 'o':
          try {
              return JSON.parse(value);
          } catch (e) {
              console.log(e);
              return defaultValue;
          }
      default:
          return value;
    }
};

TM_storage.setValue = function(name, value) {
    var type = (typeof value)[0];
    switch (type) {
      case 'o':
          try {
              value = type + JSON.stringify(value);
          } catch (e) {
              console.log(e);
              return;
          }
          break;
      default:
          value = type + value;
    }

    localStorage.setItem(name, value);
};

/* ###### unsafeWindow poller ######### */

var unsafeWindowPollerInit = function() {

    this.getWindowExcludes = function() {
        var a = [];
        for (var k in window) {
            a.push(k);
        }
        return a;
    };

    this.determineUsedUnsafeWindowVars = function(script) {
        var arr = script.textContent.split('unsafeWindow.');
        var ret = [];
        for (var i = 1; i < arr.length; i++) {
            var a = arr[i];
            // ignore first item
            var p = a.search(/[ \t\n;:=\(\)\[\]\.\,\{\}]/);
            if (p != -1) {
                var excl = false;
                var n = a.substr(0, p);
                for (var k in windowExcludes) {
                    if (windowExcludes[k] == n) {
                        excl = true;
                        break;
                    }
                }
                if (excl) continue;
                for (var k in ret) {
                    if (ret[k] == n) {
                        excl = true;
                        break;
                    }
                }
                if (!excl) {
                    ret.push(n);
                }
            }
        }
        return ret;
    };
};

/* ###### hehe ######### */

var defaultScripts = function() {

    var userscripts_header = '';

    userscripts_header += '// ==UserScript==\n';
    userscripts_header += '// @name       TamperScript\n';
    userscripts_header += '// @namespace  http://tampermonkey.biniok.net/\n';
    userscripts_header += '// @version    1.2\n';
    userscripts_header += '// @description  make UserScripts links one-click installable (links to *.user.js are caught by chrome)\n';
    userscripts_header += '// @include    http://*/*\n';
    userscripts_header += '// @copyright  2010+, Jan Biniok\n';
    userscripts_header += '// @license    GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html\n';
    userscripts_header += '// ==/UserScript==\n\n';

    var userscripts = function() {
        var userscript = ".user.js";

        var tamperScriptClickHandler = function(url) {
            var cb = function (req) {
                if (req.readyState == 4 && req.status == 200) {
                    TM_installScript(req.responseText, url);
                }
            };

            var details = {
                method: 'GET',
                url: url,
                headers: {
                    "Content-type": "application/x-www-form-urlencoded",
                },
                onload: cb,
                onerror: cb
            };

            TM_xmlhttpRequest(details);
        };

        var modifyUserScriptLinks = function() {
            var aarr = document.getElementsByTagName('a');
            for (var k in aarr) {
                var a = aarr[k];
                if (a.href && a.href.search(userscript) != -1) {
                    a.addEventListener('click', function () { tamperScriptClickHandler(this.tamper)});
                    a.tamper = a.href;
                    a.href = 'javascript://nop/';
                }
            }
        }

        modifyUserScriptLinks();
    }

    return [ userscripts_header + '(' + userscripts.toString() + ')();' ];
};

/* ###### Config ####### */
var configInit = function() {

    var oobj = this;
    this.defaults = { safeUrls: true,
                      tryToFixUrl: true,
                      debug: false,
                      showFixedSrc: false,
                      firstRun: true};

    this.load = function() {
        oobj.values = TM_storage.getValue("TM_config", oobj.defaults);
        var ds = defaultScripts();
        for (var k in ds) {
            var s = ds[k];
            window.setTimeout(function() { addNewUserScript(null, null, s, false, true); }, 100 );
        }
    };

    this.load();

    this.save = function() {
        var c = oobj.values;
        var inst = c.firstRun;
        c.firstRun = false;
        TM_storage.setValue("TM_config", c);
    };

    if (this.values.firstRun) {
        this.save();
    }

    return this;
};


/* ###### Runtime ####### */

var runtimeInit = function() {

    this.validScheme = function(url) {
        return (url && url.length > 4 && url.substr(0,4) == 'http');
    };

    this.xmlhttpRequest = function(details, callback) {
        var xmlhttp = new XMLHttpRequest();
        var onload = function() {
            var responseState = {
                responseXML: (xmlhttp.readyState == 4 ? (xmlhttp.responseXML ? escape(xmlhttp.responseXML) : null) : ''),
                responseText: (xmlhttp.readyState == 4 ? xmlhttp.responseText : ''),
                readyState: xmlhttp.readyState,
                responseHeaders: (xmlhttp.readyState == 4 ? xmlhttp.getAllResponseHeaders() : ''),
                status: (xmlhttp.readyState == 4 ? xmlhttp.status : 0),
                statusText: (xmlhttp.readyState == 4 ? xmlhttp.statusText : '')
            };
            if (callback) {
                callback(responseState);
            }
        }
        xmlhttp.onload = onload;
        xmlhttp.onerror = onload;
        try {
            if (!this.validScheme(details.url)) {
                throw new Error("Invalid scheme of url: " + details.url);
            }
            xmlhttp.open(details.method, details.url);
            if (details.headers) {
                for (var prop in details.headers) {
                    xmlhttp.setRequestHeader(prop, details.headers[prop]);
                }
            }
            if (typeof(details.data) !== 'undefined') {
                xmlhttp.send(details.data);
            } else {
                xmlhttp.send();
            }
        } catch(e) {
            console.log(e);
            if(callback) {
                var resp = { responseXML: '',
                             responseText: '',
                             readyState: 4,
                             responseHeaders: '',
                             status: 403,
                             statusText: 'Forbidden'};
                callback(resp);
            }
            return;
        }
    };

    this.encode64 = function(data){
        var key="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var c1,c2,c3,enc3,enc4,i=0,o="";
        while(i<data.length){
            c1=data.charCodeAt(i++);
            if(c1>127) c1=88;
            c2=data.charCodeAt(i++);
            if(c2>127) c2=88;
            c3=data.charCodeAt(i++);
            if(c3>127) c3=88;
            if(isNaN(c3)) {enc4=64; c3=0;} else enc4=c3&63;
            if(isNaN(c2)) {enc3=64; c2=0;} else enc3=((c2<<2)|(c3>>6))&63;
            o+=key.charAt((c1>>2)&63)+key.charAt(((c1<<4)|(c2>>4))&63)+key.charAt(enc3)+key.charAt(enc4);
        }
        return encodeURIComponent(o);
    }

    this.getNextResource = function(script, cb) {

        var oobj = this;

        var storeResource = function(req, res) {
            res.loaded = true;
            res.resUrl = '';
            res.resText = '';

            var image = null;
            var rh = req.responseHeaders.split('\n');

            for (var k in rh) {
                var h = rh[k].split(':');
                if (h.length >= 2 &&
                    h[0].trim() == 'Content-Type' &&
                    h[1].search('image') != -1) {
                    image = h[1].trim();
                }
            }

            if (req.readyState == 4 && req.status == 200) {
                res.resText = req.responseText;
                if (!image) {
                    res.resURL = oobj.encode64(req.responseText);
                } else {
                    res.resURL = 'data:' + image + ';base64,' + oobj.encode64(req.responseText);
                }
                cb(script);
            }
        };

        for (var k in script.resources) {
            var r = script.resources[k];
            if (!r.loaded) {

                var details = {
                    method: 'GET',
                    url: r.url,
                };

                console.log("request " + r.url);
                Runtime.xmlhttpRequest(details, function(req) { storeResource(req, r); }, true);
                return true;
            }
        }

        return false;
    };

    this.getRequires = function(script, cb) {

        var oobj = this;

        var fillRequire = function(req, res) {
            res.loaded = true;
            if (req.readyState == 4 && req.status == 200) {
                res.textContent = req.responseText;
            }
        };

        for (var k in script.requires) {
            var r = script.requires[k];
            if (!r.loaded && r.url) {
                var details = {
                    method: 'GET',
                    url: r.url,
                };

                console.log("requires " + r.url);
                this.xmlhttpRequest(details, function(req) {
                                        fillRequire(req, r);
                                        oobj.getRequires(script, cb);
                                    });
                return true;
            }
        }

        cb();
    };

    this.contentLoad = function(tab, main) {

        var oobj = this;
        if (this.getNextResource(main, function(script) { oobj.contentLoad(tab, script); })) {
            return;
        }

        this.currentTab = tab;
        if (typeof TM_tabs[tab.id] == 'undefined') TM_tabs[tab.id] = { storage: {} };
        
        var req_cb = function() {
            var scripts = [];
            scripts.push(main);

            console.log("run script @ " + tab.url + " - " + main.name);

            oobj.injectScript(scripts, tab);
        };

        this.getRequires(main, req_cb);
    };

    this.getUrlContents = function(url) {

        var content = '';
        var xhr = new XMLHttpRequest();
        xhr.open("GET", '/' + url, false);
        xhr.send(null);
        content = xhr.responseText;
        return content;
    };

    this.createEnv = function(src, script) {

        src = compaMo.mkCompat(src, script);

        if (Config.values.debug) {
            console.log("env option: debug scripts");
            src = compaMo.debugify(src);
        }

        return src;
    };

    this.injectScript = function(scripts, tab) {
        var script;

        for (var i = 0; script = scripts[i]; i++) {
            var requires = [];

            script.requires.forEach(function(req) {
                                        // TODO: option to use compaMo.mkCompat here !?!
                                        var contents = req.textContent;
                                        requires.push(contents);
                                    });

            var scriptSrc = "\n" + requires.join("\n") + "\n" + script.textContent + "\n";
            var storage = loadScriptStorage(script.name);
            var dblscript = {};

            for (var k in script) {
                if (k == 'includes' || 
                    k == 'requires' ||
                    k == 'excludes' || 
                    k == 'textContent') continue;
                dblscript[k] = script[k];
            }

            chrome.tabs.sendRequest(this.currentTab.id,
                                    { method: "executeScript",
                                      code: this.createEnv(scriptSrc, script),
                                      version: chrome.extension.getVersion(),
                                      storage: storage,
                                      script: dblscript,
                                      windowExcludes: JSON.stringify(windowExcludes),
                                      scriptIncludes: JSON.stringify(Poller.determineUsedUnsafeWindowVars(script))},
                                    function(response) {});
        }
    };
};

/* ###### UserScript Runtime ####### */

var processHeader = function(header) {
    var script = new Script();

    var tags = ['name', 'namespace', 'version', 'author', 'description'];

    // security...
    header = header.replace(/\'/gi, '').replace(/\"/gi, '');
    // convinience ;)
    header = header.replace(/\t/gi, '    ');
    header = header.replace(/\r/gi, '');

    for (var t in tags) {
        script[tags[t]] = getStringBetweenTags(header, tags[t], '\n').trim();
    }

    var lines = header.split('\n');

    for (var i in lines) {
        var l = lines[i].replace(/^\/\//gi, '').replace(/^ /gi, '').replace(/  /gi, ' ');
        if (l.search(/^@include/) != -1) {
            var c = l.replace(/^@include/gi, '').replace(/[ \b\r\n]/gi, '');
            // console.log("c " + c);
            script.includes.push(c);
        }
        if (l.search(/^@exclude/) != -1) {
            var c = l.replace(/^@exclude/gi, '').replace(/[ \b\r\n]/gi, '');
            // console.log("c " + c);
            script.excludes.push(c);
        }
        if (l.search(/^@require/) != -1) {
            var c = l.replace(/^@require/gi, '').replace(/[ \b\r\n]/gi, '');
            // console.log("c " + c);
            var o = { url: c, loaded: false, textContent: ''};
            script.requires.push(o);
        }
        if (l.search(/^@resource/) != -1) {
            var c = l.replace(/^@resource/gi, '').replace(/[\r\n]/gi, '');
            var s = c.trim().split(' ');
            // console.log("c " + c);
            // console.log("s " + s);
            if (s.length >= 2) {
                script.resources.push({name: s[0], url: s[1], loaded: false});
            }
        }
    }

    if (script.version == '') script.version = "0.0";

    return script;
};

var removeUserScript = function(name) {
    storeScript(name, null);
    storeScriptStorage(name, null);
};

var addNewUserScript = function(tabid, url, src, ask, defaultscript, noreinstall) {

    if (defaultscript == undefined) defaultscript = false;
    if (ask == undefined) ask = true;
    if (url == undefined || url == null) url = "";

    // save some space ;)
    src = src.replace(/\r/g, '');

    var t1 = '==UserScript==';
    var t2 = '==/UserScript==';

    var header = getStringBetweenTags(src, t1, t2);

    if (!header || header == '') return false;

    var script = processHeader(header);
    var oldscript = TM_storage.getValue(script.name, null);
    var jsonscript = JSON.stringify(script);

    script.textContent = src;
    script.system = defaultscript;
    script.fileURL = url;
    script.position = oldscript ? oldscript.position : determineLastScriptPosition() + 1;
    var msg = '';

    if (!script.name || script.name == '') {
        chrome.tabs.sendRequest(tabid,
                                { method: "showMsg", msg: 'Invalid UserScript. Sry!'},
                                function(response) {});
        return false;
    } else if (script.name.search('@') != -1) {
        chrome.tabs.sendRequest(tabid,
                                { method: "showMsg", msg: 'Invalid UserScript name. Sry!'},
                                function(response) {});
        return false;
    } else if (oldscript && script.version == oldscript.version) {
        if (defaultscript || noreinstall) {
            // stop here... we just want to update (system) scripts...
            return null;
        }
        // TODO: allow reinstall, doublecheck changed includes
        msg += 'You are about to reinstall a UserScript:     \n';
        msg += '\nName:\n';
        msg += '    ' + script.name + ((script.version != '') ? ' v' + script.version : '') +  '\n';
        msg += '\nInstalled Version:\n';
        msg += '    ' + 'v' + script.version +  '\n';
    } else if (oldscript && !versionCmp(script.version, oldscript.version)) {
        chrome.tabs.sendRequest(tabid,
                                { method: "showMsg", msg: 'You can\'t downgrade ' + script.name + '\nfrom version ' + oldscript.version + ' to ' + script.version},
                                function(response) {});
        return false;
    } else if (oldscript) {
        // TODO: allow reinstall, doublecheck changed includes
        if (defaultscript) script.enabled = oldscript.enabled;
        msg += 'You are about to update a UserScript:     \n';
        msg += '\nName:\n';
        msg += '    ' + script.name + ((script.version != '') ? ' v' + script.version : '') +  '\n';
        msg += '\nInstalled Version:\n';
        msg += '    ' + 'v' + oldscript.version +  '\n';
    }  else {
        msg += 'You are about to install a UserScript:     \n';
        msg += '\nName:\n';
        msg += '    ' + script.name + ((script.version != '') ? ' v' + script.version : '') +  '\n';
    }

    if (!script.includes.length) {
        msg += '\nNote: \n';
        msg += '    ' + 'This script does not provide any @include information.\n';
        msg += '    ' + 'TamperMonkey assumes "' + urlAllHttp + '" in order to continue!    \n';
        script.includes.push(urlAllHttp);
    }

    if (oldscript && oldscript.fileURL != script.fileURL) {
        msg += '\nNote: \n';
        msg += '    ' + 'The update url has changed from:\n';
        msg += '    "' + oldscript.fileURL + '"\n';
        msg += '    ' + 'to:\n';
        msg += '    "' + script.fileURL + '"\n';
    }

    var g = script.excludes.length + script.includes.length;
    var c = 0;
    var m = 4;

    msg += '\nInclude(s):\n';
    for (var k in script.includes) {
        msg += '    ' + script.includes[k];
        msg += (g < 25) ? '\n' : (c < m) ? ';' : '\n';
        if (c++ >= m) c = 0;
    }
    c = 0;
    if (script.excludes.length) {
        msg += '\nExclude(s):\n';
        for (var k in script.excludes) {
            msg += '    ' + script.excludes[k];
            msg += (g < 25) ? '\n' : (c < m) ? ';' : '\n';
            if (c++ >= m) c = 0;
        }
    }

    var compDe = false;
    var unWiVaLe = Poller.determineUsedUnsafeWindowVars(script);

    if (unWiVaLe.length) {
        script.poll_unsafewindow = true;
    }

    if (compaMo.mkCompat(src) != src) {
        compDe = true;
        if (src != compaMo.unMetaDataify(src)) script.options.compat_metadata = true;
        if (src != compaMo.unEachify(src)) script.options.compat_foreach = true;
        if (src != compaMo.unArrayOnLeftSideify(src)) script.options.compat_arrayleft = true;
        if (src != compaMo.unWrappedObjectify(src)) script.options.compat_wrappedobj = true;
        if (compaMo.checkFilterRegExp(src)) script.options.compat_filterproto = true;
    }

    if (unWiVaLe.length || compDe) {
        msg+= "\nNote: A recheck of the GreaseMonkey/FF       \n    compatibility options may be \n    required in order to run this script.\n\n";
    }

    msg+= "\nDo you want to continue?";

    var doit = function() {
        storeScript(script.name, script);
        var allitems = createOptionItems();
        chrome.extension.sendRequest({ method: "updateOptions",
                                             items: allitems },
                                     function(response) {});
    };

    if (ask) {
        chrome.tabs.sendRequest(tabid,
                                { method: "confirm", msg: msg},
                                function(response) {
                                    if (response.confirm) {
                                        doit();
                                    }
                                });
    } else {
        doit();
    }
    return true;
};

var updateUserscripts = function(tabid) {
    var names = getAllScriptNames();
    var pos = 0;
    var runing = 1;
    var updated = 0;
    for (var k in names) {
        var n = names[k];
        var r = loadScriptByName(n);
        if (!r.script || !r.cond) {
            console.log("fatal error!!!");
            continue;
        }
        if (r.script.fileURL && r.script.fileURL != "") {
            var details = {
                method: 'GET',
                url: r.script.fileURL,
            };

            runing++;
            var obj = { tabid: tabid, r: r};
            var cb = function(req) {
                runing--;
                if (req.readyState == 4 && req.status == 200) {
                    console.log(obj.r.script.fileURL);
                    var ret = addNewUserScript(obj.tabid, obj.r.script.fileURL, req.responseText, true, false, true);
                    // confirm installation of new scripts but don't reinstall equal versions!
                    if (ret == null) {
                        // same version found
                    } else if (ret == false) {
                        console.log("UpdateCheck of '" + obj.r.script.name + "' (url: " + obj.r.script.fileURL + ") failed!");
                        console.log(" got strange source code: " + escape(req.responseText));
                    } else {
                        // installed or used asked for
                        console.log("Update found for '" + obj.r.script.name + "'");
                        updated++;
                    }
                } else {
                    console.log("UpdateCheck of '" + obj.r.script.name + "' (url: " + obj.r.script.fileURL + ") failed!");
                }
                if (runing == 0 && updated == 0) {
                    chrome.tabs.sendRequest(tabid,
                                            { method: "showMsg", msg: 'No update found, sry!'},
                                            function(response) {});
                }
            };

            Runtime.xmlhttpRequest(details, cb);
        }
    }
    runing--;
    // remove initialy assigned 1
};

var determineLastScriptPosition = function() {
    var names = getAllScriptNames();
    var pos = 0;
    for (var k in names) {
        var n = names[k];
        var r = loadScriptByName(n);
        if (!r.script || !r.cond) {
            console.log("fatal error!!!");
            continue;
        }
        if (r.position && r.position > pos) pos = r.position;
    }
    var s = new Script();
    if (s.position > pos) pos = s.position;
    return pos;
};

var validUrl = function(href, cond) {
    var run = false;
    for (var t in cond.inc) {
        var r = new RegExp(getRegExpFromUrl(cond.inc[t]));
        if (r.test(href)) {
            run = true;
            break;
        }
    }
    if (!run) return run;
    for (var t in cond.exc) {
        var r = new RegExp(getRegExpFromUrl(cond.exc[t]));
        if (r.test(href)) {
            run = false;
            break;
        }
    }
    return run;
};

var loadScriptByName = function(name) {
    return { script: TM_storage.getValue(name, null), cond: TM_storage.getValue(name + condAppendix, null) };
};

var getAllScriptNames = function() {
    var values = TM_storage.listValues();
    var ret = [];
    for (var k in values) {
        var v = values[k];
        // TODO: use appendix
        if (v.search(/@re$/) == -1) continue;
        ret.push(v.split('@')[0]);
    }
    return ret;
};

var reorderScripts = function(name, pos) {
    var scripts = determineScriptsToRun();
    // add position tag
    for (var i=0;i<scripts.length;i++) {
        var s = scripts[i];
        if (s.name == name) {
            var f = (s.position < pos) ? .5 : -.5;
            s.position = (Number(pos) + f);
        }
    }
    scripts = sortScripts(scripts);
    p = 1;
    for (var i=0;i<scripts.length;i++) {
        var s = scripts[i];
        s.position = p++;
        storeScript(s.name, s);
    }
    
};

var sortScripts = function(results) {
    var numComparisonAsc = function(a, b) { return a.position-b.position; };
    results.sort(numComparisonAsc);
    return results;
}

var determineScriptsToRun = function(href) {
    var names = getAllScriptNames();
    var ret = [];

    for (var k in names) {
        var n = names[k];

        if (href) {
            var cond = TM_storage.getValue(n + condAppendix, null);
            if (!cond) continue;
            if (!validUrl(href, cond)) continue;
        }

        var r = loadScriptByName(n);

        if (!r.script || !r.cond) {
            console.log("fatal error!!!");
            continue;
        }

        ret.push(r.script);
    }

    return sortScripts(ret);
};

/* ###### Storage ####### */

var loadScriptStorage = function(name) {
    var s = TM_storage.getValue(name + storeAppendix, { ts: 0, data: {}});
    if (typeof s.ts === 'undefined') s.ts = 0;
    if (typeof s.data === 'undefined') s.data = {};
    return s;
};

var storeScriptStorage = function(name, storage) {
    if (storage) {
        TM_storage.setValue(name + storeAppendix, storage);
    } else {
        TM_storage.deleteValue(name + storeAppendix);
    }
};

var storeScript = function(name, script) {
    if (script) {
        TM_storage.setValue(name + condAppendix, { inc: script.includes , exc: script.excludes });
        TM_storage.setValue(name, script);
    } else {
        TM_storage.deleteValue(name + condAppendix);
        TM_storage.deleteValue(name);
    }
};

var notifyStorageListeners = function(name) {
    var old = TM_storageListener;
    var listenerTimeout = 300 * 1000
    var t = (new Date()).getTime() - listenerTimeout;
    TM_storageListener = [];
    for (var k in old) {
        var c = old[k];
        if (c.name == name) {
            // console.log('storage notify ' + name);
            c.response({ storage : loadScriptStorage(c.name) });
        } else if (c.time > t) {
            // trigger refresh in case the listener is still listening...
            // console.log('storage refresh ' + name);
            c.response({})
        } else {
            TM_storageListener.push(c);
        }
    }
};

/* ###### Request Handler ####### */

var requestHandler = function(request, sender, sendResponse) {
    // console.log("back: request.method " + request.method);
    if (request.method == "xhr") {
        var cb = function(req) { sendResponse({data: req});};
        Runtime.xmlhttpRequest(request.details, cb);
    } else if (request.method == "openInTab") {
        chrome.tabs.create({ url: request.url});
        sendResponse({});
    } else if (request.method == "getTab") {
        if (typeof sender.tab != 'undefined') {
            if (typeof TM_tabs[sender.tab.id] == 'undefined') TM_tabs[sender.tab.id] = { storage: {} };
            var tab = TM_tabs[sender.tab.id];
            sendResponse({data: tab});
        } else {
            console.log("unable to deliver tab due to empty tabID");
            sendResponse({data: null});
        }
    } else if (request.method == "getTabs") {
        sendResponse({data: TM_tabs});
    } else if (request.method == "saveTab") {
        if (typeof sender.tab != 'undefined') {
            var tab = {};
            for (var k in request.tab) {
                tab[k] = request.tab[k];
            };
            TM_tabs[sender.tab.id] = tab;
        } else {
            console.log("unable to save tab due to empty tabID");
        }
        sendResponse({});
    } else if (request.method == "addStorageListener") {
        if (typeof sender.tab != 'undefined') {
            // console.log("storage add listener " + request.name);
            TM_storageListener.push({name: request.name, time: (new Date()).getTime(), response: sendResponse});
        } else {
            console.log("unable to load storage due to empty tabID");
            sendResponse({ error: true });
        }
    } else if (request.method == "saveStorage") {
        if (typeof sender.tab != 'undefined') {
            if (request.name) {
                var s = loadScriptStorage(request.name);
                if (request.storage.ts != undefined &&
                    request.storage.ts > s.ts) {
                    // console.log("storage store " + request.name);
                    storeScriptStorage(request.name, request.storage);
                    notifyStorageListeners(request.name);
                }
            }
        } else {
            console.log("unable to save storage due to empty tabID");
        }
        sendResponse({});
    } else if (request.method == "setOption") {
        var optionstab = (typeof sender.tab != 'undefined' && sender.tab) ? sender.tab.id : null;

        Config.values[request.name] = request.value;
        Config.save();

        var items = createOptionItems();
        if (optionstab) {
            sendResponse({items: items});
        } else {
            chrome.extension.sendRequest({ method: "updateOptions",
                                                 items: items },
                                         function(response) {});
            sendResponse({});
        }
    } else if (request.method == "modifyScriptOptions") {
        var optionstab = (typeof sender.tab != 'undefined' && sender.tab) ? sender.tab.id : null;

        if (request.name) {
            var r = loadScriptByName(request.name);
            if (r.script && r.cond) {
                for (var i=0; i<scriptOptions.length;i++) {
                    if (typeof request[scriptOptions[i]] !== 'undefined') r.script.options[scriptOptions[i]] = request[scriptOptions[i]];
                }

                if (typeof request.enabled !== 'undefined') r.script.enabled = request.enabled;
                storeScript(r.script.name, r.script);
                if (typeof request.position !== 'undefined') {
                    reorderScripts(request.name, request.position);
                }
            }
        }
        var updateOptionsPage = function() {
            var allitems = createOptionItems();
            chrome.extension.sendRequest({ method: "updateOptions",
                                                 items: allitems },
                                         function(response) {});
        }
        if (optionstab) {
            updateOptionsPage();
        } else {
            if (request.name) window.setTimeout(updateOptionsPage,100);
            var resp = function(tab) {
                var items = createActionMenuItems(tab.url);
                sendResponse({items: items});
                if (request.name) {
                    chrome.tabs.sendRequest(tab.id,
                                            { method: "reload" },
                                        function(response) {});
                }
            };
            chrome.tabs.getSelected(null, resp);
        }
    } else if (request.method == "saveScript") {
        var optionstab = (typeof sender.tab != 'undefined' && sender.tab) ? sender.tab.id : null;

        // TODO: check renaming and remove old one
        if (request.code) {
            addNewUserScript(sender.tab.id, request.update_url, request.code);
        } else {
            removeUserScript(request.name);
        }
        var resp = function(tab) {
            var allitems = createOptionItems();
            sendResponse({items: allitems});
            if (request.name) {
                chrome.tabs.sendRequest(tab.id,
                                        { method: "reload" },
                                        function(response) {});
            }
        };
        chrome.tabs.getSelected(null, resp);
    } else if (request.method == "scriptClick") {
        if (typeof sender.tab != 'undefined') {
            addNewUserScript(sender.tab.id, request.url, request.src);
        } else {
            console.log("unable to install script tab due to empty tabID");
        }
        sendResponse({data: null});
    } else if (request.method == "onUpdate") {
        if (typeof sender.tab != 'undefined') {
            updateListener(sender.tab.id, {status: "complete"}, sender.tab);
        } else {
            console.log("unable to run scripts on tab due to empty tabID");
        }
        sendResponse({});
    } else if (request.method == "onLoad") {
        if (typeof sender.tab != 'undefined') {
            loadListener(sender.tab.id, {status: "complete"}, sender.tab);
        } else {
            console.log("unable to run scripts on tab due to empty tabID");
        }
        sendResponse({});
    } else if (request.method == "registerMenuCmd") {
        if (typeof sender.tab != 'undefined') {
            // console.log("MC add " + request.id);
            TM_cmds.push({ url: sender.tab.url, name: request.name, id: request.id, response: sendResponse});
        } else {
            console.log("unable to run scripts on tab due to empty tabID");
            sendResponse({ run: false });
        }
    } else if (request.method == "unRegisterMenuCmd") {
        // cmd is unregistered just by getting
        getRegisteredMenuCmd(request.id);
        sendResponse({});
    } else if (request.method == "execMenuCmd") {
        // cmd is unregistered just by getting
        var c = getRegisteredMenuCmd(request.id);
        // console.log("MC exec " + c.id);
        c.response({ run: true });
        sendResponse({});
    } else if (request.method == "runScriptUpdates") {
        var request = function(tob) {
            updateUserscripts(tob.id);
        };
        chrome.tabs.getSelected(null, request);
        sendResponse({});
    } else {
        console.log("b: unknown method " + request.method);
    }
};

/* #### Action Menu && Options Page ### */

var getRegisteredMenuCmdsByUrl = function(url) {
    var ret = [];
    for (var k in TM_cmds) {
        var c = TM_cmds[k];
        if (!url || c.url == url) ret.push(c);
    }
    return ret;
};

var getRegisteredMenuCmd = function(id) {
    var ret = null;
    var old = TM_cmds;
    TM_cmds = [];
    for (var k in old) {
        var c = old[k];
        if (c.id != id) {
            TM_cmds.push(c);
        } else {
            ret = c;
        }
    }
    // console.log("MC remove " + c.id);
    return ret;
};

var createActionMenuItems = function(url) {
    var ret = [];

    var s = convertMgmtToMenuItems(url);
    if (!s.length) {
        s.push({ name: 'No script is running', image: chrome.extension.getURL('images/info.png')});
    }
    s.push({ name: 'Get new scripts...', image: chrome.extension.getURL('images/edit_add.png'), url: 'http://userscripts.org', newtab: true});
    ret = ret.concat(s);
    ret.push(createDivider());

    var c = convertMenuCmdsToMenuItems(url);
    if (c.length) c.push(createDivider());
    c.push({ name: 'Check for Userscripts Updates', image: chrome.extension.getURL('images/update.png'), runUpdate: true});
    
    c.push(createDivider());
    c.push(createAboutItem());

    ret = ret.concat(c);
    return ret;
};

var createOptionItems = function() {
    var ret = [];
    var c = [];

    ret.push({ name: 'Settings', heading: true});
    ret.push({ name: 'make includes more safe', id: 'safeUrls', option: true, checkbox: true, enabled: Config.values.safeUrls,
               desc:  '(if enabled for example  "http://*google.*/*" is interpreted as "http://*google.tld/*" to avoid this script to work on "http://www.google.myevilpage.com/")'});
    ret.push({ name: 'fix includes', id: 'tryToFixUrl', option: true, checkbox: true, enabled: Config.values.tryToFixUrl,
               desc: '(this option converts a simple "*" to "http://*/*")' });
    ret.push({ name: 'debug scripts', id: 'debug', option: true, checkbox: true, enabled: Config.values.debug,
               desc: '' });
    ret.push({ name: 'show fixed source', id: 'showFixedSrc', option: true, checkbox: true, enabled: Config.values.showFixedSrc,
               desc: '' });

    ret.push(createDivider());
    ret.push({ name: 'Installed UserScripts',  heading: true});

    var s = convertMgmtToMenuItems(null, true);
    if (!s.length) {
        s.push({ name: 'No script is installed', image: chrome.extension.getURL('images/info.png')});
        s.push({ name: 'Get some scripts...', image: chrome.extension.getURL('images/edit_add.png'), url: 'http://userscripts.org', newtab: true});
    }

    ret.push ({ name: 'Add a new userscript',
                id: null,
                image: chrome.extension.getURL('images/edit_add.png'),
                code: '',
                enabled: true,
                userscript: true });

    ret = ret.concat(s);
    ret.push(createDivider());

    if (true) {
        ret.push({ name: 'Registered Menu Cmds', heading: true});

        c = convertMenuCmdsToMenuItems();
        if (c.length) c.push(createDivider());
    }
    ret = ret.concat(c);

    return ret;
};

var createDivider = function() {
    return divider = { name: '', divider: true};
};

var createAboutItem = function() {
    return { name: ' About TamperMonkey', image: chrome.extension.getURL('images/home.png'), url: 'http://tampermonkey.biniok.net/about.html?version=' + chrome.extension.getVersion(), newtab: true };
};

var convertMenuCmdsToMenuItems = function(url) {
    var ret = [];
    var arr = getRegisteredMenuCmdsByUrl(url);

    for (var k in arr) {
        var c = arr[k];
        var item = { name: c.name, id: c.id, image: chrome.extension.getURL('images/gear.png'), menucmd: true };
        ret.push(item);
    }
    return ret;
};

var convertMgmtToMenuItems = function(url, options) {
    if (options == undefined) options = false;
    var scripts = determineScriptsToRun(url);
    var ret = [];

    for (var k in scripts) {
        var script = scripts[k];
        var img = script.icon;
        if (img == '') {
            img = script.enabled
                ? chrome.extension.getURL('images/cnr.png')
                : chrome.extension.getURL('images/clicknrungrey.png');
        }
        var item = { name: script.name,
                     id: script.name,
                     image: img,
                     system: script.system,
                     update_url: script.fileURL,
                     checkbox: !options,
                     enabled: script.enabled,
                     position: script.position,
                     positionof : scripts.length,
                     userscript: true };

        for (var i=0; i<scriptOptions.length;i++) {
            item[scriptOptions[i]] = script.options[scriptOptions[i]];
        }

        if (options) {
            item.code = script.textContent;
            if (Config.values.showFixedSrc) {
                item.code = compaMo.mkCompat(script.textContent, script);
            }
        }
        ret.push(item);
    }

    return ret;
};

/* ### Compatibility Mode */

var compaMoInit = function () {

    this.mkCompat = function(src, script) {
        if (!script) {
            return this.unArrayOnLeftSideify(this.unWrappedObjectify(this.unEachify(this.unMetaDataify(src))));
        } else {
            if (script.options.compat_metadata) src = this.unMetaDataify(src);
            if (script.options.compat_foreach) src = this.unEachify(src);
            if (script.options.compat_wrappedobj) src = this.unWrappedObjectify(src);
            if (script.options.compat_arrayleft) src = this.unArrayOnLeftSideify(src);
        }
        return src;
    };

    this.debugify = function(src) {
        src = src.replace(/window\.setTimeout\(/g, 'TM_setTimeout(');
        src = src.replace(/window\.addEventListener\(/g, 'TM_addEventListener(');
        src = src.replace(/document\.setTimeout\(/g, 'TM_setTimeout(');
        src = src.replace(/document\.addEventListener\(/g, 'TM_addEventListener(');
        var re = new RegExp('(\\n| |\\t|;)(setTimeout)\\(', 'g')
        src = src.replace(re, '$1TM_$2(');
        return src;
    };

    this.checkFilterRegExp = function(src) {
        return (src.search(escapeForRegExp('.filter(/')) != -1);
    };

    /*
     * unArrayOnLeftSideify(src)
     *
     * replaces i.e
     *
     *  [, name, value] = line.match(/\/\/ @(\S+)\s*(.*)/);
     *
     * by
     *
     *  var __narf6439 = line.match(/\/\/ @(\S+)\s*(.*)/);;
     *  name = __narf6439[1];
     *  value = __narf6439[2];
     *  ...
     *
     */
    this.unArrayOnLeftSideify = function(src) {

        var lines = src.split('\n');

        for (var k in lines) {
            var line = lines[k];
            var wosp = line.replace(/[\t ]/g, '');
            var a1 = wosp.search(']=');
            var a2 = wosp.search(']==');
            var k1 = wosp.search('\\[');
            if (k1 != -1) {
                var ee = wosp.substr(0, k1);
                // seems to be a valid array assignement like a[0] = 'blub';
                if (ee != '') a1 = -1;
            }

            if (a1 != -1 && a1 != a2) {
                var nl = '';
                // stupid hack detected!
                var ie = line.search("=");
                var value = line.substr(ie+1, line.length-ie-1);
                var randvar = '__narf' + k.toString();

                nl += 'var ' + randvar + ' = ' + value + ';\n';

                var vars = getStringBetweenTags(wosp, '[', ']=');
                var vara = vars.split(',');

                for (var e in vara) {
                    var v = vara[e];
                    if (v.trim() != '') nl += v + ' = ' + randvar + '[' + e + '];\n';
                }
                lines[k] = nl;
            }
        }

        return lines.join('\n');
    };

    /*
     * unEachify(src)
     *
     * replaces i.e
     *
     *  for each (mod in mods) {;
     *
     * by
     *
     *  for (var k in mods) {;
     *     mod = mods[k];
     *     ...
     *
     */
    this.unEachify = function(src) {
        src = src.replace(/for each.*\(/gi, 'for each(');

        var t1 = 'for each';
        var t2 = '(';
        var t3 = ')';

        var arr = src.split(t1);

        for (var i = 1; i < arr.length; i++) {
            var a = arr[i];
            if (a.substr(0,1) != "(") {
                arr[i] = ' each' + arr[i];
                continue;
            }
            var f = getStringBetweenTags(a, t2, t3);
            var m = f.split(' ');
            var varname = null;
            var inname = null;
            var arrname = null;
            for (var e in m) {
                if (m[e] != '' && m[e] != 'var') {
                    if (!varname) {
                        varname = m[e];
                    } else if (!inname) {
                        inname = m[e];
                    } else if (!arrname) {
                        arrname = m[e];
                    }
                }
            }
            if (!varname || !arrname) {
                arr[i] = ' each' + arr[i];
                continue;
            }

            var n = 'var __kk in ' + arrname;
            var b = '';
            // filter the Array.prototype.filter function :-/
            b += '{\n' + '    if (!' + arrname + '.hasOwnProperty(__kk)) continue;';
            b += ' \n' + '    var ' + varname + ' = ' + arrname + '[__kk];';

            arr[i] = arr[i].replace(escapeForRegExp(f), n).replace('{', b);
        }

        return arr.join('for');
    };

    /*
     * unMetaDataify(src)
     *
     * replaces i.e
     *
     *   var code = <><![CDATA[
     *   if (this._name == null || refresh) {
     *     this._name = this.name();
     *   }
     *   ret = this._name;
     *   ]]></>.toString();
     *
     * by
     *
     *   var code = ("\n" +
     *   "    if (this._name == null || refresh) {\n" +
     *   "      this._name = this.name();\n" +
     *   "    }\n" +
     *   "    ret = this._name;\n" +
     *   "").toString();
     *   ...
     *
     */
    this.unMetaDataify = function(src) {
        var s = src;
        var t = src;
        var t1 = '<><![CDATA[';
        var t2 = ']]></>';
        var pos = s.search(escapeForRegExp(t1));
        while (pos != -1) {
            var p = s.substr(0, pos);
            var lc = p.lastIndexOf('\n');
            var cc = '';
            if (lc != -1) cc = p.substr(lc, p.length - lc);
            s = s.substr(pos, s.length-pos);

            // check if commented
            var c1 = cc.search("\\/\\*");
            var c2 = cc.search("\\/\\/");
            if (c1 == -1 &&
                c2 == -1) {
                var z = getStringBetweenTags(s,t1, t2);
                var x;
                x = z.replace(/\"/g, '\\"').replace(/\n/g, '\\n" + \n"');
                x = x.replace(/^\n/g, '').replace(/\n$/g, '');
                var g = t1+z+t2;
                t = t.replace(g, '(new CDATA("' + x + '"))');
            }
            s = s.substr(1, s.length-1);
            pos = s.search(escapeForRegExp(t1));
        }

        return t;
    };

    /*
     * unWrappedObjectify(src)
     *
     * replaces i.e
     *
     *   obj.wrappedJSObj.blubber()
     *
     * by
     *   obj.blubber();
     *
     */
    this.unWrappedObjectify = function(src) {
        var lines = src.split('\n');

        for (var k in lines) {
            var line = lines[k];
            var cpos = line.search('//');
            var spos = line.search('.wrappedJSObject');
            if (spos == -1 ||
                (cpos != -1 && cpos < spos)) {
                continue;
            }
            lines[k] = line.replace('.wrappedJSObject', '');
        }

        return lines.join('\n');
    };
};

/* ### Listener ### */
var loadListenerTimout = null;

var loadListener = function(tabID, changeInfo, tab) {
    var sere = function() {
        loadListenerTimout = null;
        chrome.tabs.sendRequest(tabID,
                                { method: "getSrc" },
                                function(response) {
                                    addNewUserScript(tab.id, tab.url, response.src);
                                });
    };
    if (tab.url.search(/\.tamper\.js$/) != -1) {
        if (changeInfo.status == 'complete') {
            if (loadListenerTimout != null) {
                window.clearTimeout(loadListenerTimout);
                loadListenerTimout = null;
            }
            sere();
        } else {
            loadListenerTimout = window.setTimeout(sere, 5000);
        }
    }
};

var updateListener = function(tabID, changeInfo, tab) {
    if (changeInfo.status == 'complete') {
        if (tab.title.search(tab.url + " is not available") != -1) {
            var reload = function() {
                console.log("trigger reload (tabID " + tabID + ") of " + tab.url);
                chrome.tabs.update(tabID, {url: tab.url});
            };
            window.setTimeout(reload, 20000);
        } else {
            var scripts = determineScriptsToRun(tab.url);

            for (var k in scripts) {
                var script = scripts[k];
                if (!script.enabled) continue;
                var rt = new runtimeInit();
                rt.contentLoad(tab, script);
            }
        }
    }
};

convertData();

var Poller = new unsafeWindowPollerInit();
// determine excludable items like chrome, dcoument, getElementById and so on afap
windowExcludes = Poller.getWindowExcludes();

var Runtime = new runtimeInit();
var Config = new configInit();
var compaMo = new compaMoInit();

chrome.extension.onRequest.addListener(requestHandler);
// the content script sends a request when it's loaded.. this happens just once ;)
chrome.tabs.onUpdated.addListener(loadListener);
