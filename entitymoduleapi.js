function EntityModuleAPI() {

	// environment! used for various functions
	this.environment = null;	// must be set manually

	//this.iostream = null;		// socket.io-stream module
}

// returns the Entity object with the specified id
EntityModuleAPI.prototype.getEntityById = function(id) {
	return this.environment.entities[id];
};

// returns an array if all modules associated with this entity
EntityModuleAPI.prototype.getModulesByEntityId = function(entity_id) {
	return this.environment.getModulesList(entity_id);
};

// focus camera!
EntityModuleAPI.prototype.focusCamera = function(position) {
	// TODO
};

// dispatch a message to all modules
EntityModuleAPI.prototype.dispatchMessage = function(message, data) {
	this.environment.dispatchMessage(message, data);
};

// dispatch a message to a specific entity
EntityModuleAPI.prototype.dispatchMessageToEntity = function(entity_id, message, data) {
	this.environment.dispatchMessageToEntity(entity_id, message, data);
};

// returns the geometry buffer for this entity
// there can only be one buffer by entity
//EntityModuleAPI.prototype.getGeometryBuffer = function(entity_id) {
	/*
	if(!this.geometry_buffers[entity_id]) {
		this.geometry_buffers[entity_id] = new GeometryBuffer();
	}
	return this.geometry_buffers[entity_id];
	*/
	//var buffer = this.getEntityById(entity_id).geometry_buffer;
	//buffer.changed = true;
	//return buffer;
//};

// a redrawn of the geometry by all associated modules will be done after this
//EntityModuleAPI.prototype.askGeometryRedraw = function(entity_id) {
//	this.getEntityById(entity_id).geometry_changed = true;
//};

// returns nearby entities
EntityModuleAPI.prototype.getNearbyEntities = function(entity_id) {
	return this.environment.getNearbyEntities(entity_id);
};

// sends data to socket by streaming
/*
EntityModuleAPI.prototype.streamData = function(socket, data) {
	var stream = this.iostream.createStream();
	this.iostream(socket).emit('geometry_data', stream, { blocks: null });
}
*/

// entity movement; new_pos is a [x,y,z] array; speed is in units/sec
EntityModuleAPI.prototype.moveEntity = function(entity_id, new_position, speed) {
	var entity = this.getEntityById(entity_id);
	entity.evalPosition();
	entity.state_counter++;
	entity.target_position = new_position;
	entity.last_eval_time = this.getTime();
	entity.speed = speed;
};

// record the fact that the entity has changed, and that it must be resent to clients
EntityModuleAPI.prototype.setChanged = function(entity_id) {
	var entity = this.getEntityById(entity_id);
	entity.state_counter++;
};

// returns the time since server launch, in seconds
EntityModuleAPI.prototype.getTime = function() {
	return Date.now() * 0.001;
};




// *****
// DRAWING INSTRUCTIONS
// *****

// these are the different kinds of drawing instructions
// for each, the list of parameters is explained here
// each parameter can be a number or a string

var DRAW_NONE 			= 0;	// not used
var DRAW_BOX 			= 1;	// posX | posY | posZ | rotX | rotY | rotZ | sizeX | sizeY | sizeZ | colR | colG | colB
var DRAW_DISC 			= 2;	// posX | posY | posZ | rotX | rotY | rotZ | radius | colR | colG | colB
var DRAW_SPHERE 		= 3;	// posX | posY | posZ | radius | colR | colG | colB
var DRAW_SPEECHBUBBLE 	= 4;	// posX | posY | posZ | content(string) - this is fire&forget, ie must only be sent once
var DRAW_CLICKBUBBLE 	= 5;	// posX | posY | posZ | colR | colG | colB | message(string) | content(string) - will sent back the message when clicked

// these functions append drawing instructions to a list

EntityModuleAPI.prototype.drawBox = function(instructions_list, posX, posY, posZ, rotX, rotY, rotZ, sizeX, sizeY, sizeZ, colR, colG, colB) {
	instructions_list.push([DRAW_BOX, posX, posY, posZ, rotX, rotY, rotZ, sizeX, sizeY, sizeZ, colR, colG, colB]);
};
EntityModuleAPI.prototype.drawDisc = function(instructions_list, posX, posY, posZ, rotX, rotY, rotZ, radius, colR, colG, colB) {
	instructions_list.push([DRAW_DISC, posX, posY, posZ, rotX, rotY, rotZ, radius, colR, colG, colB]);
};
EntityModuleAPI.prototype.drawSphere = function(instructions_list, posX, posY, posZ, radius, colR, colG, colB) {
	instructions_list.push([DRAW_SPHERE, posX, posY, posZ, radius, colR, colG, colB]);
};
EntityModuleAPI.prototype.fireSpeechBubble = function(instructions_list, posX, posY, posZ, content) {
	instructions_list.push([DRAW_SPEECHBUBBLE, posX, posY, posZ, content]);
};
EntityModuleAPI.prototype.drawClickBubble = function(instructions_list, posX, posY, posZ, colR, colG, colB, message, content) {
	instructions_list.push([DRAW_CLICKBUBBLE, posX, posY, posZ, rotX, colR, colG, colB, message, content]);
};




// export module
module.exports = new EntityModuleAPI();