(function() {
	module.exports = function(D) {
		require('./lib/vdom')(D);
		return D.dom;
	};
})();
