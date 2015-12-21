var math = require('mathjs');


// ****
// ENTITY OBJECT
// ****

function Entity(id) {
	this.id = id;
	this.position = [0, 0, 0];

	// this an array of drawing instructions for the client; see DRAW_* vars
	this.drawing_instructions = [];

	// this is increased everytime the entity changes (ie position, movement)
	this.state_counter = 0;

	// this is for planned movement
	this.target_position = [0, 0, 0];
	this.last_eval_time = -1;
	this.speed = 0;		// unit/sec (not used)

	// amount of modules attached; used to determine rank
	this.module_count = 0;
}

// simple update function
Entity.prototype.update = function() {

};

// evaluate position based on planned movement
Entity.prototype.evalPosition = function() {
	if(this.last_eval_time > 0) {
		var new_time = Date.now() * 0.001;
		var diff = math.subtract(this.target_position, this.position);
		var diff_len = math.norm(diff);
		var step_dist = (new_time - this.last_eval_time) * this.speed;

		if(step_dist >= diff_len) {
			// we're there
			this.position = this.target_position;
			this.last_eval_time = -1;
		} else {

			// normalize & scale by speed
			diff = math.dotDivide(diff, diff_len);
			diff = math.dotMultiply(diff, step_dist);

			this.position = math.add(this.position, diff);
			this.last_eval_time = new_time;
		}
	}
};


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

var UPDATE_DELTA_TIME = 0.1;		// seconds

var instance;	// singleton

function Environment(entity_module_builder) {

	// this list contains all entities
	// entities are indexed by their id (a string)
	// TODO: index entities in quadtree
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

	this.createNewEntity("bob").position = [4, 0, 0];
	this.createNewEntity("bob2").position = [2, 0, 0];
	this.createNewEntity("test").position = [0, 0, 4];
	this.createNewEntity("aaaaaa").position = [0, 0, 2];
	this.createNewEntity("aaaaaa2").position = [-4, 0, 0];
	this.createNewEntity("aaaaaa3").position = [0, 0, -4];

	for(var i=0; i<50; i++) {
		this.createNewEntity("entity"+i).position = [Math.random()*40-20, 0, Math.random()*40-20];
		this.attachModuleToEntity("entity"+i, "appearance");
	}


	// add modules to these entities
	this.attachModuleToEntity("bob", "appearance");
	this.attachModuleToEntity("bob2", "appearance");
	this.attachModuleToEntity("test", "appearance");
	this.attachModuleToEntity("aaaaaa", "appearance");
	this.attachModuleToEntity("aaaaaa", "article");
	this.attachModuleToEntity("aaaaaa2", "appearance");
	this.attachModuleToEntity("aaaaaa3", "appearance");


	// stress test
	/*
	for(var i=0; i<10000; i++) {
		this.entities[i] = new Entity(i);
	}
	*/
};

Environment.prototype.update = function() {

	//console.log("updating...");

	// TODO: implement grid drawing
	//this.drawGrid(this.buffer);

	var entity_id;

	// compute time delta in sec
	var now = Date.now();
	if(this.last_update_time == -1) { this.delta_time = 0; }
	else { this.delta_time = now - this.last_update_time; }
	this.last_update_time = now;

	// update entities
	for(entity_id in this.entities) { this.entities[entity_id].update(); }

	// update order for modules
	this.dispatchMessage("update", { time_delta: this.delta_time });
	this.dispatchMessage("late_update", { time_delta: this.delta_time });

	// reschedule update
	setTimeout(function() { instance.update(); }, UPDATE_DELTA_TIME * 1000);
};


// collections manipulation
Environment.prototype.createNewEntity = function(entity_id) {
	var new_entity = new Entity(entity_id);
	this.entities[entity_id] = new_entity;
	return new_entity;
};
Environment.prototype.attachModuleToEntity = function(entity_id, module_name) {
	var module = this.module_builder.createModule(module_name);
	if(module) {
		module.entity_id = entity_id;
		module.rank = this.entities[entity_id].module_count++;
		this.entity_modules.push(module);
	}
	return module;
};
Environment.prototype.deleteEntity = function(entity_id) {
	// remove modules
	for(var i=0; i<this.entity_modules.length; i++) {
		if(this.entity_modules[i].entity_id == entity_id) {
			this.entity_modules.splice(i, 1);
			i--;
		}
	}
	//remove entity
	this.entities[entity_id] = null;
	delete this.entities[entity_id];
};


// this sends a message to all entity modules
// message is a string, data is an object
Environment.prototype.dispatchMessage = function(message, data) {
	for(var i=0; i<this.entity_modules.length; i++) {
		this.entity_modules[i].respondToMessage(message, data);
	}
};

// dispatch a message only to a certain entity
Environment.prototype.dispatchMessageToEntity = function(entity_id, message, data) {
	for(var i=0; i<this.entity_modules.length; i++) {
		if(this.entity_modules[i].entity_id == entity_id) {
			this.entity_modules[i].respondToMessage(message, data);
		}
	}
};

// returns an array of modules attached to this entity
Environment.prototype.getModulesList = function(entity_id) {
	var result = [];
	for(var i=0; i<this.entity_modules.length; i++) {
		if(this.entity_modules[i].entity_id == entity_id) {
			result.push(this.entity_modules[i]);
		}
	}
	return result;
};

// returns entities close to the specified one, i.e. in the same quadtree cell
// TODO: actually implement quadtree
Environment.prototype.getNearbyEntities = function(entity_id) {
	var entities = [];
	var id;
	for(id in this.entities) { entities.push(this.entities[id]); }
	return entities;
};



// export module
module.exports = function(entity_module_builder) {
	return new Environment(entity_module_builder);
};