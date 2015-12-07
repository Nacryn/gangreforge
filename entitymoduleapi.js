function EntityModuleAPI() {

	// environment! used for various functions
	this.environment = null;	// must be set manually

	//this.iostream = null;		// socket.io-stream module
}

// returns the Entity object with the specified id
EntityModuleAPI.prototype.getEntityById = function(id) {
	return this.environment.entities[id];
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
// WARNING: when doing this, the buffer is marked as changed
EntityModuleAPI.prototype.requestGeometryBuffer = function(entity_id) {
	/*
	if(!this.geometry_buffers[entity_id]) {
		this.geometry_buffers[entity_id] = new GeometryBuffer();
	}
	return this.geometry_buffers[entity_id];
	*/
	var buffer = this.getEntityById(entity_id).geometry_buffer;
	buffer.changed = true;
	return buffer;
};

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

// returns the time since server launch, in seconds
EntityModuleAPI.prototype.getTime = function() {
	return Date.now() * 0.001;
};


// export module
module.exports = new EntityModuleAPI();