(function () {
    'use strict';

    var validateReturnType = function (val) {
        var validPrimitives = ['boolean', 'string', 'number'];
        var validInstances = [Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array];
        var isValid = validPrimitives.find(name => typeof val === name) !== undefined || validInstances.find(klass => val instanceof klass) !== undefined;
        if (isValid === false) {
            throw new Error(`Return value is not a type supported by the JSLI. Returned value: ${val}`);
        }
        return val;
    };

    // A simulator for invoking a JS function in a manner similar to WebVIs
    // Error handling is not as comprehensive as for WebVIs so behaviors will differ
    var invokeAsWebVI = function (functionName, args) {
        // Lookup function and context in global scope
        var fn = functionName.split('.').reduce((obj, ns) => obj[ns], window);
        var context = functionName.split('.').slice(0, -1).reduce((obj, ns) => obj[ns], window);

        if (fn === undefined || context === undefined) {
            throw new Error(`Could not find function and context for function named: ${functionName}`);
        }

        // Used to flag that the user will complete the function asynchronously
        var completePromise;
        var createCallbackAndSetAsyncFlag = function () {
            if (completePromise !== undefined) {
                throw new Error('Completion callback already retrieved for this JSLI instance');
            }

            var callback;
            // Set flag that user wants to complete asynchronously
            completePromise = new Promise(function (resolve, reject) {
                callback = function (result) {
                    if (result instanceof Error) {
                        reject(result);
                    }

                    resolve(validateReturnType(result));
                };
            });
            return callback;
        };

        var createJSAPI = function () {
            var getCompletionCallback = function () {
                return createCallbackAndSetAsyncFlag();
            };

            return {
                getCompletionCallback
            };
        };

        // User signals wanting access to the jsapi
        var result;
        if (fn.length === args.length + 1) {
            result = fn.apply(context, [...args, createJSAPI()]);

            // Asynchronous completion, so user synchronous result ignored
            if (completePromise !== undefined) {
                return completePromise;
            }
        }

        // Users wants simple synchronous function execution
        result = fn.apply(context, args);
        return validateReturnType(result);
    };

    window.webvisimulator = {};
    window.webvisimulator.invokeAsWebVI = invokeAsWebVI;
}());
