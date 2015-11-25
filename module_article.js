module.exports = function(entity_module_builder) {

entity_module_builder.registerModule(

	"article",
	"this module handles editing and displaying text articles written in markdown",

	function(module) {

		// overriding respond function
		module.respondToMessage = function(message, data) {};

	},
	
	[]		// registered channels
);

};