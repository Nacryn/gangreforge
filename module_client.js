var CLIENT_MOVE_SPEED = 10;	// by sec

module.exports = function(entity_module_builder) {

entity_module_builder.registerModule(

	"client",
	"this module handles client interaction in the scene",

	function(module) {

		// overriding respond function
		module.respondToMessage = function(message, data) {}

	},
	
	[]		// registered channels
);

}