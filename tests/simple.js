const { DonNode } = require('../lib');

module.exports = function simple() {
	debugger;

	const object = {
		foo: 'bar',
		fizz: 'buzz',
	};

	const json = JSON.stringify(object);

	const don = DonNode.decode(json);

	const encoded = don.toString();

	console.error(encoded);
};
