"use strict";

var angularDpdSockets = [];

angular.module('dpd', []).value('dpdConfig', [])
    .factory('dpdSocket', ['$rootScope', 'dpdConfig', function($rootScope, dpdConfig) {
        if (!dpdConfig.useSocketIo) {
            return {};
        }
        if (!io.connect) {
            throw ('angular-dpd: socket.io library not available, includ the client library or set dpdConfig.useSocketIo = false');
        }
        var serverRoot = dpdConfig.serverRoot || '';
        var socket = angularDpdSockets[serverRoot] = angularDpdSockets[serverRoot] || io.connect(serverRoot, dpdConfig.socketOpts);
        var listeners = {};
        return {
            on: function(eventName, callback) {
                listeners[callback] = function() {
                    var args = arguments;
                    $rootScope.$apply(function() {
                        callback.apply(socket, args);
                    });
                };
                socket.on(eventName, listeners[callback]);
            },
            emit: function(eventName, data, callback) {
                socket.emit(eventName, data, function() {
                    var args = arguments;
                    $rootScope.$apply(function() {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                });
            }, 
            removeListener: function(eventName, f){
                socket.removeListener(eventName, listeners[f]);
                delete listeners[f]
            },
            rawSocket: socket
        };
    }])
    .factory('dpd', ['$http', '$rootScope', 'dpdConfig', 'dpdSocket', function($http, $rootScope, dpdConfig, dpdSocket) {
        var dpd = {};
        dpd.errors = [];
        dpd.socket = dpdSocket;
        if (angular.isArray(dpdConfig)) {
            dpdConfig = {
                collections: dpdConfig
            };
        }

        var serverRoot = (dpdConfig.serverRoot) ? dpdConfig.serverRoot.replace(/\/$/, "") : "";

        if (!Array.prototype.forEach) {
            Array.prototype.forEach = function(fn, scope) {
                for (var i = 0, len = this.length; i < len; ++i) {
                    fn.call(scope, this[i], i, this);
                }
            }
        }

        var ef = function(data, status, headers, config) {
            dpd.errors.push(data);
        }

        var checkUndefinedFunc = function(f) {
            if (typeof f == 'undefined')
                f = function() {};

            return f;
        }

        var isComplexQuery = function(obj) {
            if (obj) {
                for (var k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        if (typeof obj[k] === 'object') {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        dpdConfig.collections.forEach(function(d) {
            dpd[d] = {};
            if (!dpdConfig.noCache) {
                dpd[d].cache = {
                    all: [],
                    get: function(id) {
                        for (var i in dpd[d].cache.all) {
                            if (dpd[d].cache.all[i].id == id)
                                return dpd[d].cache.all[i];
                        }
                    }
                };
            }
            dpd[d].get = function(o, s, e) {
                if (typeof o == "string") {
                    return $http.get(serverRoot + '/' + d + '/' + o, { withCredentials: true }).success(function(data, status, headers, config) {
                        if (!dpd[d].cache) return;
                        var add = true;
                        for (var i in dpd[d].cache.all) {
                            if (dpd[d].cache.all[i].id == o) {
                                add = false;
                                dpd[d].cache.all[i] = data;
                            }
                        }
                        if (add)
                            dpd[d].cache.all.push(data);
                    }).success(checkUndefinedFunc(s)).error(ef).error(checkUndefinedFunc(e));
                } else {
                    if (typeof o == "function") {
                        e = s;
                        s = o;
                        return $http.get(serverRoot + '/' + d, { withCredentials: true }).success(function(data, status, headers, config) {
                            if (!dpd[d].cache) return;
                            dpd[d].cache.all = data;
                        }).success(checkUndefinedFunc(s)).error(ef).error(checkUndefinedFunc(e));
                    } else {
                        if (isComplexQuery(o)) {
                            var query = encodeURI(JSON.stringify(o));
                            return $http.get(serverRoot + '/' + d + '?' + query, { withCredentials: true }).success(function(data, status, headers, config) {
                                if (!dpd[d].cache) return;
                                dpd[d].cache.all = data;
                            }).success(checkUndefinedFunc(s)).error(ef).error(checkUndefinedFunc(e));
                        } else {
                            return $http.get(serverRoot + '/' + d, {
                                params: o,
                                withCredentials: true
                            }).success(function(data, status, headers, config) {
                                if (!dpd[d].cache) return;
                                dpd[d].cache.all = data;
                            }).success(checkUndefinedFunc(s)).error(ef).error(checkUndefinedFunc(e));
                        }
                    }
                }
            };

            dpd[d].put = function(id, o, s, e) {
                return $http.put(serverRoot + '/' + d + '/' + id, o, { withCredentials: true }).success(function(data, status, headers, config) {
                    if (!dpd[d].cache) return;
                    var add = true;
                    for (var i in dpd[d].cache.all) {
                        if (dpd[d].cache.all[i].id == id) {
                            add = false;
                            dpd[d].cache.all[i] = data;
                        }
                    }
                    if (add)
                        dpd[d].cache.all.push(data);
                }).success(checkUndefinedFunc(s)).error(ef).error(checkUndefinedFunc(e));
            };

            dpd[d].post = function(o, s, e) {
                return $http.post(serverRoot + '/' + d + '/', o, { withCredentials: true }).success(function(data, status, headers, config) {
                    if (!dpd[d].cache) return;
                    dpd[d].cache.all.push(data);
                }).success(checkUndefinedFunc(s)).error(ef).error(checkUndefinedFunc(e));
            };

            dpd[d].del = function(id, s, e) {
                return $http.delete(serverRoot + '/' + d + '/' + id, { withCredentials: true }).success(function(data, status, headers, config) {
                    if (!dpd[d].cache) return;
                    for (var i in dpd[d].cache.all) {
                        if (dpd[d].cache.all[i].id == id) {
                            dpd[d].cache.all.splice(i, 1);
                        }
                    }
                }).success(checkUndefinedFunc(s)).error(ef).error(checkUndefinedFunc(e));
            };

            dpd[d].save = function(obj, s, e) {
                if (typeof obj.id == 'string') {
                    dpd[d].put(obj.id, obj, s, e);
                } else {
                    dpd[d].post(obj, s, e);
                }
            };
            
            dpd[d].exec = function (func, o, s, e) {
                return $http.post(serverRoot + '/' + d + '/' + func, o, { withCredentials: true }).success(checkUndefinedFunc(s)).error(ef).error(checkUndefinedFunc(e));                
            }

            dpd[d].on = function(scope, event, f) {
                if (!dpdSocket) return;
                dpdSocket.on(d + ':' + event, f);
                scope.$on("$destroy", function(){
                    dpdSocket.removeListener(d + ':' + event, f);
                })
            };
        });

        dpd.on = function(scope, event, f) {
            if (!dpdSocket) return;
            dpdSocket.on(event, f);
            scope.$on("$destroy", function(){
                dpdSocket.removeListener(event, f);
            })
        };
        
        $rootScope.dpd = dpd;
        return dpd;
    }]);
