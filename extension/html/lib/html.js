﻿/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var Q = require("q");

module.exports = Html = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "html",
        execute: function(request, response) {
            response.headers["Content-Type"] = "text/html";
            response.headers["File-Extension"] = "html";

            return reporter.renderContent(request, response);
        }
    });
};