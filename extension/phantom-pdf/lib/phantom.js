﻿/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Recipe rendering pdf files using phantomjs.  
 */ 

var childProcess = require('child_process'),
    fork = require('child_process').fork,
    shortid = require("shortid"),
    phantomjs = require('phantomjs'),
    binPath = phantomjs.path,
    path = require("path"),
    join = path.join,
    winston = require("winston"),
    fs = require("fs"),
    _ = require("underscore"),
    Q = require("q"),
    FS = require("q-io/fs"),
    extend = require("node.extend");

var logger = winston.loggers.get('jsreport');

module.exports = Phantom = function(reporter, definition) {
    reporter[definition.name] = new Phantom(reporter, definition);

    if (!fs.existsSync("reports-tmpl")) {
        fs.mkdir("reports-tmpl");
    }
};

Phantom = function(reporter, definition) {
    this.reporter = reporter;

    reporter.extensionsManager.recipes.push({
        name: "phantom-pdf",
        execute: Phantom.prototype.execute.bind(this)
    });

    this.PhantomType = $data.Class.define(reporter.extendGlobalTypeName("$entity.Phantom"), $data.Entity, null, {
        margin: { type: "string" },
        header: { type: "string" },
        headerHeight: { type: "string" },
        footer: { type: "string" },
        footerHeight: { type: "string" },
        orientation: { type: "string" },
        format: { type: "string" },
        width: { type: "string" },
        height: { type: "string" },
    }, null);

    reporter.templates.TemplateType.addMember("phantom", { type: this.PhantomType });

    var self = this;
    reporter.templates.TemplateType.addEventListener("beforeCreate", function(args, template) {
        template.phantom = template.phantom || new (self.PhantomType)();
    });
};

Phantom.prototype.execute = function(request, response) {
    var self = this;
    logger.info("Pdf recipe start.");

    request.template.phantom = request.template.phantom || new self.PhantomType();
    
    var generationId = shortid.generate();
    var htmlFile = join("reports-tmpl", generationId + ".html");

    request.template.recipe = "html";
    return this.reporter.executeRecipe(request, response)
        .then(function() { return FS.write(htmlFile, response.result); })
        .then(function() { return self._processHeaderFooter(request, generationId, "header"); })
        .then(function() { return self._processHeaderFooter(request, generationId, "footer"); })
        .then(function() {
            
            return Q.nfcall(function(cb) {
                var childArgs = [	
		    '--ignore-ssl-errors=yes',	    
                    '--web-security=false',
                    join(__dirname, 'convertToPdf.js'),
                    request.template.phantom.url || ("file:///" + path.resolve(htmlFile)),
                    join("reports-tmpl", generationId + ".pdf"),		   
                    request.template.phantom.margin || "null",
                    request.template.phantom.headerFile || "null",
                    request.template.phantom.footerFile || "null",
                    request.template.phantom.headerHeight || "null",
                    request.template.phantom.footerHeight || "null",
                    request.template.phantom.orientation || "portrait",
                    request.template.phantom.width || "null",
                    request.template.phantom.height || "null",
                    request.template.phantom.format || "null"
                ];

                //var phantomPath = join(__dirname, "../../../", "node_modules", ".bin", "phantomjs.CMD");
                childProcess.execFile(binPath, childArgs, function(error, stdout, stderr) {
                    logger.info("Rastering pdf child process end.");

                    if (error !== null) {
                        logger.error('exec error: ' + error);
                        return cb(error);
                    }

                    response.result = fs.createReadStream(childArgs[4]);
                    response.headers["Content-Type"] = "application/pdf";
                    response.headers["File-Extension"] = "pdf";
                    response.isStream = true;

                    logger.info("Rendering pdf end.");
                    return cb();
                });
            });
        });
};

Phantom.prototype._processHeaderFooter = function(request, generationId, type) {
    if (request.template.phantom[type] == null)
        return Q(null);

    var req = extend(true, {}, request);
    req.template = { content: request.template.phantom[type], recipe: "html" };
    req.data = extend(true, {}, request.data);

    return this.reporter.render(req).then(function(resp) {
        var filePath = join("reports-tmpl", generationId + "-" + type + ".html");
        return FS.write(filePath, resp.result).then(function() {
            request.template.phantom[type + "File"] = filePath;
        });
    });
};