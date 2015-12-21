module.exports = function(entity_module_builder) {

entity_module_builder.registerModule(

	"article",
	"this module handles editing and displaying text articles written in markdown",

	function(module) {

		// overriding respond function
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

	},
	
	[]		// registered channels
);

};