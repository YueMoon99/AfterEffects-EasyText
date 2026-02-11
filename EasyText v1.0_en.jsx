(function(thisObj) {
    var allTextLayers = []; 
    var processedComps = {}; 
    var isBuilding = false;
    var SETTING_SECTION = "Easy_Text_Moon";
    var SETTING_KEY = "FavFonts";

    function getFavFonts() {
        if (app.settings.haveSetting(SETTING_SECTION, SETTING_KEY)) {
            var val = app.settings.getSetting(SETTING_SECTION, SETTING_KEY);
            return val ? val.split(",") : [];
        }
        return [];
    }

    function rgbToHex(r, g, b) {
        var toHex = function(n) {
            n = Math.max(0, Math.min(255, parseInt(n * 255)));
            return "0123456789ABCDEF".charAt((n - n % 16) / 16) + "0123456789ABCDEF".charAt(n % 16);
        };
        return (toHex(r) + toHex(g) + toHex(b)).toUpperCase();
    }

    function hexToRgb(hex) {
        hex = hex.replace(/[^0-9A-F]/gi, '');
        if (hex.length < 6) return [1,1,1];
        var bigint = parseInt(hex, 16);
        return [((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255];
    }

    // --- UI Construction ---
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "EasyText", undefined, {resizeable: true});
    win.text = "EasyText v1.0 | 舟午YueMoon |";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 15;

    var blogText = win.add("statictext", undefined, "Blog: yuemoon.vip   Bilibili: UID223633562");

    var topGrp = win.add("group");
    topGrp.spacing = 5;
    var btnScan = topGrp.add("button", [0,0,250,30], "★★ Deep Scan Project Text Layers ★★");
    var btnClearFav = topGrp.add("button", [0,0,105,30], "Clear Favorites");
    var btnGuide = topGrp.add("button", [0,0,90,30], "Guide");

    // --- ListBox (10 Columns) ---
    var listBox = win.add("listbox", undefined, undefined, {
        numberOfColumns: 10,
        showHeaders: true,
        columnTitles: ["Comp", "Preview", "Font", "Scale", "Size", "Color", "Stroke W", "Stroke C", "Tracking", "Leading"],
        multiselect: true
    });
    listBox.minimumSize.height = 100;
    listBox.maximumSize.height = 180;
    listBox.preferredSize.width = 445; 

    // Double-click to locate
    listBox.onDoubleClick = function() {
        var sel = listBox.selection;
        if (!sel) return;
        var targetIdx = (sel instanceof Array) ? sel[0].index : sel.index;
        var layer = allTextLayers[targetIdx];
        if (layer && layer.containingComp) {
            app.beginUndoGroup("Locate Layer");
            layer.containingComp.openInViewer();
            var layers = layer.containingComp.layers;
            for (var i = 1; i <= layers.length; i++) { layers[i].selected = false; }
            layer.selected = true;
            app.endUndoGroup();
        }
    };

    // Delete protection
    listBox.addEventListener('keydown', function(event) {
        if (event.keyName === "Delete" || event.keyName === "Backspace") {
            var sel = listBox.selection;
            if (sel && sel.length !== 0) {
                var targets = (sel instanceof Array) ? sel : [sel];
                var indices = [];
                for (var i = 0; i < targets.length; i++) { indices.push(targets[i].index); }
                indices.sort(function(a, b) { return b - a; });
                for (var j = 0; j < indices.length; j++) {
                    var idx = indices[j];
                    listBox.remove(idx);
                    allTextLayers.splice(idx, 1);
                }
            }
            event.preventDefault(); 
            event.stopPropagation();
        }
    });

    // --- Property Editor ---
    var ctrlPnl = win.add("panel", undefined, "Property Editor");
    ctrlPnl.orientation = "column"; ctrlPnl.alignChildren = ["fill", "top"]; ctrlPnl.margins = 15;
    var labelW = 50; var inputW = 140; var btnW = 80;

    // 1. Font
    var gFont = ctrlPnl.add("group");
    gFont.add("statictext", [0,0,labelW,20], "Font:");
    var dFont = gFont.add("dropdownlist", [0,0,inputW,25], ["Click Scan..."]);
    var btnFav = gFont.add("button", [0,0,25,25], "★");
    var bfSel = gFont.add("button", [0,0,btnW,25], "Apply Sel");
    var bfAll = gFont.add("button", [0,0,btnW,25], "Apply All");

    // 2. Content
    var gText = ctrlPnl.add("group");
    gText.add("statictext", [0,0,labelW,20], "Text:");
    var eText = gText.add("edittext", [0,0,inputW + 35,25], "");
    var btSel = gText.add("button", [0,0,btnW,25], "Apply Sel");
    var btAll = gText.add("button", [0,0,btnW,25], "Apply All");

    // 3. Scale
    var gScale = ctrlPnl.add("group");
    gScale.add("statictext", [0,0,labelW,20], "Scale:");
    var eScale = gScale.add("edittext", [0,0,inputW + 35,25], "100"); 
    var bScaleSel = gScale.add("button", [0,0,btnW,25], "Apply Sel");
    var bScaleAll = gScale.add("button", [0,0,btnW,25], "Apply All");

    // 4. Size
    var gSize = ctrlPnl.add("group");
    gSize.add("statictext", [0,0,labelW,20], "Size:"); 
    var eSize = gSize.add("edittext", [0,0,inputW + 35,25], "");
    var bsSel = gSize.add("button", [0,0,btnW,25], "Apply Sel");
    var bsAll = gSize.add("button", [0,0,btnW,25], "Apply All");

    // 5. Color
    var gColor = ctrlPnl.add("group");
    gColor.add("statictext", [0,0,labelW,20], "Color:");
    var eHex = gColor.add("edittext", [0,0,75,25], "FFFFFF");
    var bPick = gColor.add("button", [0,0,90,25], "Color Picker");
    var bcSel = gColor.add("button", [0,0,btnW,25], "Apply Sel");
    var bcAll = gColor.add("button", [0,0,btnW,25], "Apply All");

    // 6. Stroke Width
    var gStrokeW = ctrlPnl.add("group");
    gStrokeW.add("statictext", [0,0,labelW,20], "Stroke:");
    var eStrokeW = gStrokeW.add("edittext", [0,0,inputW + 35,25], "0");
    var bswSel = gStrokeW.add("button", [0,0,btnW,25], "Apply Sel");
    var bswAll = gStrokeW.add("button", [0,0,btnW,25], "Apply All");

    // 7. Stroke Color
    var gStrokeC = ctrlPnl.add("group");
    gStrokeC.add("statictext", [0,0,labelW,20], "Stroke C:");
    var eStrokeHex = gStrokeC.add("edittext", [0,0,75,25], "000000");
    var bStrokePick = gStrokeC.add("button", [0,0,90,25], "Color Picker");
    var bscSel = gStrokeC.add("button", [0,0,btnW,25], "Apply Sel");
    var bscAll = gStrokeC.add("button", [0,0,btnW,25], "Apply All");

    // 8. Tracking
    var gTracking = ctrlPnl.add("group");
    gTracking.add("statictext", [0,0,labelW,20], "Tracking:");
    var eTracking = gTracking.add("edittext", [0,0,inputW + 35,25], "0");
    var btrSel = gTracking.add("button", [0,0,btnW,25], "Apply Sel");
    var btrAll = gTracking.add("button", [0,0,btnW,25], "Apply All");

    // 9. Leading
    var gLeading = ctrlPnl.add("group");
    gLeading.add("statictext", [0,0,labelW,20], "Leading:");
    var eLeading = gLeading.add("edittext", [0,0,inputW + 35,25], "auto");
    var bldSel = gLeading.add("button", [0,0,btnW,25], "Apply Sel");
    var bldAll = gLeading.add("button", [0,0,btnW,25], "Apply All");

    var footerDivider = win.add("statictext", undefined, "——————————————————————————————————————");
    var copyText = win.add("statictext", undefined, "Open source project. No Resale!");

    // Guide Dialog
    btnGuide.onClick = function() {
        var gWin = new Window("dialog", "Easy Text Usage Guide");
        gWin.orientation = "column"; gWin.alignChildren = ["left", "top"]; gWin.spacing = 10; gWin.margins = 20;
        var helpText = 
                       "1. [Locate] Double-click a row to open the Comp and select the layer.\n"+
                       "2. [Safe Delete] Press Delete/Backspace to remove items from list (Won't delete layers).\n"+
                       "3. [Favorites] Use the ★ button to save fonts. They will persist in the list.\n"+
                       "4. [Batch Edit] Modify properties for 'Selected' or 'All' items in the table.\n"+
                       "5. [Auto Leading] Type 'auto' in the Leading field to restore Auto Leading.";
        var txt = gWin.add("statictext", undefined, helpText, {multiline: true});
        txt.preferredSize.width = 400;
        var btnClose = gWin.add("button", undefined, "Got it", {name: "ok"});
        btnClose.alignment = "center";
        gWin.show();
    };

    function forceRefreshList() {
        for (var i = 0; i < allTextLayers.length; i++) {
            try {
                var layer = allTextLayers[i];
                if (!layer || !layer.text) continue;
                var td = layer.text.sourceText.value;
                var layerScale = layer.transform.scale.value[0]; 
                var item = listBox.items[i];
                item.subItems[0].text = td.text.substring(0,20);
                item.subItems[1].text = td.font;
                item.subItems[2].text = Math.round(layerScale).toString() + "%"; 
                item.subItems[3].text = Math.round(td.fontSize).toString(); 
                item.subItems[4].text = rgbToHex(td.fillColor[0], td.fillColor[1], td.fillColor[2]);
                item.subItems[5].text = td.applyStroke ? Math.round(td.strokeWidth).toString() : "0";
                item.subItems[6].text = td.applyStroke ? rgbToHex(td.strokeColor[0], td.strokeColor[1], td.strokeColor[2]) : "000000";
                item.subItems[7].text = Math.round(td.tracking).toString(); 
                item.subItems[8].text = td.autoLeading ? "Auto" : Math.round(td.leading).toString(); 
            } catch(e) {}
        }
        listBox.visible = false; listBox.visible = true;
    }

    function deepScan(item, projFonts) {
        if (!item || processedComps[item.id]) return; 
        if (item instanceof CompItem) {
            processedComps[item.id] = true; 
            for (var i = 1; i <= item.numLayers; i++) {
                var l = item.layer(i);
                if (l instanceof TextLayer) {
                    try {
                        var td = l.text.sourceText.value;
                        var layerScale = l.transform.scale.value[0];
                        var li = listBox.add("item", item.name);
                        li.subItems[0].text = td.text.substring(0, 20);
                        li.subItems[1].text = td.font;
                        li.subItems[2].text = Math.round(layerScale).toString() + "%"; 
                        li.subItems[3].text = Math.round(td.fontSize).toString();
                        li.subItems[4].text = rgbToHex(td.fillColor[0], td.fillColor[1], td.fillColor[2]);
                        li.subItems[5].text = td.applyStroke ? Math.round(td.strokeWidth).toString() : "0";
                        li.subItems[6].text = td.applyStroke ? rgbToHex(td.strokeColor[0], td.strokeColor[1], td.strokeColor[2]) : "000000";
                        li.subItems[7].text = Math.round(td.tracking).toString(); 
                        li.subItems[8].text = td.autoLeading ? "Auto" : Math.round(td.leading).toString(); 
                        allTextLayers.push(l);
                        projFonts[td.font] = true;
                    } catch (e) { }
                } else if (l.source instanceof CompItem) {
                    deepScan(l.source, projFonts);
                }
            }
        }
    }

    btnScan.onClick = function() {
        isBuilding = true; listBox.removeAll(); dFont.removeAll(); allTextLayers = []; processedComps = {}; 
        var projFonts = {}; var favs = getFavFonts();
        if (favs.length > 0) {
            dFont.add("item", "--- Favorite Fonts ---");
            for (var f = 0; f < favs.length; f++) { if(favs[f]) dFont.add("item", favs[f]); }
            dFont.add("item", "--- Project Fonts ---");
        }
        app.beginSuppressDialogs(); 
        for (var j = 1; j <= app.project.numItems; j++) {
            var item = app.project.item(j);
            if (item instanceof CompItem) { deepScan(item, projFonts); }
        }
        app.endSuppressDialogs(false);
        for (var pf in projFonts) dFont.add("item", pf);
        if (dFont.items.length) dFont.selection = 0;
        listBox.size.height = Math.min(Math.max(allTextLayers.length * 22 + 25, 100), 350);
        win.layout.layout(true); isBuilding = false;
    };

    function executeModify(mode, type) {
        var indices = [];
        if (mode === "all") { for(var i=0; i<allTextLayers.length; i++) indices.push(i); }
        else {
            var s = listBox.selection;
            if(!s) return alert("Please select target rows in the list");
            if(s instanceof Array) { for(var j=0; j<s.length; j++) indices.push(s[j].index); }
            else { indices.push(s.index); }
        }
        app.beginUndoGroup("Batch Edit Text");
        for (var k = 0; k < indices.length; k++) {
            try {
                var layer = allTextLayers[indices[k]];
                if (!layer || layer.locked) continue; 
                var td = layer.text.sourceText.value;
                if (type === "font" && dFont.selection && dFont.selection.text.indexOf("---") === -1) td.font = dFont.selection.text;
                if (type === "text" && eText.text !== "") td.text = eText.text;
                if (type === "size" && eSize.text !== "") td.fontSize = parseFloat(eSize.text);
                if (type === "color") td.fillColor = hexToRgb(eHex.text);
                if (type === "strokeWidth" && eStrokeW.text !== "") { td.applyStroke = true; td.strokeWidth = parseFloat(eStrokeW.text); }
                if (type === "strokeColor") { td.applyStroke = true; td.strokeColor = hexToRgb(eStrokeHex.text); }
                if (type === "tracking" && eTracking.text !== "") td.tracking = parseFloat(eTracking.text); 
                if (type === "leading" && eLeading.text !== "") {
                    var valStr = eLeading.text.toLowerCase();
                    if (valStr === "auto" || valStr === "自动") {
                        td.autoLeading = true;
                    } else {
                        var valNum = parseFloat(valStr);
                        if (!isNaN(valNum)) {
                            td.autoLeading = false;
                            td.leading = valNum;
                        }
                    }
                }
                
                if (type !== "scale") layer.text.sourceText.setValue(td); 
                if (type === "scale" && eScale.text !== "") {
                    var sVal = parseFloat(eScale.text);
                    if (!isNaN(sVal)) {
                        if (layer.transform.scale.value.length === 3) {
                            layer.transform.scale.setValue([sVal, sVal, sVal]);
                        } else {
                            layer.transform.scale.setValue([sVal, sVal]);
                        }
                    }
                }

            } catch (e) { }
        }
        app.endUndoGroup(); forceRefreshList();
    }

    // Event Bindings
    bfSel.onClick = function() { executeModify("sel", "font"); };
    bfAll.onClick = function() { executeModify("all", "font"); };
    btSel.onClick = function() { executeModify("sel", "text"); };
    btAll.onClick = function() { executeModify("all", "text"); };
    bScaleSel.onClick = function() { executeModify("sel", "scale"); };
    bScaleAll.onClick = function() { executeModify("all", "scale"); };
    bsSel.onClick = function() { executeModify("sel", "size"); };
    bsAll.onClick = function() { executeModify("all", "size"); };
    bcSel.onClick = function() { executeModify("sel", "color"); };
    bcAll.onClick = function() { executeModify("all", "color"); };
    bswSel.onClick = function() { executeModify("sel", "strokeWidth"); };
    bswAll.onClick = function() { executeModify("all", "strokeWidth"); };
    bscSel.onClick = function() { executeModify("sel", "strokeColor"); };
    bscAll.onClick = function() { executeModify("all", "strokeColor"); };
    btrSel.onClick = function() { executeModify("sel", "tracking"); }; 
    btrAll.onClick = function() { executeModify("all", "tracking"); }; 
    bldSel.onClick = function() { executeModify("sel", "leading"); }; 
    bldAll.onClick = function() { executeModify("all", "leading"); }; 

    var pickColor = function(editObj) {
        var rgb = hexToRgb(editObj.text);
        var res = $.colorPicker((parseInt(rgb[0]*255)<<16)|(parseInt(rgb[1]*255)<<8)|parseInt(rgb[2]*255));
        if (res !== -1) editObj.text = rgbToHex(((res>>16)&0xff)/255, ((res>>8)&0xff)/255, (res&0xff)/255);
    };
    bPick.onClick = function() { pickColor(eHex); };
    bStrokePick.onClick = function() { pickColor(eStrokeHex); };

    btnFav.onClick = function() {
        if (dFont.selection) {
            var f = dFont.selection.text;
            if (f.indexOf("--") !== -1) return;
            var favs = getFavFonts();
            var exists = false;
            for(var i=0; i<favs.length; i++){ if(favs[i] === f) exists = true; }
            if(!exists){
                favs.push(f);
                app.settings.saveSetting(SETTING_SECTION, SETTING_KEY, favs.join(","));
                alert("Font saved to Favorites. Rescan to see changes.");
            }
        }
    };

    btnClearFav.onClick = function() {
        app.settings.saveSetting(SETTING_SECTION, SETTING_KEY, "");
        alert("Favorites Cleared.");
    };

    if (win instanceof Window) { win.center(); win.show(); }
    else { win.layout.layout(true); }

})(this);