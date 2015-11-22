
// ****
// ENTITY OBJECT
// ****

function Entity(id) {
	this.id = id;
	this.position = {x: 0, y: 0, z: 0};
}


// ****
// ENVIRONMENT OBJECT
// ****

// parameters
var GRID_WIDTH_LARGE = 2.0;
var GRID_WIDTH_SMALL = 1.0;
var GRID_LENGTH_LARGE = 20.0;
var GRID_LENGTH_SMALL = 12.0;
//var GRID_COLOR = new BABYLON.Color3(0.2, 0.2, 0.2);
var GRID_COLOR = 0.2;		// gray level...

var UPDATE_DELTA_TIME = 0.5;		// seconds

var instance;	// singleton

function Environment(entity_module_builder) {

	// this list contains all entities
	// entities are indexed by their id (a string)
	this.entities = {};

	// this array contains all the entity modules
	this.entity_modules = [];

	// this is the time since the last update
	this.delta_time = 0;
	this.last_update_time = -1;

	// this is the entity module factory
	this.module_builder = entity_module_builder;

	// register singleton
	instance = this;
}

Environment.prototype.init = function() {

	// add entities (temp)

	this.createNewEntity("bob");
	this.entities["bob"].position = {x: 4, y:0, z:12};
	this.createNewEntity("bob2");
	this.entities["bob2"].position = {x: 2, y:0, z:1};
	this.createNewEntity("test");
	this.entities["test"].position = {x: -7, y:0, z:5};
	this.createNewEntity("aaaaaa");
	this.entities["aaaaaa"].position = {x: -11, y:0, z:-15};
	this.createNewEntity("aaaaaa2");
	this.entities["aaaaaa2"].position = {x: -15, y:0, z:7};
	this.createNewEntity("aaaaaa3");
	this.entities["aaaaaa3"].position = {x: 21, y:0, z:-2};


	// add modules to these entities
	this.attachModuleToEntity("bob", "appearance");
	this.attachModuleToEntity("bob2", "client");
	this.attachModuleToEntity("bob2", "appearance");
	this.attachModuleToEntity("test", "appearance");
	this.attachModuleToEntity("aaaaaa", "appearance");
	this.attachModuleToEntity("aaaaaa", "article");
	// this.attachModuleToEntity("aaaaaa", "client");
	this.attachModuleToEntity("aaaaaa2", "appearance");
	this.attachModuleToEntity("aaaaaa3", "appearance");


	// stress test
	/*
	for(var i=0; i<10000; i++) {
		this.entities[i] = new Entity(i);
	}
	*/
}

Environment.prototype.update = function() {

	//console.log("updating...");

	// TODO: implement grid drawing
	//this.drawGrid(this.buffer);

	// compute time delta in sec
	var now = Date.now();
	if(this.last_update_time == -1) { this.delta_time = 0; }
	else { this.delta_time = now - this.last_update_time; }
	this.last_update_time = now;

	// regular messages
	this.dispatchMessage("update", { time_delta: this.delta_time });
	this.dispatchMessage("display", {});


	// reschedule update
	setTimeout(function() { instance.update() }, UPDATE_DELTA_TIME * 1000);
}


// collections manipulation
Environment.prototype.createNewEntity = function(entity_id) {
	this.entities[entity_id] = new Entity(entity_id);
}
Environment.prototype.attachModuleToEntity = function(entity_id, module_name) {
	var module = this.module_builder.createModule(module_name);
	if(module) {
		module.entity_id = entity_id;
		this.entity_modules.push(module);
	}
}


// this sends a message to all entity modules
// message is a string, data is an object
Environment.prototype.dispatchMessage = function(message, data) {
	for(var i=0; i<this.entity_modules.length; i++) {
		this.entity_modules[i].respondToMessage(message, data);
	}
}

// dispatch a message only to a certain entity
Environment.prototype.dispatchMessageToEntity = function(entity_id, message, data) {
	for(var i=0; i<this.entity_modules.length; i++) {
		if(this.entity_modules[i].entity_id == entity_id) {
			this.entity_modules[i].respondToMessage(message, data);
		}
	}
}

// returns an array of modules attached ton this entity
Environment.prototype.getModulesList = function(entity_id) {
	var result = [];
	for(var i=0; i<this.entity_modules.length; i++) {
		if(this.entity_modules[i].entity_id == entity_id) {
			result.push(this.entity_modules[i]);
		}
	}
	return result;
}

// export module
module.exports = function(entity_module_builder) {
	return new Environment(entity_module_builder);
};