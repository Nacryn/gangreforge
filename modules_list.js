
// this module requires registering script for all module types
// new types must be added here

module.exports = function(entity_module_builder) {

	require('./module_appearance')(entity_module_builder);
	require('./module_article')(entity_module_builder);
	require('./module_client')(entity_module_builder);

}