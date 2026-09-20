export type LocationCheckStatus =
  | "Location Verified"
  | "Location Needs Review"
  | "Invalid Location"
  | "Location Could Not Be Verified"
  | "Outside Supported Area"
  | "Location Mismatch";

export type LocationVerification = {
  status: LocationCheckStatus;
  reason: string;
  coordinates: "Available" | "Unavailable";
  canRouteConfidently: boolean;
};

// This MVP uses a configurable geographic service-area check and should not be interpreted as an official or authoritative municipal boundary.
export const MYSURU_SERVICE_AREA = {
  minLatitude: 12.1,
  maxLatitude: 12.5,
  minLongitude: 76.45,
  maxLongitude: 76.9,
  label: "Configured Mysuru service area",
};

const numberValue = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
};

export function verifyLocation(
  latitude: unknown,
  longitude: unknown,
  locationText = "",
): LocationVerification {
  const lat = numberValue(latitude);
  const lng = numberValue(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      status: "Location Needs Review",
      reason: "The complaint does not contain usable latitude and longitude coordinates.",
      coordinates: "Unavailable",
      canRouteConfidently: false,
    };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      status: "Invalid Location",
      reason: "The submitted latitude or longitude is outside the valid geographic range.",
      coordinates: "Available",
      canRouteConfidently: false,
    };
  }

  const insideServiceArea =
    lat >= MYSURU_SERVICE_AREA.minLatitude &&
    lat <= MYSURU_SERVICE_AREA.maxLatitude &&
    lng >= MYSURU_SERVICE_AREA.minLongitude &&
    lng <= MYSURU_SERVICE_AREA.maxLongitude;

  if (!insideServiceArea) {
    return {
      status: "Outside Supported Area",
      reason: "The submitted coordinates are outside the application's configured Mysuru service area.",
      coordinates: "Available",
      canRouteConfidently: false,
    };
  }

  const normalizedText = locationText.trim().toLowerCase();
  const knownDifferentPlaces = [
    "bengaluru",
    "bangalore",
    "chennai",
    "delhi",
    "mumbai",
    "hyderabad",
  ];
  if (normalizedText && knownDifferentPlaces.some((place) => normalizedText.includes(place))) {
    return {
      status: "Location Mismatch",
      reason: "The location text does not appear consistent with the submitted coordinates. Exact address verification is not available in this MVP.",
      coordinates: "Available",
      canRouteConfidently: false,
    };
  }

  return {
    status: "Location Verified",
    reason: "The coordinates are valid and fall within the application's configured Mysuru service area.",
    coordinates: "Available",
    canRouteConfidently: true,
  };
}
