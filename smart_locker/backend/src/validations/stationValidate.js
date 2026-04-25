function parseLocation(body) {
	const { latitude, longitude, lat, lng, coordinates, location } = body;
	const hasLatLngInputs = latitude !== undefined || longitude !== undefined || lat !== undefined || lng !== undefined;

	if (hasLatLngInputs) {
		const parsedLatitude = Number(latitude !== undefined ? latitude : lat);
		const parsedLongitude = Number(longitude !== undefined ? longitude : lng);

		if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
			return { error: 'latitude and longitude must be valid numbers' };
		}

		if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) {
			return { error: 'latitude/longitude out of range' };
		}

		return { location: { coordinates: [parsedLongitude, parsedLatitude] } };
	}

	const inputCoordinates = Array.isArray(coordinates)
		? coordinates
		: location && Array.isArray(location.coordinates)
			? location.coordinates
			: null;

	if (!inputCoordinates) {
		return { location: undefined };
	}

	const parsedLongitude = Number(inputCoordinates[0]);
	const parsedLatitude = Number(inputCoordinates[1]);

	if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
		return { error: 'coordinates must be valid numbers' };
	}

	if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) {
		return { error: 'coordinates out of range' };
	}

	return { location: { coordinates: [parsedLongitude, parsedLatitude] } };
}

function validateCreateStationPayload(body) {
	const { name, code, timezone, openTime, closeTime } = body;

	if (!name || !code) {
		return { error: 'name and code are required' };
	}

	const locationResult = parseLocation(body);
	if (locationResult.error) {
		return { error: locationResult.error };
	}

	return {
		data: {
			name,
			code,
			timezone,
			openTime,
			closeTime,
			location: locationResult.location
		}
	};
}

module.exports = {
	validateCreateStationPayload
};
