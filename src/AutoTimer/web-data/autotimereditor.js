/***

		AutoTimer WebIf for Enigma-2
		Coded by betonme (c) 2012 @ IHAD <glaserfrank(at)gmail.com>
		Support: http://www.i-have-a-dreambox.com/wbb2/thread.php?threadid=79391
		
		All Files of this Software are licensed under the Creative Commons 
		Attribution-NonCommercial-ShareAlike 3.0 Unported 
		License if not stated otherwise in a files head. To view a copy of this license, visit
		http://creativecommons.org/licenses/by-nc-sa/3.0/ or send a letter to Creative
		Commons, 559 Nathan Abbott Way, Stanford, California 94305, USA.
		
		Alternatively, this plugin may be distributed and executed on hardware which
		is licensed by Dream Multimedia GmbH.
		
		This plugin is NOT free software. It is open source, you are allowed to
		modify it (if you keep the license), but it may not be commercially 
		distributed other than under the conditions noted above.

***/


///////////////////////////////////////////////////////////////////////////////
// Statics
function Url() {
	this.tpl               = '';
	this.editor            = '/autotimereditor';
	this.backup            = '/autotimereditor/web/backup';
	this.restore           = '/autotimereditor/web/restore';
	this.list              = '/autotimer';
	this.get               = '/autotimer/get';
	this.set               = '/autotimer/set';
	this.edit              = '/autotimer/edit';
	this.add               = '/autotimer/edit';
	this.remove            = '/autotimer/remove';
	this.parse             = '/autotimer/parse';
	this.preview           = '/autotimer/simulate';
	this.timerlist         = '/web/timerlist';
	this.timerchange       = "/web/timerchange";
	this.timerdelete       = "/web/timerdelete";
	this.tmp               = '/autotimereditor/tmp/';
	this.getcurrlocation   = "/web/getcurrlocation";
	this.getlocations      = "/web/getlocations";
	this.gettags           = "/web/gettags";
	this.getservices       = '/web/getservices';
}
Object.extend(URL, new Url());

let types = {};
types['include'] = 'Include';
types['exclude'] = 'Exclude';

let wheres = {};
wheres['title'] = 'Title';
wheres['shortdescription'] = 'Short description';
wheres['description'] = 'Description';
wheres['dayofweek'] = 'Day of week';

let weekdays = {};
weekdays['0'] = 'Monday';
weekdays['1'] = 'Tuesday';
weekdays['2'] = 'Wednesday';
weekdays['3'] = 'Thursday';
weekdays['4'] = 'Friday';
weekdays['5'] = 'Saturday';
weekdays['6'] = 'Sunday';
weekdays['weekend'] = 'Weekend';
weekdays['weekday'] = 'Weekday';

///////////////////////////////////////////////////////////////////////////////
// Global functions
function compareStrings(a, b){
	a = a.toLowerCase();
	b = b.toLowerCase();
	return (b < a) - (a < b);
}

function sortAutoTimerByName(a,b){
	return compareStrings(a.name, b.name);
}

// Now we will define our date comparison functions. These are callbacks
// that we will be providing to the array sort method below.
let date_sort_asc = function (date1, date2) {
	// This is a comparison function that will result in dates being sorted in
	// ASCENDING order. As you can see, JavaScript's native comparison operators
	// can be used to compare dates. This was news to me.
	if (date1 > date2) return 1;
	if (date1 < date2) return -1;
	return 0;
};

let date_sort_desc = function (date1, date2) {
	// This is a comparison function that will result in dates being sorted in
	// DESCENDING order.
	if (date1 > date2) return -1;
	if (date1 < date2) return 1;
	return 0;
};

function sortAutoTimerByStart(a,b){
	return date_sort_asc(a.start, b.start);
}

function in_array(a, p){
	for (let i = 0; i < a.length; i++)
		if (a[i] == p) return true;
	return false;
}

function toReadableDate(date){
	let dateString = "";
	dateString += date.getFullYear();
	dateString += "-" + addLeadingZero(date.getMonth()+1);
	dateString += "-" + addLeadingZero(date.getDate());
	return dateString;
}

function toReadableDateTime(date){
	let dateString = "";
	dateString += date.getFullYear();
	dateString += "-" + addLeadingZero(date.getMonth()+1);
	dateString += "-" + addLeadingZero(date.getDate());
	dateString += " " + addLeadingZero(date.getHours());
	dateString += ":" + addLeadingZero(date.getMinutes());
	return dateString;
}

function toReadableTime(date){
	let dateString = "";
	dateString = addLeadingZero(date.getHours());
	dateString += ":" + addLeadingZero(date.getMinutes());
	return dateString;
}

function toTimestamp(date){
		date = date.split('-');
		let sDate = new Date();
		sDate.setFullYear(date[0], date[1] - 1, date[2]);
		sDate.setHours( 0 );
		sDate.setMinutes( 0 );
		sDate.setSeconds( 0 );
		return Math.floor(sDate.getTime() / 1000);
}

function createOptionList(object, selected) {
	let namespace = new Array();
	let i = 0;
	for (let element in object) {
		let txt = String(object[element]);
		let sel = " ";

		if (element == selected) {
			sel = "selected";
		}

		if (element != "extend") {
			namespace[i] = {
				'value' : element,
				'txt' : txt,
				'selected' : sel
			};
			i++;
		}
	}
	return namespace;
}

function numericalOptionList(lowerBound, upperBound, selectedValue, offset){
	let list = [];
	let idx = 0;
	if(offset == undefined){
		offset = 0;
	}
	
	for(let i = lowerBound; i <= upperBound; i++){
		let t = i + offset;
		let txt = t < 10 ? "0" + t : t;
		let selected = "";
		if(i == selectedValue){
			selected = 'selected';
		}
		list[idx] = {value : i, txt : txt, selected : selected};
		idx++;
	}
	return list;
}

function getAttribute(xml, key, defaults){
	let value = xml.getAttribute(key);
	if (value == undefined) {
		if (key in defaults){
			value = defaults[key];
		}
	}
	return value;
}

///////////////////////////////////////////////////////////////////////////////
// AutoTimerEditorCore
let AutoTimerEditorCore = Class.create({
	initialize: function(name, servicename, servicereference, from, to){
		// Check WebIf Version
		if (typeof core == "undefined"){
			alert("Old WebInterface found!\nPlease update the WebInterface Plugin first.");
			return;
		}
		// Start AutoTimer WebIf
		this.newautotimer = {
			'enabled' : 'yes',
			'name' : name,
			'match' : name,
			'from' : from,
			'to' : to,
			'e2servicename' : servicename,
			'e2servicereference' : servicereference,
		};

		// Instantiate all elements
		this.services = new AutoTimerServiceController();
		this.settings = new AutoTimerSettingsController();
		this.menu = new AutoTimerMenuController('contentAutoTimerMenu');
		this.list = new AutoTimerListController('contentAutoTimerList');
		this.edit = new AutoTimerEditController('contentAutoTimerContent');
		this.preview = new AutoTimerPreviewController('contentAutoTimerContent');
		this.parse = new AutoTimerParseController('contentAutoTimerContent');
		this.timers = new TimerController('contentAutoTimerContent');
		this.about = new AboutPage('contentAutoTimerContent');
		this.sessionProvider = new SessionProvider( this.onSessionAvailable.bind(this) );
		this.sessionProvider.load({});
	},

	onSessionAvailable: function(sid){
		debug("[AutoTimerEditorCore].onSessionAvailable, " + sid)

		// Display menu
		this.menu.load();

		// Load locations and tags
		core.lt.getLocationsAndTags(this.loadLocationsAndTagsCallback.bind(this));
		// Load bouquet list
		this.services.loadBouquetsTv(this.loadBouquetsCallback.bind(this));
		// Load autotimer settings
		this.settings.load(this.loadSettingsCallback.bind(this));
	},
	
	loadLocationsAndTagsCallback: function(currentLocation, locations, tags){
		this.currentLocation = currentLocation;
		this.locations = locations;
		this.tags = tags;
		this.loadFinal();
	},
	
	loadBouquetsCallback: function(bouquets){
		this.bouquets = bouquets;
		this.loadFinal();
	},
	
	loadSettingsCallback: function(settings){
		this.hasVps = settings['hasVps'];
		this.hasSeriesPlugin = settings['hasSeriesPlugin'];
		this.loadFinal();
	},
	
	loadFinal: function(){
		if (this.locations != undefined && this.tags != undefined && this.bouquets != undefined && this.hasVps != undefined && this.hasSeriesPlugin != undefined ){
			// Load and display autotimer list
			if (this.newautotimer.name == '') {
				// Load autotimer list and show a new autotimer
				this.list.loadNew();
			}else{
				// Load autotimer list and select the first autotimer
				this.list.load();
			}
		}
	},
});


///////////////////////////////////////////////////////////////////////////////
// Controller
let AutoTimerServiceController = Class.create(Controller, {
	initialize: function($super){
		$super(new AutoTimerServiceListHandler());
	},
	
	load: function(sRef, callback){
		this.handler.load( {'sRef' : sRef}, callback );
	},
	
	loadBouquetsTv: function(callback){
		this.load(bouquetsTv, callback);
	},
	
	onFinished: function(){},
	
	registerEvents: function(){}
});

let AutoTimerSettingsController = Class.create(Controller, {
	initialize: function($super){
		$super(new AutoTimerSettingsHandler());
	},
	
	load: function(callback){
		this.handler.load( callback );
	},
	
	onFinished: function(){},
	registerEvents: function(){},
});

let AutoTimerMenuController = Class.create(Controller, {
	initialize: function($super, target){
		$super(new AutoTimerMenuHandler(target));
	},
	
	back: function(){
		globalThis.location = globalThis.location.protocol + "//" + globalThis.location.hostname;
	},
	
	load: function(){
		this.handler.load({});
	},
	
	backup: function() {
		this.filename=prompt('Please enter filename for backup file:', 'autotimer_backup');
		if (this.filename) {
			this.handler.backup(
				{ 'Filename' : this.filename },
				this.download.bind(this));
		}
		
	},
	download: function(file){
		let url = URL.tmp + file;
		window.open(url,'Download');
		core.notify("Downloading...");
	},
	
	restore: function(){
		this.upload();
	},
	
	upload: function(){
		//TODO move to a separate class
		let form = $('restoreform');
		
		if($('file').value.trim() == ""){
			core.notify("Please select a File to restore!");
			return;
		}
		// Create the iframe...
		let iframe = document.createElement("iframe");
		iframe.setAttribute("id","upload_iframe");
		iframe.setAttribute("name","upload_iframe");
		iframe.setAttribute("width","0");
		iframe.setAttribute("height","0");
		iframe.setAttribute("border","0");
		iframe.setAttribute("style","width: 0; height: 0; border: none;");
	
		// Add to document...
		form.parentNode.appendChild(iframe);
		window.frames['upload_iframe'].name="upload_iframe";
		iframe = $(iframe);
	
		// Add event...
		let eventHandler = function(){
			// Message from server...
			let resdoc;
			
			if (iframe.contentDocument) {
					resdoc = iframe.contentDocument;
			} else if (iframe.contentWindow) {
					resdoc = iframe.contentWindow.document;
			} else if (iframe.document) {
					resdoc = iframe.document;
			}
	
			let result = new SimpleXMLResult(resdoc);
			if (result.getState()){
				autotimereditorcore.menu.handler.restore(
					{ 'Filename' : result.getStateText() },
					autotimereditorcore.menu.uploadCallback.bind(this));
			} else {
				core.notify( result.getStateText() );
			}
	
			try{
				// unregister Eventhandler
				iframe.stopObserving();
				// remove iframe
				iframe.remove();
			} catch(e){alert(e);}
		}
	
		iframe.observe("load", eventHandler);
		// Set properties of form...
		form.setAttribute("target","upload_iframe");
		form.setAttribute("action","uploadfile");
		form.setAttribute("method","post");
		form.setAttribute("enctype","multipart/form-data");
		form.setAttribute("encoding","multipart/form-data");
	
		// Submit the form...
		form.submit();
	
		core.notify("Uploading...");
	},
	uploadCallback: function(){
		autotimereditorcore.list.reload();
	},
	
	about: function(){
		autotimereditorcore.about.load();
	},
	
	registerEvents: function(){
		$('back').on(
			'click',
			function(event, element){
				this.back();
			}.bind(this)
		);
		$('back').title = "Return to Receiver Webcontrol";
		$('reload').on(
			'click',
			function(event, element){
				autotimereditorcore.list.reload();
			}.bind(this)
		);
		$('reload').title = "Reload the AutoTimer list";
		$('preview').on(
			'click',
			function(event, element){
				autotimereditorcore.preview.load();
			}.bind(this)
		);
		$('preview').title = "Show events matching your AutoTimers";
		$('parse').on(
			'click',
			function(event, element){
				autotimereditorcore.parse.load();
			}.bind(this)
		);
		$('parse').title = "Run AutoTimer and add timers";
		$('timer').on(
			'click',
			function(event, element){
				autotimereditorcore.timers.loadList();
			}.bind(this)
		);
		$('timer').title = "Open timer list";
		$('backup').on(
			'click',
			function(event, element){
				this.backup();
			}.bind(this)
		);
		$('backup').title = "Backup the AutoTimer configuration";
		$('restore').on(
			'click',
			function(event, element){
				this.restore();
			}.bind(this)
		);
		$('restore').title = "Restore a previous configuration backup";
		$('about').on(
			'click',
			function(event, element){
				this.about();
			}.bind(this)
		);
		$('about').title = "Some information about author, license, support...";
	},
});

let AutoTimerListController = Class.create(Controller, {
	//TODO What about a clone AutoTimer function
	initialize: function($super, target){
		$super(new AutoTimerListHandler(target));
		this.select = null;
		this.idx = null;
	},
	
	load: function(){
		this.handler.load({});
	},

	loadNew: function(){
		this.select = -1;
		this.handler.load({});
	},

	onFinished: function(){
		this.onChange();
	},
	
	onChange: function(){
		let selectList = $('list');
		let selectOptions = selectList.getElementsByTagName('option');
		
		// Set new row size of list
		selectList.size = selectOptions.length + 2;
		
		if ( selectOptions.length > 0){
			if (this.select != undefined && this.select != null && this.select != ""){
				// Select the given AutoTimer because of add/remove action
				for (let idx in selectOptions){
					if ( this.select == decodeURIComponent(selectOptions[idx].value) ){
						selectOptions[idx].selected = true;
						break;
					}
				}
				this.select = null;
			}else if (this.idx != undefined && this.idx != null && this.idx != ""){
				// Select the given index / row
				if ( selectOptions.length > this.idx){
					selectOptions[this.idx].selected = true;
					this.idx = null;
				}
			}else{
				let idx = selectList.selectedIndex;
				if (idx < 0){
					// Select at least the first element
					idx = 0;
					selectOptions[idx].selected = true;
				}
			}
			
			// Update editor
			let idx = selectList.selectedIndex;
			if (idx >= 0){
				// Load autotimer
				let id = decodeURIComponent(selectList.options[idx].value); 
				autotimereditorcore.edit.load( id );
			}else{
				// Show empty editor for new AutoTimer
				autotimereditorcore.edit.load( -1 );
			}
		
		} else if (selectOptions.length == 0){
			// Show empty editor for new AutoTimer
			autotimereditorcore.edit.load( -1 );
		}
	},
	
	reload: function(){
		this.select = $('list').value;
		$('contentAutoTimerContent').update('<div></div>');
		this.load();
	},
	
	add: function(){
		this.match = prompt("Name for the new AutoTimer:");
		if (this.match!=null && this.match!=""){
			// Retrieve next selected entry
			this.select = $('list').length+1;
			// Add new AutoTimer: Use edit without an id
			this.handler.add( 
				{'match' : this.match},
				function(request){
					this.load();
				}.bind(this));
		}
	},
		
	remove: function(){
		let selectList = $('list');
		let idx = selectList.selectedIndex; 
		let selectOptions = selectList.getElementsByTagName('option');
		let id = decodeURIComponent(selectOptions[idx].value);
		
		let nextidx = -1;
		if ( selectOptions.length > 0){
			if ( selectOptions.length > (idx+1)){
				nextidx = idx;
			} else if ( (idx-1) > 0 ){
				nextidx = idx-1;
			}
		}
		let check = confirm("Do you really want to delete the AutoTimer\n" + selectList.options[idx].text + " ?");
		if (check){
			this.idx = nextidx;
			this.handler.remove(
				{'id' : id},
				function(request){
					this.load();
				}.bind(this));
		}
	},
	
	registerEvents: function(){
		$('list').on(
			'change',
			function(event, element){
				this.onChange();
			}.bind(this)
		);
		$('add').on(
			'click',
			function(event, element){
				this.add();
			}.bind(this)
		);
		$('delete').on(
			'click',
			function(event, element){
				this.remove();
			}.bind(this)
		);
	}
});

let AutoTimerEditController = Class.create(Controller, {
	initialize: function($super, target){
		$super(new AutoTimerEditHandler(target));
	},
	
	load: function( id ){
		this.id = id;
		this.handler.load( id );
	},
	
	reload: function(){
		this.handler.load( this.id );
	},
	
	onFinished: function(){
		let id = this.id>0 ? this.id : 'new';
		$('headerautotimercontent').innerHTML = "AutoTimer Editor: " + $('name').value + " (" + id + ")";
		this.onchangeSelect( $('justplay') );
		this.onchangeCheckbox( $('timespan') );
		this.onchangeCheckbox( $('timeframe') );
		this.onchangeCheckbox( $('offset') );
		this.onchangeCheckbox( $('maxdurationavailable') );
		this.onchangeCheckbox( $('locationavailable') );
		this.onchangeSelectAfterEvent( $('afterevent') );
		this.onchangeSelect( $('counter') );
		this.onchangeCheckbox( $('usefilters') );
		let filterwheres = $$('.filterwhere');
		for (let i = 0; i < filterwheres.size(); i++) {
			this.onchangeSelectFilter(filterwheres[i]);
		}
		this.onchangeCheckbox( $('usebouquets') );
		this.onchangeCheckbox( $('useservices') );
		let services = $$('.service');
		for (let i = 0; i < services.size(); i++) {
			if (services[i].lastElementChild.className == 'add'){
				this.onchangeSelectBouquet(services[i].firstElementChild.firstElementChild);
			}
		}
		this.onchangeCheckbox( $('vps_enabled') );
		
		AnyTime.noPicker( 'from' );
		AnyTime.picker( 'from', { format: "%H:%i" } );
		AnyTime.noPicker( 'to' );
		AnyTime.picker( 'to', { format: "%H:%i" } );
		AnyTime.noPicker( 'after' );
		AnyTime.picker( 'after', { format: "%Y-%m-%d", firstDOW: 1 } );
		AnyTime.noPicker( 'before' );
	  AnyTime.picker( 'before', { format: "%Y-%m-%d", firstDOW: 1 } );
		AnyTime.noPicker( 'aftereventFrom' );
		AnyTime.picker( 'aftereventFrom', { format: "%H:%i" } );
		AnyTime.noPicker( 'aftereventTo' );
		AnyTime.picker( 'aftereventTo', { format: "%H:%i" } );
	},
	
	onchangeCheckbox: function(x) {
		if (x.checked){
			$(x.id+'content').style.display = 'block';
		} else{
			$(x.id+'content').style.display = 'none';
		}
	},
	
	onchangeSelect: function(x) {
		if (x.value > 0){
			$(x.id+'content').style.display = 'block';
		} else{
			$(x.id+'content').style.display = 'none';
		}
	},
	
	onchangeSelectAfterEvent: function(x) {
		if (x.value == 'default'){
			$('aftereventusetimespan').checked = '';
			$(x.id+'content').style.visibility = "hidden";
		} else{
			$(x.id+'content').style.visibility = 'visible';
		}
		this.onchangeCheckbox( $('aftereventusetimespan') );
	},
	
	onchangeSelectFilter: function(x) {
		if (x.value == 'dayofweek'){
			x.parentNode.nextElementSibling.children[0].style.display = 'none';
			x.parentNode.nextElementSibling.children[1].style.display = 'block';
		} else{
			x.parentNode.nextElementSibling.children[1].style.display = 'none';
			x.parentNode.nextElementSibling.children[0].style.display = 'block';
		}
	},
	
	onchangeSelectBouquet: function(x) {
		let select = x.parentNode.nextElementSibling.firstElementChild;
		for (let i = select.options.length - 1; i >= 0; i--) {
			select.options.remove(i);
		}
		// Load services of selected bouquet
		autotimereditorcore.services.load( decodeURIComponent(x.value), this.servicesCallback.bind(this, x) );
	},
	servicesCallback: function(x, services) {
		let select = x.parentNode.nextElementSibling.firstElementChild;
		for ( let service in services) {
			select.options.add( new Option(String(services[service]), service ) );
		}
	},
	
	changeTag: function(x) {
		let selected = 'selected';
		let attr = 'data-selected';
		if(x.hasClassName(selected)){
			x.removeClassName(selected);
			x.writeAttribute(attr, '');
		} else {
			x.addClassName(selected);
			x.writeAttribute(attr, selected);
		}
	},
	
	addFilter: function(x) {
		let parent = x.parentNode;
		if (parent.children[1].firstElementChild.value == 'dayofweek' || parent.children[2].firstElementChild.value){
			let node = parent.cloneNode(true);
			node.children[0].firstElementChild.selectedIndex = parent.children[0].firstElementChild.selectedIndex;
			node.children[1].firstElementChild.selectedIndex = parent.children[1].firstElementChild.selectedIndex;
			node.children[2].firstElementChild.value = parent.children[2].firstElementChild.value;
			node.children[2].lastElementChild.selectedIndex = parent.children[2].lastElementChild.selectedIndex;
			node.children[3].className = 'remove';
			$('filterlist').firstElementChild.insertBefore(node, parent);
		}
	},
	
	removeFilter: function(x) {
		let parent = x.parentNode;
		let element = parent.children[0].firstElementChild;
		let text = element.options[element.selectedIndex].text;
		element = parent.children[1].firstElementChild;
		text += ' ' + element.options[element.selectedIndex].text;
		if (element.value == 'dayofweek'){
			element = parent.children[2].lastElementChild;
			text += ' ' + element.options[element.selectedIndex].text;
		} else{
			text += ' ' + parent.children[2].firstElementChild.value;
		}
		let check = confirm("Do you really want to remove the Filter\n" + text + " ?");
		if (check){
			$('filterlist').deleteRow(parent.rowIndex); 
		}
	},

	addBouquet: function(x) {
		let parent = x.parentNode;
		let node = parent.cloneNode(true);
		node.children[0].firstElementChild.selectedIndex = parent.children[0].firstElementChild.selectedIndex;
		node.children[1].className = 'remove';
		$('bouquetlist').firstElementChild.insertBefore(node, parent);
	},
	
	removeBouquet: function(x) {
		let parent = x.parentNode;
		let element = parent.children[0].firstElementChild;
		let text = element.options[element.selectedIndex].text;
		let check = confirm("Do you really want to remove the Bouquet\n" + text + " ?");
		if (check){
			$('bouquetlist').deleteRow(parent.rowIndex); 
		}
	},
		
	addService: function(x) {
		let parent = x.parentNode;
		let node = parent.cloneNode(true);
		// Check if service is not a marker
		// Service reference flags == isMarker (== 64)
		let reference = parent.children[1].firstElementChild.value;
		if (decodeURIComponent(reference).slice(2,4) != "64"){
			node.children[0].firstElementChild.selectedIndex = parent.children[0].firstElementChild.selectedIndex;
			node.children[1].firstElementChild.selectedIndex = parent.children[1].firstElementChild.selectedIndex;
			node.children[2].className = 'remove';
			$('servicelist').firstElementChild.insertBefore(node, parent);
		}
	},
	
	removeService: function(x) {
		let parent = x.parentNode;
		let element = parent.children[1].firstElementChild;
		let text = element.options[element.selectedIndex].text;
		let check = confirm("Do you really want to remove the Service\n" + text + " ?");
		if (check){
			$('servicelist').deleteRow(parent.rowIndex); 
		}
	},
	
	save: function() {
		//TODO Move to a separate class similar AutoTimerListEntry
		//TODO handle defaults
		let data = {}
		let selectList = $('list');
		let idx = selectList.selectedIndex;
		if (idx>=0){
			data['id'] = decodeURIComponent(selectList.options[idx].value);
			selectList.options[idx].className = ($('enabled').checked) ? 'enabled' : 'disabled';
		}
		data['enabled'] = ($('enabled').checked) ? '1' : '0';
		
		let options = ['match','name','encoding','searchType','searchCase','justplay','avoidDuplicateDescription'];
		for (let id = 0; id < options.length; id++) {
			if ($(options[id]).value == ''){
				core.notify('Error: ' + options[id] + ' is empty', false);
				return;
			}
			data[options[id]] = $(options[id]).value;
		}
		
		if ($('justplay').value > 0){
				data['setEndtime']            = ($('setEndtime').checked) ? '1' : '0';
		}
		
		data['overrideAlternatives'] = ($('overrideAlternatives').checked) ? '1' : '0';
		
		if ($('timespan').checked){
			options = ['from','to'];
			for (let id = 0; id < options.length; id++) {
				if ($(options[id]).value == ''){
					core.notify('Error: ' + options[id] + ' is empty', false);
					return;
				}
			}
			//WHY do we have to use timespanFrom instead of from?
			data['timespanFrom']            = $('from').value;
			data['timespanTo']              = $('to').value;
		} else{
			data['timespanFrom']            = '';
			data['timespanTo']              = '';
		}
		
		if ($('timeframe').checked){
			options = ['before','after'];
			for (let id = 0; id < options.length; id++) {
				if ($(options[id]).value == ''){
					core.notify('Error: ' + options[id] + ' is empty', false);
					return;
				}
			}
			data['before'] = toTimestamp($('before').value).toString();
			data['after']  = toTimestamp($('after').value).toString();
		} else{
			data['before']             = '';
			data['after']              = '';
		}
		
		if ($('offset').checked){
			if ($('offset').value == ''){
				core.notify('Error: offset is empty', false);
				return;
			}
			data['offset']                  = $('offsetbegin').value + ',' + $('offsetend').value;
		} else{
			data['offset']             = '';
		}
		
		if ($('maxdurationavailable').checked){
			if ($('maxduration').value == ''){
				core.notify('Error: maxduration is empty', false);
				return;
			}
			data['maxduration']             = $('maxduration').value;
		} else{
			data['maxduration']             = '';
		}
		
		let afterevent = $('afterevent').value;
		data['afterevent']              = afterevent;
		if ($('aftereventusetimespan').checked){
			data['aftereventFrom']        = $('aftereventFrom').value;
			data['aftereventTo']          = $('aftereventTo').value;
		}

		data['counter']                 = $('counter').value;		
		if ($('counter').value > 0){
			data['counterFormat']           = $('counterFormat').value;
			data['left']                    = $('left').value;
			let lastActivation = $('lastActivation').value;
			if (lastActivation) data['lastActivation'] = lastActivation;
			let lastBegin = $('lastBegin').value;
			if (lastBegin) data['lastBegin'] = lastBegin;
		}
		
		if ($('locationavailable').checked){
			if ($('location').value == ''){
				core.notify('Error: location is empty', false);
				return;
			}
			data['location']             = $('location').value;
		} else{
			data['location']             = '';
		}
		
		let tags = [];
		$$('.tags').each(function(element){
			let selected = element.readAttribute('data-selected');
			if(selected == "selected"){
				let value = element.readAttribute('data-value');
				tags.push(value);
			}
		});
		if (tags.length > 0){
			data['tag'] = tags;
		}else{
			data['tag'] = '';
		}
		
		let title = [];
		let shortdescription = [];
		let description = [];
		let dayofweek = [];
		let nottitle = [];
		let notshortdescription = [];
		let notdescription = [];
		let notdayofweek = [];
		if ($('usefilters').checked){
			$$('.filter').each(function(element){
				if (element.lastElementChild.className != 'add'){
					let where = element.children[1].firstElementChild.value;
					if (element.children[0].firstElementChild.value == 'include'){
						if (where == 'title' ) title.push(element.children[2].firstElementChild.value);
						if (where == 'shortdescription' ) shortdescription.push(element.children[2].firstElementChild.value);
						if (where == 'description' ) description.push(element.children[2].firstElementChild.value);
						if (where == 'dayofweek' ) dayofweek.push(element.children[2].lastElementChild.value);
					} else{
						if (where == 'title' ) nottitle.push(element.children[2].firstElementChild.value);
						if (where == 'shortdescription' ) notshortdescription.push(element.children[2].firstElementChild.value);
						if (where == 'description' ) notdescription.push(element.children[2].firstElementChild.value);
						if (where == 'dayofweek' ) notdayofweek.push(element.children[2].lastElementChild.value);
					}
				}
			});
		}
		if (title.length > 0){
			data['title'] = title;
		}else{
			data['title'] = '';
		}
		if (shortdescription.length > 0){
			data['shortdescription'] = shortdescription;
		}else{
			data['shortdescription'] = '';
		}
		if (description.length > 0){
			data['description'] = description;
		}else{
			data['description'] = '';
		}
		if (dayofweek.length > 0){
			data['dayofweek'] = dayofweek;
		}else{
			data['dayofweek'] = '';
		}
		if (nottitle.length > 0){
			data['!title'] = nottitle;
		}else{
			data['!title'] = '';
		}
		if (notshortdescription.length > 0){
			data['!shortdescription'] = notshortdescription;
		}else{
			data['!shortdescription'] = '';
		}
		if (notdescription.length > 0){
			data['!description'] = notdescription;
		}else{
			data['!description'] = '';
		}
		if (notdayofweek.length > 0){
			data['!dayofweek'] = notdayofweek;
		}else{
			data['!dayofweek'] = '';
		}
		
		let bouquets = [];
		if ($('usebouquets').checked){
			$$('.bouquet').each(function(element){
				if (element.lastElementChild.className != 'add'){
					let select = element.children[0].firstElementChild;
					bouquets.push( select.value );
				}
			});
		}
		data['bouquets'] = bouquets.join(',');
		
		let services = [];
		if ($('useservices').checked){
			$$('.service').each(function(element){
				if (element.lastElementChild.className != 'add'){
					let select = element.children[1].firstElementChild;
					services.push( select.value );
				}
			});
		}
		data['services'] = services.join(',');
		
		if ($('vps_enabled').checked){
			data['vps_enabled'] = ($('vps_enabled').checked) ? '1' : '0';
			data['vps_overwrite'] = ($('vps_overwrite').checked) ? '1' : '0';
		} else{
			data['vps_enabled'] = '0';
			data['vps_overwrite'] = '0';
		}
		
		if ($('series_labeling').checked){
			data['series_labeling'] = ($('series_labeling').checked) ? '1' : '0';
		} else{
			data['series_labeling'] = '0';
		}
		
		this.saveurl = [];
		for( let key in data ){
			let value = data[key];
			if (typeof(value)=='string'){
				this.saveurl.push( encodeURIComponent(key) + '=' + encodeURIComponent(data[key]) );
			} else if(typeof(value)=='object'&&(value instanceof Array)){
				let len = value.length;
				for (let i=0; i<len; i++){
					this.saveurl.push( encodeURIComponent(key) + '=' + encodeURIComponent(value[i]) );
				}
			}
		}
		this.saveurl = this.saveurl.join('&');
		//alert(this.saveurl);
		
		this.handler.save( this.saveurl, this.saveCallback.bind(this) );
	},
	saveCallback: function() {
		//autotimereditorcore.list.reload();
		let selectList = $('list');
		let idx = selectList.selectedIndex;
		if (idx>=0){
			// User changed an existing autotimer
			selectList.options[idx].text = '\u00A0' + $('name').value; // &nbsp;
			this.reload();
		}else{
			// User added a new autotimer
			autotimereditorcore.list.select = $('list').length+1;
			autotimereditorcore.list.load();
		}
	},
	
	cancel: function() {
		this.reload();
	},
	
	registerEvents: function(){
		$('justplay').on(
			'change',
			function(event, element){
				this.onchangeSelect(element);
			}.bind(this)
		);
		$('timespan').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('timeframe').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('offset').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('maxdurationavailable').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('afterevent').on(
			'change',
			function(event, element){
				this.onchangeSelectAfterEvent(element);
			}.bind(this)
		);
		$('aftereventusetimespan').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('counter').on(
			'change',
			function(event, element){
				this.onchangeSelect(element);
			}.bind(this)
		);
		$('locationavailable').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('taglist').on(
			'click',
			'.tags',
			function(event, element){
				this.changeTag(element);
				event.stop();
			}.bind(this)
		);
		$('usefilters').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('filterlist').on(
			'change',
			'.filterwhere', 
			function(event, element){
				this.onchangeSelectFilter(element);
			}.bind(this)
		);
		$('filterlist').on(
			'click',
			'.add', 
			function(event, element){
				this.addFilter(element);
			}.bind(this)
		);
		$('filterlist').on(
			'click',
			'.remove', 
			function(event, element){
				this.removeFilter(element);
			}.bind(this)
		);
		$('bouquetlist').on(
			'click',
			'.add', 
			function(event, element){
				this.addBouquet(element);
			}.bind(this)
		);
		$('bouquetlist').on(
			'click',
			'.remove', 
			function(event, element){
				this.removeBouquet(element);
			}.bind(this)
		);
		$('usebouquets').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('servicelist').on(
			'click',
			'.add', 
			function(event, element){
				this.addService(element);
			}.bind(this)
		);
		$('servicelist').on(
			'click',
			'.remove', 
			function(event, element){
				this.removeService(element);
			}.bind(this)
		);
		$('servicelist').on(
			'change',
			'.servicebouquet', 
			function(event, element){
				this.onchangeSelectBouquet(element);
			}.bind(this)
		);
		$('useservices').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('vps_enabled').on(
			'change',
			function(event, element){
				this.onchangeCheckbox(element);
			}.bind(this)
		);
		$('save').on(
			'click',
			function(event, element){
				this.save();
			}.bind(this)
		);
		$('cancel').on(
			'click',
			function(event, element){
				this.cancel();
			}.bind(this)
		);
	}
});

let AutoTimerPreviewController = Class.create(Controller, {
	initialize: function($super, target){
		$super(new AutoTimerPreviewHandler(target));
	},
	
	load: function(){
		$('list').selectedIndex = -1;
		$('headerautotimercontent').innerHTML = "AutoTimer Preview:";
		this.handler.load({});
	},
	
	onFinished: function(){},
	
	registerEvents: function(){}
});

let AutoTimerParseController = Class.create(Controller, {
	initialize: function($super, target){
		$super(new AutoTimerParseHandler(target));
	},
	
	load: function(){
		$('list').selectedIndex = -1;
		$('headerautotimercontent').innerHTML = "AutoTimer Parse:";
		this.handler.load(
			{},
			function(){
				// Maybe if autotimereditorcore.hasSeriesPlugin == "True" then wait a little
				autotimereditorcore.timers.loadList();
			}.bind(this));
	},
	
	onFinished: function(){},
	
	registerEvents: function(){}
});

let TimerController = Class.create({
	initialize: function(target){
		this.listHandler = new TimerListHandler(target);
		this.timerHandler = new TimerHandler(target, this.loadList.bind(this), []);
		this.registerEvents();
	},

	loadList: function(){
		$('list').selectedIndex = -1;
		$('headerautotimercontent').innerHTML = "Timer:";
		this.listHandler.load({});
	},

	registerEvents: function(){
		$('contentAutoTimerContent').on(
			'click',
			'.tListDelete',
			function(event, element){
				this.timerHandler.del(element);
				event.stop();
			}.bind(this)
		);
		$('contentAutoTimerContent').on(
			'click',
			'.tListToggleDisabled',
			function(event, element){
				this.timerHandler.toggleDisabled(element);
				event.stop();
			}.bind(this)
		);
		$('contentAutoTimerContent').on(
			'click',
			'.tListCleanup',
			function(event, element){
				this.listHandler.cleanup();
				return false;
			}.bind(this)
		);
	}
});

let AboutPage = Class.create({
	initialize: function(target){
		this.simpleHandler = new SimplePageHandler(target);
	},

	show: function(tpl, data){
		if(!data)
			data = {};
		this.simpleHandler.show(tpl, data);
	},

	load: function(){
		$('list').selectedIndex = -1;
		$('headerautotimercontent').innerHTML = "AutoTimer WebIf About:";
		this.show('tplAbout');
	},
});


///////////////////////////////////////////////////////////////////////////////
// Handler
let AbstractATContentHandler = Class.create(AbstractContentHandler,  {
	show: function(data){
		this.data = data;
		atTemplateEngine.process(this.tpl, data, this.target, this.finished.bind(this));
	}
});

let AutoTimerServiceListHandler = Class.create(AbstractATContentHandler, {
	initialize: function($super){
		$super(null, null);
		this.provider = new SimpleServiceListProvider (this.onReady.bind(this));
		this.ajaxload = false;
	},
	
	load: function( ref, callback ){
		this.callback = callback;
		this.provider.load(ref);
	},
	
	onReady: function(data){
		let services = {};
		let len = data.services.length;
		for (let i=0; i<len; i++){
			services[data.services[i].servicereference] = data.services[i].servicename;
		}
		if(typeof(this.callback) == "function"){
			this.callback(services);
		}
	}
});

let AutoTimerSettingsHandler = Class.create(AbstractATContentHandler, {
	initialize: function($super){
		$super(null, null);
		this.provider = new AutoTimerSettingsProvider(this.onReady.bind(this));
		this.ajaxload = false;
	},
	
	load: function( callback ){
		this.callback = callback;
		this.provider.load();
	},
	
	onReady: function(data){
		if(typeof(this.callback) == "function"){
			this.callback(data);
		}
	}
});

let AutoTimerMenuHandler = Class.create(AbstractATContentHandler,{
	initialize: function($super, target){
		$super('tplAutoTimerMenu', target);
		this.provider = new SimpleRequestProvider();
	},
	
	load: function(){
		this.show({});
	},
	
	backup: function(parms, callback){
		this.provider.simpleResultQuery(
			URL.backup,
			parms,
			function(callback, transport){
				this.provider.simpleResultCallback(transport, this.backupCallback.bind(this, callback));
			}.bind(this, callback));
	},
	backupCallback: function(callback, result){
		let text = result.getStateText();
		this.notify(text, result.getState());
		if(typeof(callback) == "function"){
			callback(text);
		}
	},

	restore: function(parms, callback){
		this.provider.simpleResultQuery(
			URL.restore,
			parms,
			function(callback, transport){
				this.provider.simpleResultCallback(transport, this.restoreCallback.bind(this, callback));
			}.bind(this, callback));
	},
	restoreCallback: function(callback, result){
		this.notify(result.getStateText(), result.getState());
		if(typeof(callback) == "function"){
			callback();
		}
	},
});

let AutoTimerListHandler  = Class.create(AbstractATContentHandler, {
	initialize: function($super, target){
		$super('tplAutoTimerList', target);
		this.provider = new AutoTimerListProvider(this.show.bind(this));
		this.ajaxload = true;
	},
	
	add: function(parms, callback){
		this.provider.simpleResultQuery(
			URL.add, 
			parms, 
			function(callback, transport){
				this.simpleResultCallback(transport, callback);
				if(typeof(callback) == "function"){
					callback();
				}
			}.bind(this, callback));
	},
	
	remove: function(parms, callback){
		this.provider.simpleResultQuery(
			URL.remove, 
			parms, 
			function(callback, transport){
				this.simpleResultCallback(transport, callback);
				if(typeof(callback) == "function"){
					callback();
				}
			}.bind(this, callback));
	},
});

let AutoTimerEditHandler = Class.create(AbstractATContentHandler, {
	initialize: function($super, target){
		$super('tplAutoTimerEdit', target);
		this.provider = new AutoTimerEditProvider(this.show.bind(this));
		this.ajaxload = true;
	},
	
	load: function( id ){
		this.requestStarted();
		this.parms = id;
		this.provider.load( id );
	},
	
	save: function(parms, callback){
		this.provider.simpleResultQuery(
			URL.edit, 
			parms, 
			function(callback, transport){
				this.simpleResultCallback(transport, callback);
				if(typeof(callback) == "function"){
					callback();
				}
			}.bind(this, callback));
	},
});

let AutoTimerPreviewHandler = Class.create(AbstractATContentHandler, {
	initialize: function($super, target){
		$super('tplAutoTimerPreview', target);
		this.provider = new AutoTimerPreviewProvider(this.show.bind(this));
		this.ajaxload = true;
	},
});

let AutoTimerParseHandler = Class.create(AbstractATContentHandler, {
	initialize: function($super, target){
		$super(null, target);
		this.provider = new SimpleRequestProvider();
		this.ajaxload = true;
	},
	
	load: function(parms, callback){
		this.requestStarted();
		this.provider.simpleResultQuery(
		URL.parse,
		parms,
		function(transport){
			this.simpleResultCallback.bind(this);
			if(callback)
				callback();
		}.bind(this));
	},
	
});

///////////////////////////////////////////////////////////////////////////////
// Provider
let AutoTimerSettingsProvider = Class.create(AbstractContentProvider, {
	initialize: function($super, showFnc){
		$super(URL.get, showFnc);
	},
	
	load: function( ){
		this.getUrl(this.url, null, this.loadCallback.bind(this), this.errorback.bind(this));
	},
	loadCallback: function(transport){
		let data = this.renderXML(this.getXML(transport));
		this.show(data);
	},
	renderXML: function(xml){
		this.settings = new AutoTimerSettings(xml).toJSON();
		return this.settings;
	},
});

let AutoTimerListProvider = Class.create(AbstractContentProvider, {
	initialize: function($super, showFnc){
		$super(URL.list, showFnc);
	},
	
	renderXML: function(xml){
		this.list = new AutoTimerList(xml).getList();
		return {list : this.list};
	},
	
	getAutoTimer: function(id){
		let autotimer = null;
		for (let idx in this.list) {
			if (this.list[idx].id == id){
				autotimer = this.list[idx];
				break;
			}
		}
		return autotimer;
	},
	
	getAutoTimerIndex: function(id){
		let idx = null;
		for (let i in this.list) {
			if (this.list[i].id == id){
				idx = i;
				break;
			}
		}
		return idx;
	}
});

let AutoTimerEditProvider = Class.create(AbstractContentProvider, {
	initialize: function($super, showFnc){
		$super(URL.list, showFnc);
	},
	
	load: function( id ){
		let callback = this.callback.bind(this, id);
		this.getUrl(this.url, null, callback, this.errorback.bind(this));
	},
	
	callback: function(id, transport){
		let data = this.renderXML(this.getXML(transport), id);
		this.show(data);
	},
	
	renderXML: function(xml, id){
		this.edit = new AutoTimerEdit(xml, id).getItem();
		return this.edit;
	},
});

let AutoTimerPreviewProvider = Class.create(AbstractContentProvider, {
	initialize: function($super, showFnc){
		$super(URL.preview, showFnc);
	},
	
	callback: function(transport){
		let data = this.renderXML(this.getXML(transport));
		this.show(data);
	},
	
	renderXML: function(xml){
		this.list = new AutoTimerPreview(xml).getList();
		return {list : this.list};
	},
});


///////////////////////////////////////////////////////////////////////////////
// Objects
function AutoTimerSettings(xml){
	this.xmlitems = getNamedChildren(xml, "e2settings", "e2setting");
	this.json = new Array();
	let len = this.xmlitems.length;
	for (let i=0; i<len; i++){
		let element = this.xmlitems[i].getElementsByTagName('e2settingname');
		let name = element[0].firstChild.nodeValue;
		element = this.xmlitems[i].getElementsByTagName('e2settingvalue');
		let value = element[0].firstChild.nodeValue;
		this.json[name] = value;
	}
	this.toJSON = function(){
		return this.json;
	};
}

function AutoTimerPreview(xml){
	this.xmlitems = getNamedChildren(xml, "e2autotimersimulate", "e2simulatedtimer");
	this.list = [];
		if(this.list.length === 0){
			let len = this.xmlitems.length;
			for (let i=0; i<len; i++){
				let xmlitem = this.xmlitems[i];
				let begin = new Date( getNodeContent(xmlitem, 'e2timebegin') * 1000 );
				let end = new Date( getNodeContent(xmlitem, 'e2timeend') * 1000 );
				let timer = {
					'name' :           getNodeContent(xmlitem, 'e2name'),
					'start' :          begin,
					'date' :           toReadableDate( begin ),
					'begin' :          toReadableTime( begin ),
					'end' :            toReadableTime( end ),
					'servicename' :    getNodeContent(xmlitem, 'e2servicename'),
					'autotimer' :      getNodeContent(xmlitem, 'e2autotimername'),
				};
				this.list.push(timer);
			}
			this.list.sort(sortAutoTimerByStart);
	}
	this.getList = function(){
			return this.list;
	};
}

function AutoTimerList(xml){
	this.xmlitems = getNamedChildren(xml, "autotimer", "timer");
	this.list = [];
		if(this.list.length === 0){
			let len = this.xmlitems.length;
			for (let i=0; i<len; i++){
				let autotimer = new AutoTimerListEntry(this.xmlitems.item(i)).toJSON();
				this.list.push(autotimer);
			}
		this.list.sort(sortAutoTimerByName);
		}
	this.getList = function(){
		return this.list;
	};
}

function AutoTimerListEntry(xml){
	// Extract only list relevant parts
	this.id = xml.getAttribute('id');
	this.enabled = xml.getAttribute('enabled');
	this.css = (this.enabled == 'yes') ? 'enabled' : 'disabled';
	this.name = xml.getAttribute('name');
	if ( (this.name == undefined) || (this.name == '') ){
		this.name = xml.getAttribute('match');
	}
	this.json = {
		'id' :                this.id,
		'enabled' :           this.enabled,
		'css' :               this.css,
		'name' :              this.name,
	};
	this.toJSON = function(){
		return this.json;
	};
}

function AutoTimerEdit(xml, id){
	this.xmldefaults = getNamedChildren(xml, "autotimer", "defaults");
	this.defaults = AutoTimerDefaults(this.xmldefaults.item(0));
	this.xmlitems = getNamedChildren(xml, "autotimer", "timer");
	this.autotimer = null;
	this.getItem = function(){
		let len = this.xmlitems.length;
		for (let i=0; i<len; i++){
			if (this.xmlitems.item(i).getAttribute('id') == id){
				this.autotimer = new AutoTimer(this.xmlitems.item(i), this.defaults).toJSON();
				break;
			}
		}
		if (this.autotimer==null){
			// Create empty AutoTimer with default values
			let newautotimer = autotimereditorcore.newautotimer;
			let timer = new Element('timer', newautotimer);
			let e2service = new Element('e2service');
			let e2servicename = new Element('e2servicename').update(newautotimer.e2servicename)
			let e2servicereference = new Element('e2servicereference').update(newautotimer.e2servicereference);
			e2service.appendChild( e2servicename );
			e2service.appendChild( e2servicereference );
			timer.appendChild( e2service );
			this.autotimer = new AutoTimer(timer, this.defaults).toJSON();
		}
		return this.autotimer;
	};
}

function AutoTimerDefaults(xml){	
	this.defaults = {}
	// Extract default values
	for (let i=0;i<xml.attributes.length;i++){
		this.defaults[xml.attributes[i].name] = xml.attributes[i].value;
	}
	return this.defaults;
}

function AutoTimer(xml, defaults){	
	// Items that must exist
	this.id = xml.getAttribute('id');
	this.enabled = (xml.getAttribute('enabled')=='yes') ? 'checked' : '';
	
	let name = xml.getAttribute('name');
	this.match = xml.getAttribute('match');
	this.name = (this.name == undefined) ? name : this.match;
	
	let encoding = getAttribute(xml, 'encoding', defaults);
	if (encoding==undefined) encoding = 'UTF-8';
	let options = ['ISO8859-15', 'UTF-8'];
	this.encoding = toOptionList(options, encoding);
	this.encoding.shift();

	// Items which only exists if they differ from the default value
	let searchType = getAttribute(xml, 'searchType', defaults);
	if (searchType==undefined) searchType = 'partial';
	options = {};
	options['partial'] = 'partial match';
	options['exact'] = 'exact match';
	options['description'] = 'description match';
	this.searchType = createOptionList(options, searchType);

	let searchCase = getAttribute(xml, 'searchCase', defaults);
	if (searchCase==undefined) searchCase = 'insensitive';
	options = {};
	options['sensitive'] = 'case-sensitive search';
	options['insensitive'] = 'case-insensitive search';
	this.searchCase = createOptionList(options, searchCase);

	let justplay = getAttribute(xml, 'justplay', defaults);
	if (justplay==undefined) justplay = 'record';
	options = {};
	options['0'] = 'record';
	options['1'] = 'zap';
	this.justplay = createOptionList(options, justplay);
	
	let setEndtime = getAttribute(xml, 'setEndtime', defaults);
	if (setEndtime==undefined || setEndtime=='1'){
		setEndtime = 'checked';
	}else{
		setEndtime = '';
	}
	this.setEndtime = setEndtime;
	
	this.overrideAlternatives = (getAttribute(xml, 'overrideAlternatives', defaults)) ? 'checked' : '';
	
	let from = getAttribute(xml, 'from', defaults);
	let to = getAttribute(xml, 'to', defaults);
	let usetimespan = '';
	if (xml.getAttribute('from')==undefined || xml.getAttribute('to')==undefined) {
		usetimespan = '';
	}else{
		usetimespan = (from || to) ? 'checked' : '';
	}
	if (from == undefined) from = '20:15';
	if (to == undefined) to = '23:15';
	this.timespan = {
		'usetimespan' : usetimespan,
		'from' : from,
		'to' : to,
	}	
	
	let after = getAttribute(xml, 'after', defaults);
	let before = getAttribute(xml, 'before', defaults);
	let usetimeframe = '';
	if (xml.getAttribute('after')==undefined || xml.getAttribute('before')==undefined) {
		usetimeframe = '';
	}else{
		usetimeframe = (before || after) ? 'checked' : '';
	}
	if (after == undefined) {
		after = new Date();
		after = new Date( after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate() + 7 );
	} else {
		after = new Date( after * 1000 )
	}
	if (before == undefined) {
		before = new Date();
	} else {
		before = new Date( before * 1000 )
	}
	this.timeframe = {
		'usetimeframe' : usetimeframe,
		'after' : toReadableDate( after ),
		'before' : toReadableDate( before ),
	}	
	
	let offset = getAttribute(xml, 'offset', defaults);
	let useoffset = (offset) ? 'checked' : '';
	if (offset != undefined) {
		offset = offset.split(',');
		if (offset.length!=2){
			offset = [offset, offset];
		}
	} else {
		offset = ['5','5'];
	}
	let begin = Number.parseInt(offset[0]);
	let end = Number.parseInt(offset[1]);
	this.offset = {
		'useoffset' : useoffset,
		'begin' : numericalOptionList(0, 100, begin),
		'end' : numericalOptionList(0, 100, end),
	}	
	
	let maxduration = getAttribute(xml, 'maxduration', defaults);
	let usemaxduration = (maxduration) ? 'checked' : '';
	if (maxduration == undefined) maxduration = 70;
	this.maxduration = {
		'usemaxduration' : usemaxduration,
		'maxduration' : numericalOptionList(0, 999, maxduration),
	}	
	
	let xmlafterevents = xml.getElementsByTagName('afterevent');
	let afterevent = '';
	let aftereventFrom = '';
	let aftereventTo = '';
	if (xmlafterevents.length > 0){
		let xmlafterevent = xmlafterevents.item(0);
		afterevent = xmlafterevent.firstChild.nodeValue;
		aftereventFrom = xmlafterevent.getAttribute('from');
		aftereventTo = xmlafterevent.getAttribute('to');
	}
	let useaftereventtimespan = (aftereventFrom || aftereventTo) ? 'checked' : '';
	if (aftereventFrom == undefined || aftereventFrom == '') aftereventFrom = '23:15';
	if (aftereventTo == undefined || aftereventTo =='') aftereventTo = '07:00';
	if (afterevent == '') afterevent = 'default';
	//TODO AutoTimer is a bit inconsistent: sometimes it is none or nothing
	if (afterevent == 'shutdown') afterevent = 'deepstandby';
	if (afterevent == 'none') afterevent = 'nothing';
	//ENDTODO
	options = {};
	options['default'] = 'Standard';
	options['nothing'] = 'Do nothing';
	options['standby'] = 'Go to Standby';
	options['deepstandby'] = 'Go to Deep Standby';
	options['auto'] = 'auto';
	this.afterevent = {
		'options' : createOptionList(options, afterevent),
		'usetimespan' : useaftereventtimespan,
		'from' : aftereventFrom,
		'to' : aftereventTo,
	}
	
	//TODO TEST lastactivation lastbegin
	let counter = getAttribute(xml, 'counter', defaults);
	let left = getAttribute(xml, 'left', defaults);
	let counterFormat = getAttribute(xml, 'counterFormat', defaults);
	let lastActivation = getAttribute(xml, 'lastActivation', defaults);
	let lastBegin = getAttribute(xml, 'lastBegin', defaults);
	if (counter==undefined) counter = 0;
	if (left == undefined) left = 0;
	if (counterFormat==undefined) counterFormat = '';
	let counterFormatOptions = {};
	counterFormatOptions[''] = 'Never';
	counterFormatOptions['%m'] = 'Monthly';
	counterFormatOptions['%U'] = 'Weekly (Sunday)';
	counterFormatOptions['%W'] = 'Weekly (Monday)';
	if (lastActivation == undefined  || lastActivation == '') {
		lastActivation = '';
	}else if (lastActivation == '0') {
		lastBegin = '0';
	}
	if (lastBegin == undefined || lastBegin == '') {
		lastBegin = '';
	}else if (lastBegin == '0') {
		lastBegin = '0';
	} else{
		lastBegin = toReadableDate(new Date( Number.parseInt(lastBegin) * 1000 ));
	}
	this.counter = {
		'options' : numericalOptionList(0, 100, counter),
		'left' : numericalOptionList(0, 100, left),
		'counterFormat' : createOptionList(counterFormatOptions, counterFormat),
		'lastActivation' : lastActivation,
		'lastBegin' : lastBegin,
	}

	let avoidDuplicateDescription = getAttribute(xml, 'avoidDuplicateDescription', defaults);
	if (avoidDuplicateDescription==undefined) avoidDuplicateDescription = '0';
	options = {};
	options['0'] = 'No';
	options['1'] = 'On same service';
	options['2'] = 'On any service';
	options['3'] = 'Any service/recording';
	this.avoidDuplicateDescription = createOptionList(options, avoidDuplicateDescription);

	let location = getAttribute(xml, 'location', defaults);
	let uselocation = (location) ? 'checked' : '';
	if (location == undefined) {
		location = '';
	}
	let l = toOptionList(autotimereditorcore.locations, location);
	l.shift();
	this.location = {
		'uselocation' : uselocation,
		'locations' : l,
	}
	
	let xmltags = xml.getElementsByTagName('e2tags');
	let tags = '';
	if (xmltags.length > 0){
		tags = xmltags.item(0).firstChild.nodeValue;
	}
	this.tags = toOptionList(autotimereditorcore.tags, tags, " ");
	this.tags.shift();
	
	let filters = [];
	let filtertags = ['include', 'exclude'];
	let tlen = filtertags.length;
	for (let t=0; t<tlen; t++){
		let xmlfilters = xml.getElementsByTagName(filtertags[t]);
		let len = xmlfilters.length;
		for (let i=0; i<len; i++){
			let text = xmlfilters.item(i).firstChild.nodeValue;
			let weekday = text;
			if (text in weekdays ){
				text = '';
			} else{
				weekday = '0';
			}
			
			filters.push({ 
				'type' : createOptionList(types, xmlfilters.item(i).nodeName),
				'where' : createOptionList(wheres, xmlfilters.item(i).getAttribute('where')),
				'text' : text,
				'weekdays' : createOptionList(weekdays, weekday),
				'class' : 'remove',
			});
		}
	}
	let usefilters = (filters.length > 0) ? 'checked' : '';
	filters.push({ 
		'type' : createOptionList(types, 'include'),
		'where' : createOptionList(wheres, 'title'),
		'text' : '',
		'weekdays' : createOptionList(weekdays, '0'),
		'class' : 'add',
	});
	this.filters = {
		'usefilters' : usefilters,
		'filters' : filters,
	}
	
	let bouquetoptions = createOptionList(autotimereditorcore.bouquets);
	let bouquets = [];
	let services = [];
	let xmlservices = xml.getElementsByTagName('e2service');
	let len = xmlservices.length;
	if (xmlservices){
		for (let i=0; i<len; i++){
			let name = xmlservices.item(i).getElementsByTagName('e2servicename');
			if(name.item(0).firstChild == null){
				name = '';
			}
			else{
				name = name.item(0).firstChild.nodeValue;
			}
			
			let reference = xmlservices.item(i).getElementsByTagName('e2servicereference');
			let firstChild = reference.item(0).firstChild;
			if (firstChild){
				reference = escape(firstChild.nodeValue);
				// Check if service is a bouquet
				// Service reference flags == isDirectory | mustDescent | canDescent (== 7)
				if (decodeURIComponent(reference).slice(2,3) == "7"){
					bouquets.push({
						'bouquet' : createOptionList(autotimereditorcore.bouquets, reference),
						'class' : 'remove',
					});
				}else{
					let service = [];
					let bouquet = bouquetoptions.slice(0);
					service.push({
							'value' : reference,
							'txt' : name,
							'selected' : 'selected'
						});
					//Maybe later: It is also possible to get the bouquet of the service
					bouquet.push({
							'value' : '',
							'txt' : '---',
							'selected' : 'selected'
						});
					services.push({ 
						'bouquet' : bouquet,
						'service' : service,
						'class' : 'remove',
					});
				}
			}
		}
	}
	
	let usebouquets = (bouquets.length > 0) ? 'checked' : '';
	bouquets.push({ 
		'bouquet' : bouquetoptions,
		'class' : 'add',
	});
	this.bouquets = {
		'usebouquets' : usebouquets,
		'bouquets' : bouquets,
	}
	
	let useservices = (services.length > 0) ? 'checked' : '';
	services.push({ 
		'bouquet' : bouquetoptions,
		'service' : bouquetoptions,
		'class' : 'add',
	});
	this.services = {
		'useservices' : useservices,
		'services' : services,
	}
	
	let hasVps = (autotimereditorcore.hasVps == "True") ? '' : 'invisible';
	let vps_enabled = (getAttribute(xml, 'vps_enabled', defaults)) ? 'checked' : '';
	let vps_overwrite = (getAttribute(xml, 'vps_overwrite', defaults)) ? 'checked' : '';
	this.vps = {
		'hasVPS' : hasVps,
		'vps_enabled' : vps_enabled,
		'vps_overwrite' : vps_overwrite,
	}
	
	let hasSeriesPlugin = (autotimereditorcore.hasSeriesPlugin == "True") ? '' : 'invisible';
	let series_labeling = (getAttribute(xml, 'series_labeling', defaults)) ? 'checked' : '';
	this.seriesplugin = {
		'hasSeriesPlugin' : hasSeriesPlugin,
		'series_labeling' : series_labeling,
	}
	
	this.json = { 	
			'id' :                    this.id,
			'enabled' :               this.enabled,
			'name' :                  this.name,
			'match' :                 this.match,
			'encoding' :              this.encoding,
			
			'searchType' :            this.searchType,
			'searchCase' :            this.searchCase,
			
			'justplay' :              this.justplay,
			'setEndtime' :            this.setEndtime,
			
			'overrideAlternatives' :  this.overrideAlternatives,
			'timespan' :              this.timespan,
			'timeframe' :             this.timeframe,
			'offset' :                this.offset,
			'maxduration' :           this.maxduration,
			
			'afterevent' :            this.afterevent,
			'counter' :               this.counter,
			
			'avoidDuplicateDescription' :  this.avoidDuplicateDescription,
			'location' :                   this.location,
			'tags' :                       this.tags,
			'filters' :                    this.filters,
			'bouquets' :                   this.bouquets,
			'services' :                   this.services,
			
			'vps' :                   this.vps,
			'seriesplugin' :          this.seriesplugin,
	};

	this.toJSON = function(){
		return this.json;
	};
}
