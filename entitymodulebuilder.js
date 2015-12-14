// ****
// MODULE OBJECT
// ****

// an entity module is associated to one, and only one entity in the environment
// its behavior has to be implemented exclusively in the respondToMessage function

function EntityModule(entity_module_api) {

	// which entity this module is attached to (defined when added to environment collection)
	this.entity_id = "";

	// a reference to the module API
	this.API = entity_module_api;

	// rank of the module on the entity it is attached to
	this.rank = -1;

	// this function has to be overriden to implement custom behavior
	// message is a string and data is an object
	this.respondToMessage = function(message, data) {

		switch(message) {

			// inspector panel request
			// we send back to the socket the contents of our block
			case "inspector_panel":
			data.socket.emit("inspector_panel_block", {
				elements: [
					this.API.outputPlainText("This is a blank module")
				],
				rank: this.rank
			});
			break;

		}

	};

	// this function has to be overriden to implement rendering
	// drawing instructions must be added to the list with the API 
	this.appendDrawingInstructions = function(instructions_list) {};
}




// ****
// MODULE CREATION
// ****

// this static object adds new modules to the environment
function EntityModuleBuilder(entity_module_api) {

	// a dictionary of all the module build functions
	this.module_build_functions = {};

	// module descriptions
	this.module_descriptions = {};

	// a reference to the module API
	this.module_api = entity_module_api;
}

// todo: store which module registered for which channel

// entity_id is a string, module_name is a string
// the created module is returned
EntityModuleBuilder.prototype.createModule = function(module_name) {

	// checking if a build function is available
	if(!this.module_build_functions[module_name]) {
		console.error("no builder found for module: "+module_name);
		return null;
	}

	// module creation
	var new_module = new EntityModule(this.module_api);
	this.module_build_functions[module_name](new_module);

	return new_module;
};

// this is used to register custom modules in the builder
// module_name is a string
// description is a string
// build_function is the function that will be called when a new module of that type is built;
//   a blank EntityModule is passed as an argument to this function
// channels is an array of string, representing messages for which the module registers
//   (this is not yet functional)
EntityModuleBuilder.prototype.registerModule = function(module_name, description, build_function, channels) {

	// foolproof check
	if(this.module_build_functions[module_name]) {
		console.error("module already registered: "+module_name);
		return;
	}

	// registering build function & description
	this.module_build_functions[module_name] = build_function;
	this.module_descriptions[module_name] = description;
};


// export module
module.exports = function(entity_module_api) {
	return new EntityModuleBuilder(entity_module_api);
};