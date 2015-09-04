var setupStorage = function (storageKey, getDataCallback) {
    if (!storageKey) {
        return {};
    }

    if (typeof ($.storage) == "undefined") {
        $.storage = new $.store();
    }

    var eventSetup = false;
    var setupListener = function () {
        eventSetup = true;
        $(window).bind('beforeunload', function () {
            var data = (storageConfig.getDataCallback || getDataCallback)();

            if (data) {
                $.storage.set(storageKey, data);
            }
        });
    };

    var storageConfig = {
        get: function () {
            return $.storage.get(storageKey);
        },
        set: function (data) {
            if (!eventSetup && this.getDataCallback) {
                setupListener();
            }

            $.storage.set(storageKey, data);
        },
        update: function (propertyName, val) {
            var data = this.get() || {};
            data[propertyName] = val;
            this.set(data);
        },
        mergeData: function (data) {
            if (!eventSetup && this.getDataCallback) {
                setupListener();
            }
            var originalData = $.storage.get(storageKey) || {};

            $.storage.set(storageKey, $.extend(originalData, data));
        },
        initalData: $.storage.get(storageKey)
    };

    if (getDataCallback) {
        setupListener();
    }

    return storageConfig;
};

$(function () {
    $('.column').sortable({
        items: '.moveable',
        connectWith: 'column',
        handle: 'h2',
        cursor: 'move',
        placeholder: 'placeholder',
        forcePlaceholderSize: true,
        opacity: 0.4,
        revert: true,
        dropOnEmpty: false
    }).disableSelection();
});

$.widget("go.omniWidget", {
    //local storage for the widget
    _storageData: null,
    //used to track the collapsed state of the widget.
    _showContent: true,
    //based on the storage determine whether the content needs to be loaded
    _isContentLoaded: true,
    //stores the 'dragbox-content' <div>
    contentElement: null,

    options: {
        moveable: true,
        closable: true,
        collapsible: true,
        refreshable: true,
        hasHeader: true,
        contentCallback: null,
        storageKey: null,
        title: "",
        action: null,
        actionUrl: null
    },

    /*
    * Purpose: Sets the instance options object with the one passed.
    */
    _setOptions: function (options) {
        this._super(options);
    },

    /*
    * Purpose: This method is the init method.
    */
    _create: function () {
        if (!this.options.storageKey) {
            alert("storageKey: Please provide a storage key when creating a widget.");
            throw new Error("StorageKey not provided.");
        }

        if (!this.options.contentCallback) {
            alert("contentCallback: Please provide a contentCallback when creating a widget.");
            throw new Error("contentCallback not provided.");
        }
        this._storageData = setupStorage(this.options.storageKey || this._getRandomKey());
        //create the widget
        this.element.addClass("dragbox");
        //check to see if there is no id
        this._init_structure();
    },

    /*
    * Purpose: Initializes the widget properties and behavior.
    */
    _init_structure: function () {
        var me = this;
        var widgetData = this.fetchSettingsFromStorage();
        if (me.options.hasHeader) {
            var headerElement = ($("<h2>").html(me.options.title)).appendTo(me.element);
            if (me.options.moveable) {
                me.element.addClass("moveable");
            }

            if (me.options.closable) {
                headerElement.append($("<a href='#'>").addClass("delete")
                .click(function (e) {
                    if (confirm("Do you want to remove the widget?")) {
                        me.eventDom.trigger('widgetclosable', []);
                        me.element.animate({ opacity: 0 }, function () {
                            me.element.wrap('<div />').parent().slideUp(function () {
                                me.element.remove();
                            });
                        });
                    }
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                }).html('[x]'));
            }

            if (me.options.collapsible) {
                headerElement.append($("<a href='#'>").addClass("maxmin")
                    .click(function (e) {
                        $(this).parent().siblings('.dragbox-content').toggle(
                            function () {
                                if (me._showContent) {
                                    //happens when hide occurs
                                    me._showContent = false;
                                } else {
                                    //happens when show() event occurs
                                    if (!me._isContentLoaded) {
                                        $(this).html(me._getContent());
                                        me._isContentLoaded = true;
                                    }
                                    me._showContent = true;
                                }
                                me.updateStorageProperty('collapsible', !me._showContent);
                            }
                            );
                        e.stopPropagation();
                        e.preventDefault();
                    }).html('[v]'));
            }

            if (me.options.refreshable) {
                headerElement.append($("<a href='#'>").addClass("refresh")
				.click(function (e) {
				    $(this).parent().siblings('.dragbox-content').html(me._getContent());
				    e.stopPropagation();
				    e.preventDefault();
				}).html('[r]'));
            }

            if (me.options.action) {
                headerElement.append($("<span style='display: inline-block; width: 2px; height: 100%; position: relative; float: right; padding: 0 2px; border-right: 1px solid #FF0000;'>"))
                .append($("<a href='" + me.options.actionUrl + "' target = '_blank' >")
                .addClass("action")
                .html(me.options.action));
            }
        }

        me.contentElement = $('<div>').addClass("dragbox-content");
        if (widgetData && widgetData["collapsible"]) {
            me.element.append(me.contentElement.hide());
            me._isContentLoaded = false;
            me._showContent = false;
        } else {
            me.element.append(me.contentElement);
            me._getContent();
        }
    },

    /*
    * Purpose: This method facilitates to update a storage property of the widget.
    */
    updateStorageProperty: function (propertyName, value) {
        var data = this.fetchSettingsFromStorage() || {};
        data[propertyName] = value;
        this._storageData.set(data);
    },

    /*
    * Purpose: This method facilitates to update a storage of the widget.
    */
    updateStorage: function (data) {
        this._storageData.set(data);
    },

    /*
    * Purpose: Get a property value from the storage of the widget.
    */
    getPropertyFromStorage: function (propertyName) {
        var data = this.fetchSettingsFromStorage();
        return data[propertyName];
    },

    /*
    * Purpose: Get the entire widget data.
    */
    fetchSettingsFromStorage: function () {
        return this._storageData.get();
    },

    /*
    * Purpose: Used for populating random content
    */
    _getContent: function () {
        var me = this;
        if (me.options.contentCallback) {
            me.contentElement.html(me.options.contentCallback.call(me));
        } else {
            me.contentElement.html("Please set the contentCallback to populate the widget content.");
        }
    },

    /*
    * Purpose: When a storage key for the widget is not provided a random key is generated and used
    */
    _getRandomKey: function () {
        return Math.random().toString(36).slice(2);
    },

    /*
    * Purpose: Base destroy() method calls this method, any additional initializations on the element object
    * needs to be undone before removing from the DOM.
    */
    _destroy: function () {
        //destroy the object
        this.element.removeClass("dragbox").text("");
    }
});