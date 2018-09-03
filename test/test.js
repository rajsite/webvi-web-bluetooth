(function () {
    'use strict';

    // General helper functions
    var domReady = function (readyCallback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', readyCallback);
        } else {
            readyCallback();
        }
    };

    // Aliases
    var invokeAsWebVI = window.webvisimulator.invokeAsWebVI;

    // Test code
    var main = async function () {
        // Based on https://googlechrome.github.io/samples/web-bluetooth/notifications.html?service=battery_service&characteristic=battery_level
        var requestDataOptionsJSON = JSON.stringify({
            filters: [{
                services: ['battery_service']
            }]
        });

        var device = await invokeAsWebVI('webvi_web_bluetooth.requestDevice', [
            requestDataOptionsJSON,
            '#start_button',
            'click'
        ]);

        console.log(device);
    };

    // Run test
    domReady(main);
}());
