module.exports = function(entity_module_builder) {

entity_module_builder.registerModule(

	"appearance",
	"this module handles displaying shapes in the 3D scene and detecting click/hover",

	function(module) {

		// overriding respond function
		module.respondToMessage = function(message, data) {}

	},
	
	[]		// registered channels
);

}