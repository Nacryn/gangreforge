
// ****
// ENTITY OBJECT
// ****

function Entity(id) {
	this.id = id;
	this.position = {x: 0, y: 0, z: 0};
	this.geometry_buffer = new GeometryBuffer();
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

	this.createNewEntity("bob").position = {x: 4, y:0, z:0};
	this.createNewEntity("bob2").position = {x: 4, y:0, z:4};
	this.createNewEntity("test").position = {x: -4, y:0, z:4};
	this.createNewEntity("aaaaaa").position = {x: -4, y:0, z:-4};
	this.createNewEntity("aaaaaa2").position = {x: 4, y:0, z:-4};
	this.createNewEntity("aaaaaa3").position = {x: 0, y:0, z:-4};

	for(var i=0; i<100; i++) {
		this.createNewEntity("entity"+i).position = {x: Math.random()*20-10 , y:0, z: Math.random()*20-10};
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

	// compute time delta in sec
	var now = Date.now();
	if(this.last_update_time == -1) { this.delta_time = 0; }
	else { this.delta_time = now - this.last_update_time; }
	this.last_update_time = now;

	// update order
	this.dispatchMessage("update", { time_delta: this.delta_time });

	// refresh&send geometry order (require buffers to be set/reset)
	var entity_id;
	for(entity_id in this.entities) { this.entities[entity_id].geometry_buffer.start(); }
	this.dispatchMessage("refresh_geometry", {});
	this.dispatchMessage("send_geometry", {});
	for(entity_id in this.entities) { this.entities[entity_id].geometry_buffer.end(); }


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
		this.entity_modules.push(module);
	}
	return module;
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

// returns an array of modules attached ton this entity
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



// *****
// GEOMETRY BUILDING
// *****

// geometry buffers are objects that handle geometry "drawing"
// internally, they use a collection of geometry blocks of fixed size
// each entity must have one (and only one) of these
function GeometryBuffer() {

	// blocks are created along the way when redrawing the geometry
	this.blocks = [new GeometryBlock()];
	this.current_block = null;
	this.block_cursor = -1;
	this.changed = true;

	// this is used to keep track of where we are in geometry building
	// every three position or index, we're finished a vertex and need
	// to make sure we can make another one
	this.new_vertex_counter = 3;
	this.new_triangle_counter = 3;
}

// reset cursors: we're ready for refilling the buffers
GeometryBuffer.prototype.start = function() {
	this.current_block = this.blocks[0];
	this.block_cursor = 0;
	this.current_block.positions_cursor = 0;
	this.current_block.normals_cursor = 0;
	this.current_block.colors_cursor = 0;
	this.current_block.indices_cursor = 0;
};

// we're done filling the buffers
GeometryBuffer.prototype.end = function() {
	// release unused blocks
	
	// do we really nooed to dispose blocks... ?
	//var i;
	// for(i = this.blocks.length-1; i > this.block_cursor; i--) {
	// 	this.blocks[i].dispose();
	// }

	// remove excess blocks
	this.blocks.splice(this.block_cursor + 1, this.blocks.length);

	this.changed = false;
};

// used for sending data to client
GeometryBuffer.prototype.appendBlocksData = function(array) {
	for(var i=0; i<this.blocks.length; i++) { array.push(this.blocks[i].exposeData()); }
	return array;
};

// returns the current amount of vertices injected in the buffer
//GeometryBuffer.prototype.getVertexCount = function() { return this.positions_cursor / 3; }
//GeometryBuffer.prototype.getTriangleCount = function() { return this.indices_cursor / 3; }
GeometryBuffer.prototype.getBaseIndex = function() {
	return this.current_block.positions_cursor / 3;
};

// these functions make sure that there is enough space in the current block, otherwise they add a new one
GeometryBuffer.prototype.prepareNewVertex = function() {
	if(this.current_block.positions_cursor >= GEOMETRYBLOCK_VERTEX_COUNT * 3) {
		this.jumpToNextBlock();
	}
};
GeometryBuffer.prototype.prepareNewTriangle = function() {
	if(this.current_block.indices_cursor >= GEOMETRYBLOCK_TRIANGLE_COUNT * 3) {
		this.jumpToNextBlock();
	}
};

GeometryBuffer.prototype.jumpToNextBlock = function() {
		this.block_cursor++;
		if(this.block_cursor >= this.blocks.length) {
			this.current_block = new GeometryBlock();
			this.blocks.push(this.current_block);
		} else {
			this.current_block = this.blocks[this.block_cursor];
			this.current_block.positions_cursor = 0;
			this.current_block.normals_cursor = 0;
			this.current_block.colors_cursor = 0;
			this.current_block.indices_cursor = 0;
		}
};

// short methods for adding a position, normal, color, index
GeometryBuffer.prototype.p = function(x, y, z) {
	this.current_block.positions[this.current_block.positions_cursor++] = x;
	this.current_block.positions[this.current_block.positions_cursor++] = y;
	this.current_block.positions[this.current_block.positions_cursor++] = z;
	this.new_vertex_counter--;
	if(this.new_vertex_counter === 0) {
		this.prepareNewVertex();
		this.new_vertex_counter = 3;
	}
};
GeometryBuffer.prototype.n = function(x, y, z) {
	this.current_block.normals[this.current_block.normals_cursor++] = x;
	this.current_block.normals[this.current_block.normals_cursor++] = y;
	this.current_block.normals[this.current_block.normals_cursor++] = z;
};
GeometryBuffer.prototype.c = function(r, g, b, a) {
	this.current_block.colors[this.current_block.colors_cursor++] = r;
	this.current_block.colors[this.current_block.colors_cursor++] = g;
	this.current_block.colors[this.current_block.colors_cursor++] = b;
	this.current_block.colors[this.current_block.colors_cursor++] = a;
};
GeometryBuffer.prototype.i = function(f0, f1, f2) {
	this.prepareNewTriangle();
	this.current_block.indices[this.current_block.indices_cursor++] = f0;
	this.current_block.indices[this.current_block.indices_cursor++] = f1;
	this.current_block.indices[this.current_block.indices_cursor++] = f2;
	this.new_triangle_counter--;
	if(this.new_triangle_counter === 0) {
		this.prepareNewTriangle();
		this.new_triangle_counter = 3;
	}
};


// geometry drawing functions

// sx, sy and sz are dimensions in these axis
// TODO: allow rotation?
GeometryBuffer.prototype.drawBox = function(x, y, z, r, g, b, sx, sy, sz) {
	var base_index = this.getBaseIndex();

	this.p(-sx/2+x,  sy/2+y,  sz/2+z); this.p(-sx/2+x,  sy/2+y, -sz/2+z); this.p( sx/2+x,  sy/2+y, -sz/2+z); this.p( sx/2+x,  sy/2+y,  sz/2+z);		// Y+
	this.p( sx/2+x, -sy/2+y,  sz/2+z); this.p( sx/2+x, -sy/2+y, -sz/2+z); this.p(-sx/2+x, -sy/2+y, -sz/2+z); this.p(-sx/2+x, -sy/2+y,  sz/2+z);		// Y-
	this.p( sx/2+x,  sy/2+y,  sz/2+z); this.p( sx/2+x,  sy/2+y, -sz/2+z); this.p( sx/2+x, -sy/2+y, -sz/2+z); this.p( sx/2+x, -sy/2+y,  sz/2+z);		// X+
	this.p(-sx/2+x, -sy/2+y,  sz/2+z); this.p(-sx/2+x, -sy/2+y, -sz/2+z); this.p(-sx/2+x,  sy/2+y, -sz/2+z); this.p(-sx/2+x,  sy/2+y,  sz/2+z);		// X-
	this.p( sx/2+x,  sy/2+y,  sz/2+z); this.p( sx/2+x, -sy/2+y,  sz/2+z); this.p(-sx/2+x, -sy/2+y,  sz/2+z); this.p(-sx/2+x,  sy/2+y,  sz/2+z);		// Z+
	this.p(-sx/2+x,  sy/2+y, -sz/2+z); this.p(-sx/2+x, -sy/2+y, -sz/2+z); this.p( sx/2+x, -sy/2+y, -sz/2+z); this.p( sx/2+x,  sy/2+y, -sz/2+z);		// Z-

	this.n( 0,  1,  0); this.n( 0,  1,  0); this.n( 0,  1,  0); this.n( 0,  1,  0);
	this.n( 0, -1,  0); this.n( 0, -1,  0); this.n( 0, -1,  0); this.n( 0, -1,  0);
	this.n( 1,  0,  0); this.n( 1,  0,  0); this.n( 1,  0,  0); this.n( 1,  0,  0);
	this.n(-1,  0,  0); this.n(-1,  0,  0); this.n(-1,  0,  0); this.n(-1,  0,  0);
	this.n( 0,  0,  1); this.n( 0,  0,  1); this.n( 0,  0,  1); this.n( 0,  0,  1);
	this.n( 0,  0, -1); this.n( 0,  0, -1); this.n( 0,  0, -1); this.n( 0,  0, -1);

	this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1);
	this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1);
	this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1);
	this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1);
	this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1);
	this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1); this.c(r, g, b, 1);

	this.i(base_index,    base_index+1,  base_index+2 ); this.i(base_index+2,  base_index+3,  base_index   );
	this.i(base_index+4,  base_index+5,  base_index+6 ); this.i(base_index+6,  base_index+7,  base_index+4 );
	this.i(base_index+8,  base_index+9,  base_index+10); this.i(base_index+10, base_index+11, base_index+8 );
	this.i(base_index+12, base_index+13, base_index+14); this.i(base_index+14, base_index+15, base_index+12);
	this.i(base_index+16, base_index+17, base_index+18); this.i(base_index+18, base_index+19, base_index+16);
	this.i(base_index+20, base_index+21, base_index+22); this.i(base_index+22, base_index+23, base_index+20);
};

// a disc is originally facing Y+
// rd is radius
var CIRCLE_SUBDIVISIONS = 12;
GeometryBuffer.prototype.drawDisc = function(x, y, z, r, g, b, rd) {
	var base_index = this.getBaseIndex();
	var i;

	this.p(x,y,z);
	this.c(r, g, b, 1);
	this.n(0, 1, 0);
	for(i=0; i<CIRCLE_SUBDIVISIONS; i++) {
		this.p(x+rd*Math.cos(i/CIRCLE_SUBDIVISIONS * Math.PI * 2), y, z+rd*Math.sin(i/CIRCLE_SUBDIVISIONS * Math.PI * 2));
		this.c(r, g, b, 1);
		this.n(0, 1, 0);

		if(i < CIRCLE_SUBDIVISIONS-1) { this.i(base_index, base_index + i + 1, base_index + i + 2); }
		else { this.i(base_index, base_index + i + 1, base_index + 1); }
	}

};


// used for blocks id
var shortid = require('shortid');

var GEOMETRYBLOCK_VERTEX_COUNT = 300;
var GEOMETRYBLOCK_TRIANGLE_COUNT = 100;

// geometry blocks hold geometry data (incl. indices)
// they are serializable so they can be sent to the client
function GeometryBlock() {
	this.id = shortid.generate();

	this.positions = new Float32Array(GEOMETRYBLOCK_VERTEX_COUNT * 3);
	this.normals = new Float32Array(GEOMETRYBLOCK_VERTEX_COUNT * 3);
	this.colors = new Float32Array(GEOMETRYBLOCK_VERTEX_COUNT * 4);
	this.indices = new Uint32Array(GEOMETRYBLOCK_TRIANGLE_COUNT * 3);

	this.positions_cursor = 0;
	this.normals_cursor = 0;
	this.colors_cursor = 0;
	this.indices_cursor = 0;
}

// serialize method (not used)
//GeometryBlock.prototype.toJSON = function() {
//};

// used for sending this data to the client
GeometryBlock.prototype.exposeData = function() {
	return { id: this.id, positions: this.positions, normals: this.normals, colors: this.colors, indices: this.indices };
};

// placeholder (unused)
// GeometryBlock.prototype.dispose() { }





// export module
module.exports = function(entity_module_builder) {
	return new Environment(entity_module_builder);
};