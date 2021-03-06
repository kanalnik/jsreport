﻿/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Core extension responsible for storing and using report templates.
 */ 

var Readable = require("stream").Readable,
    shortid = require("shortid"),
    winston = require("winston"),
    events = require("events"),
    util = require("util"),
    sformat = require("stringformat"),
    _ = require("underscore"),
    Q = require("q"),
    extend = require("node.extend");


var logger = winston.loggers.get('jsreport');

module.exports = function(reporter, definition) {
    reporter[definition.name] = new Templating(reporter, definition);
};

Templating = function(reporter, definition) {
    var self = this;
    this.name = "templates";
    this.reporter = reporter;
    this.definition = definition;
    this._versionCache = [];
    this.updateEnabled = false;

    this._defineEntities();

    this.TemplateType.addEventListener("beforeCreate", Templating.prototype._beforeCreateHandler.bind(this));
    this.TemplateType.addEventListener("beforeUpdate", Templating.prototype._beforeUpdateHandler.bind(this));
    this.TemplateType.addEventListener("beforeDelete", Templating.prototype._beforeDeleteHandler.bind(this));

    this.reporter.beforeRenderListeners.add(definition.name, Templating.prototype.handleBeforeRender.bind(this));
    this.reporter.entitySetRegistrationListners.add(definition.name, Templating.prototype._createEntitySetDefinitions.bind(this));

    if (this.reporter.playgroundMode) {
        this.reporter.initializeListener.add(definition.name, this, function() {
            return self.reporter.context.templateVersions.toArray().then(function(res) {
                res.forEach(function(r) {
                    self._versionCache[r.shortid] = r;
                });
            });
        });
    }
};

util.inherits(Templating, events.EventEmitter);

Templating.prototype.handleBeforeRender = function(request, response) {
    if (request.template._id == null && request.template.shortid == null) {
        request.template.content = request.template.content == null || request.template.content == "" ? " " : request.template.content;
        return;
    }

    var self = this;
    var findPromise = (request.template._id != null) ? request.context.templates.find(request.template._id) :
        (self.reporter.playgroundMode ?
            request.context.templates.single(function(t) { return t.shortid == this.shortid && t.version == this.version; }, { shortid: request.template.shortid, version: request.template.version }) :
            request.context.templates.single(function(t) { return t.shortid == this.shortid }, { shortid: request.template.shortid }));

    return findPromise.then(function(template) {
        extend(true, template, request.template);
        request.template = template;
    }, function() {
        throw new Error("Unable to find specified template: " + (request.template._id != null ? request.template._id : request.template.shortid));
    });
};

Templating.prototype.create = function(context, tmpl) {
    if (tmpl == null) {
        tmpl = context;
        context = this.reporter.context;
    }
        

    logger.info(sformat("Creating template {0}.", tmpl.name));
    var template = new this.TemplateType(tmpl);
    template.isLatest = true;
    context.templates.add(template);

    return context.templates.saveChanges().then(function() {
        return Q(template);
    });
};

Templating.prototype.find = function(preficate, params) {
    return this.reporter.context.templates.filter(preficate, params).toArray();
};

Templating.prototype._beforeUpdateHandler = function(args, entity) {
    var validationContext = { template: entity };
    this.emit("validate-update", validationContext);

    if (!validationContext.result && !this.reporter.context.templates.updateEnabled && this.reporter.playgroundMode)
        return false;

    entity.modificationDate = new Date();
};

Templating.prototype._beforeCreateHandler = function(args, entity) {
    if (entity.shortid == null)
        entity.shortid = shortid.generate();

    if (this.reporter.playgroundMode) {
        this._increaseVersion(entity);
    }
    entity.modificationDate = new Date();
};

Templating.prototype._beforeDeleteHandler = function(args, entity) {
    return !this.reporter.playgroundMode || (this.reporter.context.templates.deleteEnabled == true);
};

Templating.prototype._defineEntities = function() {
    var self = this;

    Object.defineProperty(this, "entitySet", {
        get: function() {
            return self.reporter.context.templates;
        }
    });


    var templateAttributes = {
        _id: { type: "id", key: true, computed: true, nullable: false },
        shortid: { type: "string" },
        name: { type: "string" },
        content: { type: "string" },
        recipe: { type: "string" },
        helpers: { type: "string" },
        engine: { type: "string" },
        modificationDate: { type: "date" },
    };

    if (this.reporter.playgroundMode) {
        templateAttributes.version = { type: "string" };

        self.TemplateVersionType = $data.Class.define(self.reporter.extendGlobalTypeName("$entity.TemplateVersion"), $data.Entity, null, {
            _id: { type: "id", key: true, computed: true, nullable: false },
            shortid: { type: "string" },
            lastVersion: { type: "int" }
        }, null);
    } else {
        self.TemplateHistoryType = $data.Class.define(self.reporter.extendGlobalTypeName("$entity.TemplateHistory"), $data.Entity, null, templateAttributes, null);
    }

    self.TemplateType = $data.Class.define(self.reporter.extendGlobalTypeName("$entity.Template"), $data.Entity, null, templateAttributes, null);
};

Templating.prototype._increaseVersion = function(entity) {
    var templateVersion = this._versionCache[entity.shortid];

    if (templateVersion != null) {
        entity.context.templateVersions.attach(templateVersion);
    } else {
        templateVersion = new this.TemplateVersionType({ shortid: entity.shortid, lastVersion: 0 });
        entity.context.templateVersions.add(templateVersion);
        this._versionCache[entity.shortid] = templateVersion;
    }

    entity.version = ++this._versionCache[entity.shortid].lastVersion;
};

Templating.prototype._copyHistory = function(entity) {
    var self = this;

    var context = this.reporter.startContext();
    return context.templates.find(entity._id).then(function(originalEntity) {
        var copy = _.extend({}, originalEntity.initData);
        delete copy._id;
        var history = new self.TemplateHistoryType(copy);
        context.templatesHistory.add(history);
        return context.templatesHistory.saveChanges();
    });
};


Templating.prototype._createEntitySetDefinitions = function(entitySets) {
    var self = this;
    entitySets["templates"] = { type: $data.EntitySet, elementType: self.TemplateType, tableOptions: { humanReadableKeys: [ "shortid"] } };

    if (this.reporter.playgroundMode) {
        entitySets["templateVersions"] = { type: $data.EntitySet, elementType: self.TemplateVersionType };
    } else {
        entitySets["templatesHistory"] = { type: $data.EntitySet, elementType: self.TemplateHistoryType };

        entitySets["templates"].beforeUpdate = function(i) {
            return function(callback, items) {
                if (items[0]._id == null)
                    return callback(false);

                var shouldBeHistorized = false;

                for (var i = 0; i < items[0].changedProperties.length; i++) {
                    var propName = items[0].changedProperties[i].name;
                    if (propName != "ValidationErrors" && propName != "modificationDate")
                        shouldBeHistorized = true;
                }


                if (!shouldBeHistorized)
                    return callback(true);

                self._copyHistory(items[0]).then(function() { callback(true); }, function(err) { callback(false); });
            };
        };
    }
};