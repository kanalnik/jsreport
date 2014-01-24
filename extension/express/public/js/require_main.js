﻿requirejs.config({
    baseUrl: "/js",
    waitSeconds: 60,
    paths: {
        underscore: "../lib/underscore",
        backbone: "../lib/backbone",
        originalmarionette: "../lib/backbone.marionette",
        marionette: "core/marionette.bootstrap",
        modelBinder: "../lib/backbone.modelBinder",
        
        originaljquery: "../lib/jquery",
        jquery: "core/jquery.bootstrap",
        jsrender: "../lib/jsrender",
        bootstrap: "../lib/bootstrap",
        "jquery.flot": "../lib/jquery.flot",
        "jquery.flot.time": "../lib/jquery.flot.time",
        dialog: "core/dialog",
        errorAlert: "core/errorAlert",
        "jsrender.bootstrap": "core/jsrender.bootstrap",
        
        toastr: "../lib/toastr",
        "jquery.ui.core": "../lib/jquery.ui.core",
        "jquery.ui.widget": "../lib/jquery.ui.widget",
        "jquery.ui.mouse": "../lib/jquery.ui.mouse",
        "jquery.ui.selectable": "../lib/jquery.ui.selectable",
        "jquery.fineuploader": "../lib/jquery.fineuploader-3.0",
        "split-pane": "../lib/split-pane",
        
        json2: "../lib/json2",
        async: "../lib/async",
        deferred: "../lib/deferred",
        text: "../lib/text",
        
        codemirror: "../lib/codemirror/xml",
        codemirrorJavascript: "../lib/codemirror/javascript",
        originalcodemirror: "../lib/codemirror/codemirror",
    },

    shim: {
        underscore: {
            exports: "_"
        },
        backbone: {
            deps: ["originaljquery", "underscore", "json2"],
            exports: "Backbone"
        },
        modelBinder: {
            deps: ["originaljquery", "underscore", "json2"],
            exports: "Backbone.ModelBinder"
        },
        originalmarionette: {
            deps: ["backbone"],
            exports: "Marionette"
        },
        marionette: {
            deps: ["originalmarionette", "modelBinder"],
            exports: "Marionette"
        },
        jsrender: {
            deps: ["originaljquery"],
            exports: "$"
        },
        
        "jsrender.bootstrap": {
            deps: ["originaljquery", "jsrender"],
            exports: "$"
        },
        
        bootstrap: {
            deps: ["originaljquery"],
            exports: "$"
        },
        "jquery.flot": ["originaljquery"],
        "jquery.flot.time": ["originaljquery", "jquery.flot"],
        dialog: ["originaljquery", "bootstrap"],
        errorAlert: ["originaljquery", "jsrender", "bootstrap"],
        "jquery.ui.core": ["originaljquery"],
        "jquery.ui.widget": ["jquery.ui.core"],
        "jquery.ui.mouse": ["jquery.ui.widget"],
        "jquery.ui.selectable": ["jquery.ui.mouse"],
        "jquery.ui.resizable": ["jquery.ui.mouse"],
        "jquery.fineuploader": ["originaljquery"],
        "split-pane": ["originaljquery"],

        "jquery": {
            deps: ["originaljquery", "jsrender.bootstrap", "bootstrap", "jquery.flot",
                "jquery.flot.time", "dialog", "jquery.ui.selectable", 
                "errorAlert", "toastr", "split-pane", "jquery.fineuploader"],
            exports: "$"
        },
        
        originalcodemirror: {
            deps: [],
            exports: "CodeMirror"
        },
        codemirrorJavascript: { deps: ["originalcodemirror"], exports: "CodeMirror" },
        codemirror: { deps: ["originalcodemirror", "codemirrorJavascript"], exports: "CodeMirror" },
    }
});

require(["app"], function (app) {
    app.start();
});