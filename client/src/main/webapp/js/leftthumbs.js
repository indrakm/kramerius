/* global K5, _ */

/**
 * Left panel thumbs 
 */
function LeftThumbs(appl, elem) {
    this.application = (appl || K5);

    var jqSel = (elem || '#viewer>div.container>div.thumbs');        
    this.elem = $(jqSel);

    this.init();
    /*
    this.application.eventsHandler.addHandler(_.bind(function(type, data) {
        if (type === "window/resized") {
            this.resized();
        }
    }, this));
    */
    this.contentGenerated = false;
}

LeftThumbs.prototype = {
    relation: 1.3, // height/width
    thumbMargin: 4,
    thumbBorder: 2,
    thumbMinWidth: 90,
    thumbMinHeight: 128,
    imgMargin: 2,
    containerMargin: 1,
    maxInfoLength: 100,
    init: function() {

        $("ul.container").remove();

        this.container = $('<ul/>');
        this.container.addClass('container');
        this.elem.append(this.container);
        this.elem.css("width", "350px");
        this.width = this.elem.width() - this.containerMargin * 2;
        this.height = this.elem.height() - this.containerMargin * 2;
        this.hits = {};
        // i18n must be ready
        if (this.application.i18n.isKeyReady("dictionary")) {
            this.getThumbs();
        } else {
            this.application.eventsHandler.addHandler(_.bind(function(type, data) {
                if (type === "i18n/dictionary") {
                    if (!this.contentGenerated) {
                        this.getThumbs();
                    }
                }
            }, this));
        }
        $("#searchinside_q").keypress(_.bind(function(e) {
            if (e.keyCode === $.ui.keyCode.ENTER) {
                this.dosearch();
            }
        }, this));

//        this.elem.mousewheel(_.bind(function(event) {
//            if (event.deltaX !== 0) {
//                this.doScroll(event.deltaX);
//            } else {
//                this.doScroll(-event.deltaY);
//            }
//        }, this));
        
        
    

    },
    addContextButtons: function() {
        _ctxbuttonsrefresh("thumbs");
    },
    doScroll: function(dx) {
        var speed = 500;
        var finalPos = this.elem.scrollTop() + this.elem.height() * 0.6 * dx;
        var th = this;
        th.scrolling = true;
        
        this.elem.animate({scrollTop: finalPos}, speed, function() {
            //th.checkArrows();
        });
    },
    getThumbs: function() {
        this.thumbs = [];
        this.container.empty();
        this.thloaded = -1;
        this.setLoading(true);
        $("#viewer>div.loading").show();
        
        K5.api.askForItemSiblings(K5.api.ctx["item"]["selected"], _.bind(function(data) {
            
            var dd = [];
            _.each(data, function(objectForPath) { 
                _.each(objectForPath.siblings, function(thumb) {
                    dd.push(thumb);
                });
            });
            
            this.thumbs = dd;
            
            this.thloaded = 0;
            this.setDimensions();
            for (var i = 0; i < this.thumbs.length; i++) {
                this.addThumb(i);
            }
            if (this.thumbs.length === 0) {
                this.setLoading(false);
            }
            $("#viewer>div.loading").hide();
            this.getHits();
            this.scrollToSelected();
            
        }, this));

        this.contentGenerated = true;

    },
    scrollToSelected: function(){
        var li = $("li.selected");
        this.container.parent().animate({
            scrollTop: li.offset().top
        }, 1000);
    },
    getHits: function() {
        if ($("#q").val() === "") {
            return;
        }
        if (jQuery.isEmptyObject(this.hits)) {
            var pid = K5.api.ctx["item"]["selected"];
            var root_pid = K5.api.ctx["item"][pid].root_pid;
            var pid_path = "";
            var context = K5.api.ctx["item"][pid].context[0];
            for (var i = 0; i < context.length; i++) {
                pid_path += context[i].pid + "/";
            }
            var q = "q=" + $("#q").val() + "&rows=5000&fq=pid_path:" + pid_path.replace(/:/g, "\\:") + "*";
            var hl = "&hl=true&hl.fl=text_ocr&hl.mergeContiguous=true&hl.snippets=2";
            K5.api.askForSolr(q + hl, _.bind(function(data) {
                console.log("Hits: " + data.response.numFound);
                //console.log(JSON.stringify(data));
                this.hits = data.response.docs;
                this.highlighting = data.highlighting;
                this.setHitClass();
            }, this));
        } else {
            this.setHitClass();
        }
    },
    setHitClass: function() {
        var hits = this.hits;
        var hl = this.highlighting;
        $('li.thumb').each(function() {
            for (var i = 0; i < hits.length; i++) {
                var pid = hits[i].pid ? hits[i].pid : hits[i].PID;
                var pid_path = hits[i].pid_path[0];

                var lipid = $(this).data("pid").toString();
                if ($(this).data("pid") === pid) {
                    $(this).addClass('hit');
                    var tt = $(this).data("tt");

                    var hltext = "";
                    for (var j = 0; j < hl[pid].text_ocr.length; j++) {
                        hltext += '<div class="hl">' + hl[pid].text_ocr[j] + '</div>';
                    }
//                    $(this).tooltip("option", "content", tt + hltext);
                    break;
                } else if (pid_path.indexOf(lipid) > -1) {
                    $(this).addClass('chit');
                    break;
                }
            }
        });
        this.setLoading(false);
    },
    resized: function() {

        setTimeout(function() {
            this.width = this.elem.width();
            this.height = this.elem.height() - this.containerTop - this.containerMargin * 2;
            //this.setDimensions();
            $("#viewer li.thumb").css('width', this.thumbWidth + "px");
            $("#viewer li.thumb").css('height', this.thumbHeight + "px");
            //$("#viewer li.thumb img").attr("height", this.imgHeight);
            this.checkScroll();
        }.bind(this), 200);
    },
    setLoading: function(loading) {
        if (loading) {
            //$("#viewer>div.loading").show();
            $("#viewer").css("cursor", "progress");
        } else {
            //$("#viewer>div.loading").hide();
            $("#viewer").css("cursor", "default");
        }
    },
    checkLoading: function() {
        this.thloaded = this.thloaded + 1;
        if (this.thloaded >= this.thumbs.length) {
            this.setLoading(false);
            this.checkScroll();
        }
    },
    checkScroll: function(){
        var fit = this.elem.height() < this.elem.parent().height - 40;
        
            this.elem.css("height", "100%");
        
        if (fit) {
            this.elem.css("overflow", "hidden");
        } else {
            this.elem.css("overflow", "auto");
        }
    },
    setDimensions2: function() {
        this.width = this.elem.width() - this.containerMargin * 2;
        var marginTop = 40;
        this.height = this.elem.height() - this.containerMargin * 2 - marginTop;
        this.relation = 128.0 / 96.0;
        this.relation = 96.0 / 128.0;
        var minGridCols = Math.floor(this.width / this.thumbMinWidth);
        var fit = true;
        var numThumbs = this.thumbs.length;

        var gridCols = Math.round(Math.sqrt((numThumbs * this.relation * this.width) / (this.height)));
        if (gridCols > minGridCols) {
            gridCols = minGridCols;
            fit = false;
        }
        if (gridCols === 0) {
            gridCols = 1;
        }
        var gridRows = Math.round(numThumbs / gridCols);
        if (gridRows * gridCols < numThumbs) {
            gridRows = gridRows + 1;
        }

        this.cellWidth = Math.floor((this.width - this.thumbMargin * 2 - this.thumbBorder * 2) / gridCols);
        if (fit) {
            this.cellHeight = (this.height) / gridRows;
            this.elem.css("overflow", "hidden");
        } else {
            this.cellHeight = this.cellWidth * this.relation;
            this.elem.css("overflow", "auto");
        }
        this.thumbWidth = this.cellWidth - this.thumbMargin * 2 - this.thumbBorder * 2;
        this.thumbHeight = Math.max(this.thumbMinHeight, this.cellHeight - this.thumbMargin * 2 - this.thumbBorder * 2);
        
        this.imgWidth = this.thumbWidth - this.imgMargin * 2 - this.thumbBorder * 2;
        this.imgHeight = this.thumbHeight - this.imgMargin * 2 - this.thumbBorder * 2;

    },
    
    thumbMaxWidth: 96,
    thumbMaxHeight: 128,
    thumbCurWidth: 0,
    thumbCurHeight: 0,
    setCurThumbSize: function(w, h) {
        return;
        if(w > this.thumbCurWidth || (h > this.thumbCurHeight && this.thumbCurHeight !== this.thumbMaxHeight)){
            //this.thumbCurWidth = Math.min(w, this.thumbMaxWidth);
            this.thumbCurWidth = w;
            this.thumbCurHeight = Math.min(h, this.thumbMaxHeight);
            this.thumbWidth = this.thumbCurWidth + 8;
            this.thumbHeight = this.thumbCurHeight + 8;
            this.imgWidth = this.thumbWidth - this.imgMargin * 2 - this.thumbBorder * 2;
            this.imgHeight = this.thumbHeight - this.imgMargin * 2 - this.thumbBorder * 2;
            
            this.resized();
        }
    },
    setDimensions: function() {
        return;
        $('#viewer li.thumb').css('width', this.thumbMaxWidth).css('height', this.thumbMaxHeight);
        
    },
    addThumb: function(index) {
        var pid = this.thumbs[index].pid ? this.thumbs[index].pid : this.thumbs[index].PID;

        var imgsrc = 'api/item/' + pid + '/thumb';
        var img = $('<img/>', {src: "images/empty.gif"});
        var image = new Image();
        var itemths = this;
        image.onload = function() {
            $(img).attr("src", imgsrc);
        
            var w = this.naturalWidth;
            var h = this.naturalHeight;
            itemths.setCurThumbSize(w, h);
            var relation = w / h;
            if (itemths.imgHeight * relation > itemths.imgWidth) {
                $(img).css("top", (itemths.thumbHeight - itemths.imgHeight)/2);
                if(w > itemths.imgWidth){
                    //$(img).css("width", "calc(100% - 8px)");
                    //$(img).attr("width", Math.min(w, itemths.imgWidth));
                }else{
//                    $(img).css("width", w);
                }
            } else {
                var finalh = Math.min(h, itemths.imgHeight);
//                    $(img).attr("height", finalh);
                    //$(img).css("height", "calc(100% - 8px)");
                    $(img).css("top", (itemths.thumbHeight - finalh)/2);
//                if(h > itemths.imgHeight){
//                    
//                }else{
//                    $(img).css("top", (finalh - h)/2);
//                }
            }

        
            itemths.checkLoading();
        };
        image.onerror = function() {
            $(img).attr("src", "");
            itemths.checkLoading();
        };
        image.src = imgsrc;
        var thumb = $('<li/>', {class: 'thumb', 'data-pid': pid});
        thumb.attr("title", this.thumbs[index].title);

        thumb.css('width', this.thumbWidth + "px");
        thumb.css('height', this.thumbHeight + "px");
        img.click(function() {
            var histDeep = getHistoryDeep() + 1;
            //K5.api.gotoDisplayingItemPage(pid + ";" + histDeep, $("#q").val());
            window.location.hash = pid + ";" + histDeep;
        });

        var title = '<span class="title">' + K5.i18n.translatable('fedora.model.' + this.thumbs[index].model) + " " + this.thumbs[index].title + '</span>';
        var info = {short: "", full: ""};
        this.getDetails(this.thumbs[index], info);
        thumb.data("pid", pid);
        //var tt = '<img src="' + imgsrc + '" style="float:left;margin-right:4px;" /><div class="tt_text">' + title + info.full + '</div>';
        var tt = '<div class="tt_text">' + title + info.full + '</div>';
        
        thumb.data("tt", tt);
        this.container.append(thumb);

        thumb.append(img);
        thumb.append(tt);
        
        thumb.addClass('policy');
        if (this.thumbs[index].policy) {
            thumb.addClass(this.thumbs[index].policy);
        }
        
        if(pid === K5.api.ctx["item"]["selected"].split(";")[0]){
            thumb.addClass('selected');
        }

        this.container.append(thumb);
    },
    getDetails: function(json, info) {
        var model = json["model"];
        var details = json["details"];
        var root_title = json["root_title"];
        var detFull = "";
        var detShort = "";
        if (details) {

            if (model === "periodicalvolume") {

                detShort = "<div>" + root_title.substring(0, this.maxInfoLength) + "</div>" +
                        K5.i18n.translatable('field.datum') + ": " + details.year + " ";
                if (details.volumeNumber) {
                    detShort += K5.i18n.translatable('mods.periodicalvolumenumber') + " " + details.volumeNumber;
                }

                detFull = "<div>" + root_title + "</div>" +
                        K5.i18n.translatable('field.datum') + ": " + details.year + " ";
                if (details.volumeNumber) {
                    detFull += K5.i18n.translatable('mods.periodicalvolumenumber') + " " + details.volumeNumber;
                }

            } else if (model === "internalpart") {
                var dArr = details.split("##");
                detFull = dArr[0] + " " + dArr[1] + " " + dArr[2] + " " + dArr[3];
                detShort = dArr[0] + " " + dArr[1] + " " + dArr[2] + " " + dArr[3];
            } else if (model === "periodicalitem") {
                if (details.issueNumber !== root_title) {
                    detFull = details.issueNumber + " " + details.date + " " + details.partNumber;
                    detShort = details.issueNumber + " " + details.date + " " + details.partNumber;
                } else {
                    detFull = details.date + " " + details.partNumber;
                    detShort = details.date + " " + details.partNumber;
                }
            } else if (model === "monographunit") {
                detFull = details.title + " " + details.partNumber;
                detShort = details.title + " " + details.partNumber;
            } else if (model === "page") {
                detFull = "&nbsp;" +  K5.i18n.translatable('mods.page.partType.' + details.type);
                detShort = K5.i18n.translatable('mods.page.partType.' + details.type);
            } else {
                detFull = details;
                detShort = details;
            }
        } else {
            return "";
        }

        info.short += '<div class="details">' +  detShort + '</div>';
        info.full += '<div class="details">' + detFull + '</div>';

    },
    clearContainer: function() {
        $("ul.container").remove();

        //this.topArrow.remove();
        //this.bottomArrow.remove();
    }
};


