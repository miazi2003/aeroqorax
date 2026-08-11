const predictAircraftPosition = (
    latitude: number,
    longitude: number,
    groundSpeed: number,
    heading: number,
    elapsedSeconds: number
) => {

    //knots to meters
    const speedMetersPerSecond = groundSpeed * 0.514444;
    //distance traveled
    const distance = speedMetersPerSecond * elapsedSeconds;
    // radius of earth = 6371KM
    const earthRadius = 6371000;
    // ocnverted heading into radian
    const headingRad = (heading * Math.PI) / 180;
    //converted latitude into radian
    const latitudeRad = (latitude * Math.PI) / 180;
    //converted longitude into radian 
    const longitudeRad = (longitude * Math.PI) / 180;
    // angle of distance
    const angularDistance = distance / earthRadius;
    //predicted Latitude in radian
    const predictedLatitudeRad = Math.asin(
        Math.sin(latitudeRad) * Math.cos(angularDistance) +
        Math.cos(latitudeRad) * Math.sin(angularDistance) *
        Math.cos(headingRad)
    )
    // predicted longitude in radian
    const predictedLongitudeRad =
        longitudeRad + Math.atan2(
            Math.sin(headingRad) * Math.sin(angularDistance) *
            Math.cos(latitudeRad), Math.cos(angularDistance) -
        Math.sin(latitudeRad) * Math.sin(predictedLatitudeRad)
        );

    const predictedLatitude = (predictedLatitudeRad * 180) / Math.PI;
    const predictedLongitude = (predictedLongitudeRad * 180) / Math.PI;


    return {
        latitude: predictedLatitude,
        longitude: predictedLongitude
    }
};

export default predictAircraftPosition;