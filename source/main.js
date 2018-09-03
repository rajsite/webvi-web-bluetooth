(function () {
    'use strict';

    // zero is an invalid refnum
    var nextRefnum = 1;
    class RefnumManager {
        constructor () {
            this.refnums = new Map();
        }

        createRefnum (obj) {
            var refnum = nextRefnum;
            nextRefnum += 1;
            this.refnums.set(refnum, obj);
            return refnum;
        }

        getObject (refnum) {
            return this.refnums.get(refnum);
        }

        closeRefnum (refnum) {
            this.refnums.delete(refnum);
        }
    }

    var refnumManager = new RefnumManager();

    /**
     * Starting point for making a Web Bluetooth connection.
     * Web Bluetooth requires an interaction from a user
     *
     * @param requestDeviceOptionsJSON
     *  Provide the options property for the requestDevice function as JSON.
     *  This does currently prevent certain types of filters where you must pass values that can't be represented as JSON.
     *  Some known filter types that are unsupported are manufacturerData and serviceData which use Uint8Array as the representation
     *
     * @param selector
     *  The selector for the element in the page will be used for starting the user interaction.
     *
     * @param eventName
     *  Only events "triggered by user activation" can be used: https://html.spec.whatwg.org/multipage/interaction.html#activation.
     *  By default the click event will be used if an empty eventName is provided.
     *  The event will only fire once per call to setupSingleTriggerElement.
     *
     * @returns
     *  A refnum for the bluetooth device to use with the web bluetooth api
     */
    var requestDevice = function (requestDeviceOptionsJSON, selector, eventName, jsapi) {
        if (window.navigator.bluetooth === undefined) {
            throw new Error('Web Bluetooth is not supported by this browser');
        }

        var requestDeviceOptions;
        try {
            // TODO: Use a reviver or something for manufacturerData and serviceData https://github.com/WebBluetoothCG/web-bluetooth/issues/407
            requestDeviceOptions = JSON.parse(requestDeviceOptionsJSON);
        } catch (ex) {
            throw new Error(`Could not parse the provided requestDeviceOptionsJSON as JSON: ${requestDeviceOptionsJSON}. Parsing results in the following error:${ex}.`);
        }

        var elements = document.querySelectorAll(selector);
        if (elements.length !== 1) {
            throw new Error(`Exactly one element must match the provided selector: ${selector}. Instead found the following number: ${elements.length}.`);
        }
        var element = elements[0];

        var validEventName;
        if (typeof eventName !== 'string' || eventName.length === 0) {
            validEventName = 'click';
        } else {
            validEventName = eventName;
        }

        var completionCallback = jsapi.getCompletionCallback();
        var handler = function () {
            // Make sure the event is only triggered once
            element.removeEventListener(validEventName, handler);

            // Ask user for the bluetooth device
            window.navigator.bluetooth.requestDevice(requestDeviceOptions)
                .then(device => {
                    var refnum = refnumManager.createRefnum(device);
                    // TODO instead return JSON with
                    completionCallback(refnum);
                })
                .catch(ex => completionCallback(ex));
        };

        element.addEventListener(validEventName, handler);
    };

    window.webvi_web_bluetooth = {};
    window.webvi_web_bluetooth.requestDevice = requestDevice;
}());
