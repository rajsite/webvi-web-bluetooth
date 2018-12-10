(function () {
    'use strict';

    const makeAsync = function (completionCallback, asyncFn) {
        asyncFn().then(completionCallback).catch(completionCallback);
    };

    const eventOccurence = function (element, eventName) {
        return new Promise(function (resolve) {
            const handler = element.addEventListener(eventName, () => {
                element.removeEventListener(eventName, handler);
                resolve();
            });
        });
    };

    // zero is an invalid refnum
    let nextRefnum = 1;
    class RefnumManager {
        constructor () {
            this.refnums = new Map();
        }

        createRefnum (obj) {
            let refnum = nextRefnum;
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

    let refnumManager = new RefnumManager();

    // Used to convert from 16-bit or 32-bit UUID numbers to 128-bit UUID strings
    let canonicalUUID = function (alias) {
        if (window.navigator.bluetooth === undefined) {
            throw new Error('Web Bluetooth is not supported by this browser');
        }

        return window.BluetoothUUID.canonicalUUID(alias);
    };

    let parseRequestDeviceOptions = function (requestDeviceOptionsJSON) {
        try {
            // TODO: Use a reviver or something for manufacturerData and serviceData https://github.com/WebBluetoothCG/web-bluetooth/issues/407
            return JSON.parse(requestDeviceOptionsJSON);
        } catch (ex) {
            throw new Error(`Could not parse the provided requestDeviceOptionsJSON as JSON: ${requestDeviceOptionsJSON}. Parsing results in the following error:${ex}.`);
        }
    };

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
     *  The selector string for an element can be found in the right-rail of LabVIEW NXG when a control is selected.
     *
     * @param eventName
     *  Only events "triggered by user activation" can be used: https://html.spec.whatwg.org/multipage/interaction.html#activation.
     *  By default the "click" event will be used if an empty eventName is provided.
     *  The event will only fire once per call to setupSingleTriggerElement.
     *
     * @returns
     *  A refnum for the bluetooth device to use with the web bluetooth api
     */
    let requestDevice = function (requestDeviceOptionsJSON, selector, eventName, jsapi) {
        makeAsync(jsapi.getCompletionCallback(), async function () {
            if (window.navigator.bluetooth === undefined) {
                throw new Error('Web Bluetooth is not supported by this browser');
            }

            let requestDeviceOptions = parseRequestDeviceOptions(requestDeviceOptionsJSON);

            let elements = document.querySelectorAll(selector);
            if (elements.length !== 1) {
                throw new Error(`Exactly one element must match the provided selector: ${selector}. Instead found the following number: ${elements.length}.`);
            }
            let element = elements[0];

            let validEventName;
            if (typeof eventName !== 'string' || eventName.length === 0) {
                validEventName = 'click';
            } else {
                validEventName = eventName;
            }

            await eventOccurence(element, validEventName);

            let device = await window.navigator.bluetooth.requestDevice(requestDeviceOptions);
            let deviceRefnum = refnumManager.createRefnum(device);
            // TODO instead return JSON with device refnum, device name, and device id: https://webbluetoothcg.github.io/web-bluetooth/#bluetoothdevice
            return deviceRefnum;
        });
    };

    // TODO maybe should have gattServer and gattServerConnect / gattServerDisconnect? Seems strange to ask device to disconnect gatt server instead of server itself
    let gattServerConnect = function (deviceRefnum, jsapi) {
        makeAsync(jsapi.getCompletionCallback(), async function () {
            let device = refnumManager.getObject(deviceRefnum);
            if (device instanceof window.BluetoothDevice === false) {
                throw new Error(`Expected gattServerConnect to be invoked with a deviceRefnum, instead got: ${device}`);
            }
            let gattServer = await device.gatt.connect();
            let gattServerRefnum = refnumManager.createRefnum(gattServer);
            return gattServerRefnum;
        });
    };

    let gattServerDisconnect = function (deviceRefnum) {
        let device = refnumManager.getObject(deviceRefnum);
        if (device instanceof window.BluetoothDevice === false) {
            throw new Error(`Expected gattServerDisconnect to be invoked with a deviceRefnum, instead got: ${device}`);
        }

        // TODO services, characteristics, and descriptors become invalid on disconnect: https://webbluetoothcg.github.io/web-bluetooth/#persistence
        // Maybe we should track and auto clean-up those references?
        device.gatt.disconnect();
    };

    // For information about primary vs included services: https://webbluetoothcg.github.io/web-bluetooth/#information-model
    let getPrimaryService = function (gattServerRefnum, serviceName, jsapi) {
        makeAsync(jsapi.getCompletionCallback(), async function () {
            let gattServer = refnumManager.getObject(gattServerRefnum);
            if (gattServer instanceof window.BluetoothRemoteGATTServer === false) {
                throw new Error(`Expected getPrimaryService to be invoked with a gattServerRefnum, instead got: ${gattServer}`);
            }

            let service = await gattServer.getPrimaryService(serviceName);
            let serviceRefnum = refnumManager.createRefnum(service);
            return serviceRefnum;
        });
    };

    let getCharacteristic = function (serviceRefnum, characteristicName, jsapi) {
        makeAsync(jsapi.getCompletionCallback(), async function () {
            let service = refnumManager.getObject(serviceRefnum);
            if (service instanceof window.BluetoothRemoteGATTService === false) {
                throw new Error(`Expected getCharacteristic to be invoked with a serviceRefnum, instead got: ${service}`);
            }

            let characteristic = await service.getCharacteristic(characteristicName);
            let characteristicRefnum = refnumManager.createRefnum(characteristic);
            return characteristicRefnum;
        });
    };

    let readValue = function (characteristicRefnum, jsapi) {
        makeAsync(jsapi.getCompletionCallback(), async function () {
            let characteristic = refnumManager.getObject(characteristicRefnum);
            if (characteristic instanceof window.BluetoothRemoteGATTCharacteristic === false) {
                throw new Error(`Expected readValue to be invoked with a characteristicRefnum, instead got: ${characteristic}`);
            }

            let valueDataView = await characteristic.readValue();
            // DataView documentation https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
            return new Uint8Array(valueDataView.buffer);
        });
    };

    let writeValue = function (characteristicRefnum, value, jsapi) {
        makeAsync(jsapi.getCompletionCallback(), async function () {
            let characteristic = refnumManager.getObject(characteristicRefnum);
            if (characteristic instanceof window.BluetoothRemoteGATTCharacteristic === false) {
                throw new Error(`Expected readValue to be invoked with a characteristicRefnum, instead got: ${characteristic}`);
            }

            await characteristic.writeValue(value);
        });
    };

    class NotificationBuffer {
        constructor (characteristic) {
            this.buffer = [];
            this.characteristic = characteristic;
            this.pendingReadCompletionCallback = undefined;

            this.handler = (evt) => {
                this.buffer.push(new Uint8Array(evt.target.value.buffer));

                if (this.pendingReadCompletionCallback !== undefined) {
                    this.pendingReadCompletionCallback(this.buffer.shift());
                    this.pendingReadCompletionCallback = undefined;
                }
            };

            this.characteristic.addEventListener('characteristicvaluechanged', this.handler);
        }

        read (completionCallback) {
            if (this.pendingReadCompletionCallback !== undefined) {
                completionCallback(new Error('An active characteristic notification read is already being perfomed for this characteristic.'));
                return;
            }

            if (this.buffer.length === 0) {
                this.pendingReadCompletionCallback = completionCallback;
                return;
            }

            completionCallback(this.buffer.shift());
        }

        stop () {
            this.characteristic.removeEventListener('characteristicvaluechanged', this.handler);
            this.characteristic.stopNotifications();
            this.characteristic = undefined;
            this.handler = undefined;
            if (this.pendingReadCompletionCallback !== undefined) {
                this.pendingReadCompletionCallback(new Error('Characteristic notifications stopped'));
            }
            this.pendingReadCompletionCallback = undefined;
            // TODO mraj should we do anything with buffer data if there are leftovers when stopping?
            this.buffer = undefined;
        }
    }

    let startCharacteristicNotification = function (characteristicRefnum, jsapi) {
        makeAsync(jsapi.getCompletionCallback(), async function () {
            let characteristic = refnumManager.getObject(characteristicRefnum);
            if (characteristic instanceof window.BluetoothRemoteGATTCharacteristic === false) {
                throw new Error(`Expected readValue to be invoked with a characteristicRefnum, instead got: ${characteristic}`);
            }

            // According to spec:
            // After notifications are enabled, the resulting value-change events won’t be delivered until after the current microtask checkpoint.
            // This allows a developer to set up handlers in the .then handler of the result promise.
            await characteristic.startNotifications();
            let notificationBuffer = new NotificationBuffer(characteristic);
            let notificationBufferRefnum = refnumManager.createRefnum(notificationBuffer);
            return notificationBufferRefnum;
        });
    };

    let readCharacteristicNotification = function (notificationBufferRefnum, jsapi) {
        let notificationBuffer = refnumManager.getObject(notificationBufferRefnum);
        if (notificationBuffer instanceof NotificationBuffer === false) {
            throw new Error(`Expected readCharacteristicNotification to be invoked with a notificationBufferRefnum, instead got: ${notificationBuffer}`);
        }

        let completionCallback = jsapi.getCompletionCallback();
        notificationBuffer.read(completionCallback);
    };

    let stopCharacteristicNotification = function (notificationBufferRefnum, jsapi) {
        makeAsync(jsapi.getCompletionCallback(), async function () {
            let notificationBuffer = refnumManager.getObject(notificationBufferRefnum);
            if (notificationBuffer instanceof NotificationBuffer === false) {
                throw new Error(`Expected readCharacteristicNotification to be invoked with a notificationBufferRefnum, instead got: ${notificationBuffer}`);
            }
            await notificationBuffer.characteristic.stopNotifications();
        });
    };

    window.webvi_web_bluetooth = {
        canonicalUUID,
        requestDevice,
        gattServerConnect,
        gattServerDisconnect,
        getPrimaryService,
        getCharacteristic,
        readValue,
        writeValue,
        startCharacteristicNotification,
        readCharacteristicNotification,
        stopCharacteristicNotification
    };
}());
