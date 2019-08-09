const control = require('./control');

exports.handler = async (event) => {
	try {
		// let string = await control.RunSelect();
		await control.main();
		
		const response = {
			statusCode: 200,
			body: JSON.stringify('success'),
		};
		return response;
	}
	catch(e) {
		const response = {
			statusCode: 403,
			body: JSON.stringify(e),
		};
		return response;
	}
	
}