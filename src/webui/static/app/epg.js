insertContentGroupClearOption = function( scope, records, options ){
    var placeholder = Ext.data.Record.create(['val', 'key']);
    scope.insert(0,new placeholder({val: '(Clear filter)', key: '-1'}));
};

tvheadend.ContentGroupStore = tvheadend.idnode_get_enum({
    url: 'api/epg/content_type/list',
    listeners: {
        load: insertContentGroupClearOption
    }
});

tvheadend.contentGroupLookupName = function(code) {
    ret = "";
    if (!code)
        code = 0;
    code &= 0xf0;
    tvheadend.ContentGroupStore.each(function(r) {
        if (r.data.key === code)
            ret = r.data.val;
    });
    return ret;
};

tvheadend.ContentGroupFullStore = tvheadend.idnode_get_enum({
    url: 'api/epg/content_type/list',
    params: { full: 1 }
});

tvheadend.contentGroupFullLookupName = function(code) {
    ret = "";
    tvheadend.ContentGroupFullStore.each(function(r) {
        if (r.data.key === code)
            ret = r.data.val;
    });
    return ret;
};

tvheadend.channelLookupName = function(key) {
    channelString = "";

    var index = tvheadend.channels.find('key', key);

    if (index !== -1)
        var channelString = tvheadend.channels.getAt(index).get('val');

    return channelString;
};

tvheadend.channelTagLookupName = function(key) {
    tagString = "";

    var index = tvheadend.channelTags.find('key', key);

    if (index !== -1)
        var tagString = tvheadend.channelTags.getAt(index).get('val');

    return tagString;
};

// Store for duration filters - EPG, autorec dialog and autorec rules in the DVR grid
// NB: 'no max' is defined as 9999999s, or about 3 months...

tvheadend.DurationStore = new Ext.data.SimpleStore({
    storeId: 'durationnames',
    idIndex: 0,
    fields: ['identifier','label','minvalue','maxvalue'],
    data: [['-1', '(Clear filter)',"",""],
           ['1','00:00:00 - 00:15:00', 0, 900],
           ['2','00:15:00 - 00:30:00', 900, 1800],
           ['3','00:30:00 - 01:30:00', 1800, 5400],
           ['4','01:30:00 - 03:00:00', 5400, 10800],
           ['5','03:00:00 - No maximum', 10800, 9999999]]
});

// Function to convert numeric duration to corresponding label string
// Note: triggered by minimum duration only. This would fail if ranges
// had the same minimum (e.g. 15-30 mins and 15-60 minutes) (which we don't have). 

tvheadend.durationLookupRange = function(value) {
    durationString = "";
    var index = tvheadend.DurationStore.find('minvalue', value);
    if (index !== -1)
        var durationString = tvheadend.DurationStore.getAt(index).data.label;

    return durationString;
};

tvheadend.epgDetails = function(event) {

    var content = '';

    if (event.channelIcon != null && event.channelIcon.length > 0)
        content += '<img class="x-epg-chicon" src="' + event.channelIcon + '">';

    content += '<div class="x-epg-title">' + event.title;
    if (event.subtitle)
        content += "&nbsp;:&nbsp;" + event.subtitle;
    content += '</div>';
    if (event.episodeOnscreen)
        content += '<div class="x-epg-desc">' + event.episodeOnscreen + '</div>';
    if (event.summary)
      content += '<div class="x-epg-desc"><b>' + event.summary + '</b></div>';
    if (event.description)
      content += '<div class="x-epg-desc"><p>' + event.description + '</p></div>';
    if (event.starRating)
      content += '<div class="x-epg-meta">Star Rating: ' + event.starRating + '</div>';
    if (event.ageRating)
      content += '<div class="x-epg-meta">Age Rating: ' + event.ageRating + '</div>';
    if (event.genre) {
      var genre = [];
      Ext.each(event.genre, function(g) {
        var g1 = tvheadend.contentGroupLookupName(g);
        var g2 = tvheadend.contentGroupFullLookupName(g);
        if (g1 == g2)
          g1 = '';
        if (g1 || g2)
          genre.push((g1 ? '[' + g1 + '] ' : '') + g2);
      });
      content += '<div class="x-epg-meta">Content Type: ' + genre.join(', ') + '</div>';
    }

    content += '<div class="x-epg-meta"><a target="_blank" href="http://akas.imdb.com/find?q=' + event.title + '">Search IMDB</a></div>';
    content += '<div id="related"></div>';
    content += '<div id="altbcast"></div>';
    
    now = new Date();
    if (event.start < now && event.stop > now) {
        var title = event.title;
        if (event.episodeOnscreen)
          title += ' / ' + event.episodeOnscreen;
        content += '<div class="x-epg-meta"><a href="play/stream/channel/' + event.channelUuid +
                   '?title=' + encodeURIComponent(title) + '">Play</a></div>';
    }

    var buttons = [];

    if (tvheadend.accessUpdate.dvr) {

        var store = new Ext.data.JsonStore({
            autoload: true,
            root: 'entries',
            fields: ['key','val'],
            id: 'key',
            url: 'api/idnode/load',
            baseParams: {
                enum: 1,
                'class': 'dvrconfig'
            },
            sortInfo: {
                field: 'val',
                direction: 'ASC'
            }
        });
        store.load();

        var confcombo = new Ext.form.ComboBox({
            store: store,
            triggerAction: 'all',
            mode: 'local',
            valueField: 'key',
            displayField: 'val',
            name: 'config_name',
            emptyText: '(default)',
            value: '',
            editable: false
        });

        buttons.push(confcombo);
        buttons.push(new Ext.Button({
            handler: recordEvent,
            text: "Record program"
        }));
        buttons.push(new Ext.Button({
            handler: recordSeries,
            text: event.serieslinkId ? "Record series" : "Autorec"
        }));

    } else {

        buttons.push(new Ext.Button({
            handler: function() { win.close(); },
            text: "Close"
        }));
    }

    var win = new Ext.Window({
        title: 'Broadcast Details',
        layout: 'fit',
        width: 500,
        height: 300,
        constrainHeader: true,
        buttons: buttons,
        buttonAlign: 'center',
        autoScroll: true,
        html: content
    });
    win.show();

    function recordEvent() {
        record('api/dvr/entry/create_by_event');
    }

    function recordSeries() {
        record('api/dvr/autorec/create_by_series');
    }

    function record(url) {
        Ext.Ajax.request({
            url: url,
            params: {
                event_id: event.eventId,
                config_uuid: confcombo.getValue()
            },
            success: function(response, options) {
                win.close();
            },
            failure: function(response, options) {
                Ext.MessageBox.alert('DVR', response.statusText);
            }
        });
    }
};

tvheadend.epg = function() {
    var lookup = '<span class="x-zoom">&nbsp;</span>';

    var actions = new Ext.ux.grid.RowActions({
        header: '',
        width: 20,
        dataIndex: 'actions',
        actions: [{
                iconIndex: 'dvrState'
            }]
    });

    var epgStore = new Ext.ux.grid.livegrid.Store({
        autoLoad: true,
        url: 'api/epg/events/grid',
        bufferSize: 300,
        reader: new Ext.ux.grid.livegrid.JsonReader({
            root: 'entries',
            totalProperty: 'totalCount',
            id: 'eventId',
        },
        [
            { name: 'eventId' },
            { name: 'channelName' },
            { name: 'channelUuid' },
            { name: 'channelNumber' },
            { name: 'channelIcon' },
            { name: 'title' },
            { name: 'subtitle' },
            { name: 'summary' },
            { name: 'description' },
            { name: 'episodeOnscreen' },
            {
                name: 'start',
                type: 'date',
                dateFormat: 'U' /* unix time */
            },
            {
                name: 'stop',
                type: 'date',
                dateFormat: 'U' /* unix time */
            },
            { name: 'starRating' },
            { name: 'ageRating' },
            { name: 'genre' },
            { name: 'dvrState' },
            { name: 'serieslinkId' },
        ]),
    });

    function setMetaAttr(meta, record) {
        var now = new Date;
        var start = record.get('start');

        if (now.getTime() >= start.getTime()) {
            meta.attr = 'style="font-weight:bold;"';
        }
    }

    function renderDate(value, meta, record, rowIndex, colIndex, store) {
        setMetaAttr(meta, record);

        if (value) {
          var dt = new Date(value);
          return dt.format('D, M d, H:i');
        }
        return "";
    }

    function renderDuration(value, meta, record, rowIndex, colIndex, store) {
        setMetaAttr(meta, record);

        value = record.data.stop - record.data.start;
        if (!value || value < 0)
            value = 0;

        value = Math.floor(value / 60000);

        if (value >= 60) {
            var min = value % 60;
            var hours = Math.floor(value / 60);

            if (min === 0) {
                return hours + ' hrs';
            }
            return hours + ' hrs, ' + min + ' min';
        }
        else {
            return value + ' min';
        }
    }

    function renderText(value, meta, record, rowIndex, colIndex, store) {
        setMetaAttr(meta, record);

        return value;
    }

    function renderTextLookup(value, meta, record, rowIndex, colIndex, store) {
        setMetaAttr(meta, record);

        if (!value) return "";
        return lookup + value;
    }

    function renderInt(value, meta, record, rowIndex, colIndex, store) {
        setMetaAttr(meta, record);

        return '' + value;
    }

    var epgCm = new Ext.grid.ColumnModel({
        defaultSortable: true,
        columns: [
            actions,
            new Ext.ux.grid.ProgressColumn({
                width: 100,
                header: "Progress",
                dataIndex: 'progress',
                colored: false,
                ceiling: 100,
                tvh_renderer: function(value, meta, record, rowIndex, colIndex, store) {
                    var entry = record.data;
                    var start = entry.start;           // milliseconds
                    var duration = entry.stop - start; // milliseconds
                    var now = new Date();

                    if (!duration || duration < 0) duration = 0;
                    // Only render a progress bar for currently running programmes
                    if (now >= start && now - start <= duration)
                        return (now - start) / duration * 100;
                    else
                        return "";
                }
            }),
            {
                width: 250,
                id: 'title',
                header: "Title",
                dataIndex: 'title',
                renderer: renderTextLookup,
                listeners: { click: { fn: clicked } },
            },
            {
                width: 250,
                id: 'subtitle',
                header: "SubTitle",
                dataIndex: 'subtitle',
                renderer: renderText
            },
            {
                width: 100,
                id: 'episodeOnscreen',
                header: "Episode",
                dataIndex: 'episodeOnscreen',
                renderer: renderText
            },
            {
                width: 100,
                id: 'start',
                header: "Start",
                dataIndex: 'start',
                renderer: renderDate
            },
            {
                width: 100,
                hidden: true,
                id: 'stop',
                header: "End",
                dataIndex: 'stop',
                renderer: renderDate
            },
            {
                width: 100,
                id: 'duration',
                header: "Duration",
                renderer: renderDuration
            },
            {
                width: 60,
                id: 'channelNumber',
                header: "Number",
                align: 'right',
                dataIndex: 'channelNumber',
                renderer: renderText
            },
            {
                width: 250,
                id: 'channelName',
                header: "Channel",
                dataIndex: 'channelName',
                renderer: renderTextLookup,
                listeners: { click: { fn: clicked } },
            },
            {
                width: 50,
                id: 'starRating',
                header: "Stars",
                dataIndex: 'starRating',
                renderer: renderInt
            },
            {
                width: 50,
                id: 'ageRating',
                header: "Age",
                dataIndex: 'ageRating',
                renderer: renderInt
            }, {
                width: 250,
                id: 'genre',
                header: "Content Type",
                dataIndex: 'genre',
                renderer: function(vals) {
                    var r = [];
                    Ext.each(vals, function(v) {
                        v = tvheadend.contentGroupFullLookupName(v);
                        if (v)
                          r.push(v);
                    });
                    if (r.length < 1) return "";
                    return lookup + r.join(',');
                },
                listeners: { click: { fn: clicked } },
            }
        ]
    });

    var filter = new Ext.ux.grid.GridFilters({
        encode: true,
        local: false,
        filters: [
            { type: 'string',   dataIndex: 'title' },
            { type: 'string',   dataIndex: 'subtitle' },
            { type: 'string',   dataIndex: 'episodeOnscreen' },
            { type: 'intsplit', dataIndex: 'channelNumber', intsplit: 1000000 },
            { type: 'string',   dataIndex: 'channelName' },
            { type: 'numeric',  dataIndex: 'starRating' },
            { type: 'numeric',  dataIndex: 'ageRating' }
        ]
    });

    // Title search box

    var epgFilterTitle = new Ext.form.TextField({
        emptyText: 'Search title...',
        width: 200
    });

    // Channels, uses global store

    var epgFilterChannels = new Ext.form.ComboBox({
        loadingText: 'Loading...',
        width: 200,
        displayField: 'val',
        store: tvheadend.channels,
        mode: 'local',
        editable: true,
        forceSelection: true,
        triggerAction: 'all',
        typeAhead: true,
        emptyText: 'Filter channel...',
        listeners: {
            blur: function () {
                if(this.getRawValue() == "" ) {
                    clearChannelFilter();
                    epgView.reset();
                }
            }
        }
    });

    // Tags, uses global store

    var epgFilterChannelTags = new Ext.form.ComboBox({
        width: 200,
        displayField: 'val',
        store: tvheadend.channelTags,
        mode: 'local',
        editable: true,
        forceSelection: true,
        triggerAction: 'all',
        typeAhead: true,
        emptyText: 'Filter tag...',
        listeners: {
            blur: function () {
                if(this.getRawValue() == "" ) {
                    clearChannelTagsFilter();
                    epgView.reset();
                }
            }
        }

    });

    // Content groups

    var epgFilterContentGroup = new Ext.form.ComboBox({
        loadingText: 'Loading...',
        width: 200,
        displayField: 'val',
        store: tvheadend.ContentGroupStore,
        mode: 'local',
        editable: true,
        forceSelection: true,
        triggerAction: 'all',
        typeAhead: true,
        emptyText: 'Filter content type...',
        listeners: {
            blur: function () {
                if(this.getRawValue() == "" ) {
                    clearContentGroupFilter();
                    epgView.reset();
                }
            }
        }
    });

    var epgFilterDuration = new Ext.form.ComboBox({
        loadingText: 'Loading...',
        width: 150,
        displayField: 'label',
        store: tvheadend.DurationStore,
        mode: 'local',
        editable: true,
        forceSelection: true,
        triggerAction: 'all',
        typeAhead: true,
        emptyText: 'Filter duration...',
        listeners: {
            blur: function () {
                if(this.getRawValue() == "" ) {
                    clearDurationFilter();
                    epgView.reset();
                }
            }
        }

    });

/*
 * Clear filter functions
 */

    clearTitleFilter = function() {
        delete epgStore.baseParams.title;
        epgFilterTitle.setValue("");
    };

    clearChannelFilter = function() {
        delete epgStore.baseParams.channel;
        epgFilterChannels.setValue("");
    };

    clearChannelTagsFilter = function() {
        delete epgStore.baseParams.channelTag;
        epgFilterChannelTags.setValue("");
    };

    clearContentGroupFilter = function() {
        delete epgStore.baseParams.contentType;
        epgFilterContentGroup.setValue("");
    };

    clearDurationFilter = function() {
        delete epgStore.baseParams.durationMin;
        delete epgStore.baseParams.durationMax;
        epgFilterDuration.setValue("");
    };

    function epgQueryClear() {
        clearTitleFilter();
        clearChannelFilter();
        clearChannelTagsFilter();
        clearDurationFilter();
        clearContentGroupFilter();
        filter.clearFilters();
        delete epgStore.sortInfo;
        epgView.reset();
    };

/*
 * Filter selection event handlers
 */

    function epgFilterChannelSet(val) {
        if (!val)
            clearChannelFilter();
        else if (epgStore.baseParams.channel !== val)
            epgStore.baseParams.channel = val;
        epgView.reset();
    }

    epgFilterChannels.on('select', function(c, r) {
        epgFilterChannelSet(r.data.key == -1 ? "" : r.data.key);
    });

    epgFilterChannelTags.on('select', function(c, r) {
        if (r.data.key == -1)
            clearChannelTagsFilter();
        else if (epgStore.baseParams.channelTag !== r.data.key)
            epgStore.baseParams.channelTag = r.data.key;
        epgView.reset();
    });

    function epgFilterContentGroupSet(val) {
        if (!val)
            clearContentGroupFilter();
        else if (epgStore.baseParams.contentType !== val)
            epgStore.baseParams.contentType = val;
        epgView.reset();
    }

    epgFilterContentGroup.on('select', function(c, r) {
        epgFilterContentGroupSet(r.data.key == -1 ? "" : r.data.key);
    });

    epgFilterDuration.on('select', function(c, r) {
        if (r.data.identifier == -1)
            clearDurationFilter();
        else if (epgStore.baseParams.durationMin !== r.data.minvalue) {
            epgStore.baseParams.durationMin = r.data.minvalue;
            epgStore.baseParams.durationMax = r.data.maxvalue;
        }
        epgView.reset();
    });

    epgFilterTitle.on('valid', function(c) {
        var value = c.getValue();

        if (value.length < 1)
            value = null;

        if (epgStore.baseParams.title !== value) {
            epgStore.baseParams.title = value;
            epgView.reset();
        }
    });

    var epgView = new Ext.ux.grid.livegrid.GridView({
        nearLimit: 100,
        loadMask: {
            msg: 'Buffering. Please wait...'
        },
        listeners: {
            beforebuffer: {
                fn: function(view, ds, index, range, total, options) {
                    /* filters hack */
                    filter.onBeforeLoad(ds, options);
                }
            }
        }
    });

    tvheadend.autorecButton = new Ext.Button({
        text: 'Create AutoRec',
        iconCls: 'wand',
        tooltip: 'Create an automatic recording entry that will '
                 + 'record all future programmes that matches '
                 + 'the current query.',
        handler: createAutoRec
    });

    var tbar = [
        epgFilterTitle, '-',
        epgFilterChannels, '-',
        epgFilterChannelTags, '-',
        epgFilterContentGroup, '-',
        epgFilterDuration, '-',
        {
            text: 'Reset All',
            handler: epgQueryClear
        },
        '->',
        {
            text: 'Watch TV',
            iconCls: 'eye',
            handler: function() {
                new tvheadend.VideoPlayer();
            }
        },
        '-',
        tvheadend.autorecButton,
        '-',
        {
            text: 'Help',
            handler: function() {
                new tvheadend.help('Electronic Program Guide', 'epg.html');
            }
        }
    ];

    var panel = new Ext.ux.grid.livegrid.GridPanel({
        stateful: true,
        stateId: 'epggrid',
        enableDragDrop: false,
        cm: epgCm,
        plugins: [filter, actions],
        title: 'Electronic Program Guide',
        iconCls: 'newspaper',
        store: epgStore,
        selModel: new Ext.ux.grid.livegrid.RowSelectionModel(),
        view: epgView,
        tbar: tbar,
        bbar: new Ext.ux.grid.livegrid.Toolbar({
            view: epgView,
            displayInfo: true
        })
    });

    panel.on('rowclick', rowclicked);
    panel.on('filterupdate', function() {
        epgView.reset();
    });

    /**
     * Listener for DVR notifications. We want to update the EPG grid when a
     * recording is finished/deleted etc. so the status icon gets updated. 
     * Only do this when the tab is visible, otherwise it won't work as 
     * expected.
     */
    tvheadend.comet.on('dvrdb', function() {
        if (panel.isVisible())
            epgStore.reload();
    });
    
    // Always reload the store when the tab is activated
    panel.on('beforeshow', function() {
        epgStore.reload();
    });

    function clicked(column, grid, index, e) {
        if (column.dataIndex === 'title') {
            var value = grid.getStore().getAt(index).data[column.dataIndex];
            if (value && epgStore.baseParams.title !== value) {
                epgFilterTitle.setValue(value);
                return false;
            }
        } else if (column.dataIndex === 'channelName') {
            var value = grid.getStore().getAt(index).data[column.dataIndex];
            if (value && epgStore.baseParams.channel !== value) {
                epgFilterChannels.setValue(value);
                epgFilterChannelSet(value);
                return false;
            }
        } else if (column.dataIndex === 'genre') {
            var value = grid.getStore().getAt(index).data[column.dataIndex];
            if (value && value.length > 0) {
                value = parseInt(value[0]) & 0xf0;
                if (value && epgStore.baseParams.channelTag !== value) {
                    var l = tvheadend.contentGroupLookupName(value);
                    epgFilterContentGroup.setValue(l);
                    epgFilterContentGroupSet(value);
                    return false;
                }
            }
        }
    }

    function rowclicked(grid, index, e) {
        new tvheadend.epgDetails(grid.getStore().getAt(index).data);
    }

    function createAutoRec() {
    
        if (!tvheadend.accessUpdate.dvr)
            return;

        var title = epgStore.baseParams.title ? epgStore.baseParams.title
                : "<i>Don't care</i>";
        var channel = epgStore.baseParams.channel ? tvheadend.channelLookupName(epgStore.baseParams.channel)
                : "<i>Don't care</i>";
        var tag = epgStore.baseParams.channelTag ? tvheadend.channelTagLookupName(epgStore.baseParams.channelTag)
                : "<i>Don't care</i>";
        var contentType = epgStore.baseParams.contentType ? tvheadend.contentGroupLookupName(epgStore.baseParams.contentType)
                : "<i>Don't care</i>";
        var duration = epgStore.baseParams.durationMin ? tvheadend.durationLookupRange(epgStore.baseParams.durationMin)
                : "<i>Don't care</i>";

        Ext.MessageBox.confirm('Auto Recorder', 'This will create an automatic rule that '
                + 'continuously scans the EPG for programmes '
                + 'to record that match this query: ' + '<br><br>'
                + '<div class="x-smallhdr">Title:</div>' + title + '<br>'
                + '<div class="x-smallhdr">Channel:</div>' + channel + '<br>'
                + '<div class="x-smallhdr">Tag:</div>' + tag + '<br>'
                + '<div class="x-smallhdr">Genre:</div>' + contentType + '<br>'
                + '<div class="x-smallhdr">Duration:</div>' + duration + '<br>'
                + '<br><br>' + 'Currently this will match (and record) '
                + epgStore.getTotalCount() + ' events. ' + 'Are you sure?',
            function(button) {
                if (button === 'no')
                    return;
                createAutoRec2(epgStore.baseParams);
            });
    }

    function createAutoRec2(params) {
        /* Really do it */
        var conf = {
          enabled: 1,
          comment: 'Created from EPG query',
        };
        if (params.title) conf.title = params.title;
        if (params.channel) conf.channel = params.channel;
        if (params.tag) conf.tag = params.tag;
        if (params.contentType) conf.content_type = params.contentType;
        if (params.durationMin) conf.minduration = params.durationMin;
        if (params.durationMax) conf.maxduration = params.durationMax;
        Ext.Ajax.request({
            url: 'api/dvr/autorec/create',
            params: { conf: Ext.encode(conf) }
        });
    }

    return panel;
};
