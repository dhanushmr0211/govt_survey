/**
 * Fetches the current GPS coordinates using the browser's Geolocation API.
 * Uses high accuracy mode and returns a promise.
 * 
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser/device.'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds timeout
      maximumAge: 0,   // Force fresh location, don't use cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Failed to acquire location. Please try again.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission was denied. Please enable location permissions in your browser/system settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable. Please check if your device GPS/location services are enabled.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Please stand in an open area with a clear sky or try again.';
            break;
        }
        reject(new Error(msg));
      },
      options
    );
  });
};
