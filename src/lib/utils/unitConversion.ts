/**
 * Parses a number from a string, handling various formats.
 * Returns the parsed number or null if parsing fails.
 */
function parseNumberFromString(value: string): number | null {
  const numberMatch = value.match(/^(\d+(?:\.\d+)?)$/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }
  return null;
}

/**
 * Normalizes a unit string by trimming and checking for unit indicators.
 */
function normalizeUnitString(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim();
}

/**
 * Checks if a string contains a specific unit indicator (case-insensitive).
 */
function hasUnit(value: string, unit: string): boolean {
  return value.toLowerCase().includes(unit.toLowerCase());
}

/**
 * Converts imperial height to metric (cm)
 * Handles formats like:
 * - "5'10\"" or "5'10" -> 178 cm
 * - "5 ft 10 in" -> 178 cm
 * - "70 in" -> 178 cm
 * - Already in cm (if contains "cm") -> returns as-is
 */
function convertHeightToMetric(height: string | null | undefined): string {
  const trimmed = normalizeUnitString(height);
  if (!trimmed) return '';

  // If already in metric, return as-is
  if (hasUnit(trimmed, 'cm')) {
    return trimmed;
  }

  let totalInches = 0;

  // Try parsing feet and inches format: "5'10\"" or "5'10"
  const feetInchesMatch = trimmed.match(/^(\d+)\s*['']\s*(\d+)\s*[""]?$/);
  if (feetInchesMatch) {
    const feet = parseInt(feetInchesMatch[1], 10);
    const inches = parseInt(feetInchesMatch[2], 10);
    totalInches = feet * 12 + inches;
  }
  // Try parsing "X ft Y in" format
  else {
    const ftInMatch = trimmed.match(/(\d+)\s*ft\s*(\d+)\s*in/i);
    if (ftInMatch) {
      const feet = parseInt(ftInMatch[1], 10);
      const inches = parseInt(ftInMatch[2], 10);
      totalInches = feet * 12 + inches;
    }
    // Try parsing just inches: "70 in"
    else {
      const inchesMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*in$/i);
      if (inchesMatch) {
        totalInches = parseFloat(inchesMatch[1]);
      }
      // Try parsing just a number (assume inches if reasonable, otherwise assume feet)
      else {
        const num = parseNumberFromString(trimmed);
        if (num !== null) {
          // If number is less than 10, assume feet; otherwise assume inches
          totalInches = num < 10 ? num * 12 : num;
        }
      }
    }
  }

  if (totalInches > 0) {
    const cm = Math.round(totalInches * 2.54);
    return `${cm} cm`;
  }

  // If parsing failed, return original
  return trimmed;
}

/**
 * Converts metric height (cm) to imperial (feet and inches)
 * Handles formats like:
 * - "178 cm" -> "5'10\""
 * - "178cm" -> "5'10\""
 * - "178" (assumed cm) -> "5'10\""
 */
function convertHeightToImperial(height: string | null | undefined): string {
  const trimmed = normalizeUnitString(height);
  if (!trimmed) return '';

  let cm = 0;

  // Try parsing cm format: "178 cm" or "178cm"
  const cmMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*cm$/i);
  if (cmMatch) {
    cm = parseFloat(cmMatch[1]);
  }
  // Try parsing just a number (assume cm if reasonable)
  else {
    const num = parseNumberFromString(trimmed);
    if (num !== null) {
      // If number is reasonable for cm (between 50 and 300), assume cm
      if (num >= 50 && num <= 300) {
        cm = num;
      }
    }
  }

  if (cm > 0) {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }

  // If parsing failed, return original
  return trimmed;
}

/**
 * Converts imperial weight to metric (kg)
 * Handles formats like:
 * - "150 lbs" or "150lb" -> 68 kg
 * - "150 pounds" -> 68 kg
 * - Already in kg (if contains "kg") -> returns as-is
 */
function convertWeightToMetric(weight: string | null | undefined): string {
  const trimmed = normalizeUnitString(weight);
  if (!trimmed) return '';

  // If already in metric, return as-is
  if (hasUnit(trimmed, 'kg')) {
    return trimmed;
  }

  // Try parsing pounds: "150 lbs", "150lb", "150 pounds"
  const lbsMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)$/i);
  if (lbsMatch) {
    const lbs = parseFloat(lbsMatch[1]);
    const kg = Math.round(lbs * 0.453592);
    return `${kg} kg`;
  }

  // Try parsing just a number (assume pounds if reasonable)
  const num = parseNumberFromString(trimmed);
  if (num !== null) {
    // If number is reasonable for pounds (between 50 and 500), convert
    if (num >= 50 && num <= 500) {
      const kg = Math.round(num * 0.453592);
      return `${kg} kg`;
    }
  }

  // If parsing failed, return original
  return trimmed;
}

/**
 * Converts metric weight (kg) to imperial (lbs)
 * Handles formats like:
 * - "68 kg" -> "150 lbs"
 * - "68kg" -> "150 lbs"
 * - "68" (assumed kg) -> "150 lbs"
 */
function convertWeightToImperial(weight: string | null | undefined): string {
  const trimmed = normalizeUnitString(weight);
  if (!trimmed) return '';

  let kg = 0;

  // Try parsing kg format: "68 kg" or "68kg"
  const kgMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*kg$/i);
  if (kgMatch) {
    kg = parseFloat(kgMatch[1]);
  }
  // Try parsing just a number (assume kg if reasonable)
  else {
    const num = parseNumberFromString(trimmed);
    if (num !== null) {
      // If number is reasonable for kg (between 20 and 250), assume kg
      if (num >= 20 && num <= 250) {
        kg = num;
      }
    }
  }

  if (kg > 0) {
    const lbs = Math.round(kg / 0.453592);
    return `${lbs} lbs`;
  }

  // If parsing failed, return original
  return trimmed;
}

/**
 * Formats height with both imperial and metric
 * Returns format: "imperial / metric" or "metric / imperial"
 * Always shows both units regardless of input format
 */
export function formatHeightWithMetric(height: string | null | undefined): string {
  const trimmed = normalizeUnitString(height);
  if (!trimmed) return '';

  const isMetric = hasUnit(trimmed, 'cm');
  
  if (isMetric) {
    // Input is in metric, convert to imperial
    const imperial = convertHeightToImperial(trimmed);
    // If conversion succeeded, show both; otherwise just show original
    if (imperial !== trimmed && !hasUnit(imperial, 'cm')) {
      return `${trimmed} / ${imperial}`;
    }
    return trimmed;
  } else {
    // Input is in imperial, convert to metric
    const metric = convertHeightToMetric(trimmed);
    // If conversion succeeded, show both; otherwise just show original
    if (metric !== trimmed && hasUnit(metric, 'cm')) {
      return `${trimmed} / ${metric}`;
    }
    return trimmed;
  }
}

/**
 * Formats weight with both imperial and metric
 * Returns format: "imperial / metric" or "metric / imperial"
 * Always shows both units regardless of input format
 */
export function formatWeightWithMetric(weight: string | null | undefined): string {
  const trimmed = normalizeUnitString(weight);
  if (!trimmed) return '';

  const isMetric = hasUnit(trimmed, 'kg');
  
  if (isMetric) {
    // Input is in metric, convert to imperial
    const imperial = convertWeightToImperial(trimmed);
    // If conversion succeeded, show both; otherwise just show original
    if (imperial !== trimmed && !hasUnit(imperial, 'kg')) {
      return `${trimmed} / ${imperial}`;
    }
    return trimmed;
  } else {
    // Input is in imperial, convert to metric
    const metric = convertWeightToMetric(trimmed);
    // If conversion succeeded, show both; otherwise just show original
    if (metric !== trimmed && hasUnit(metric, 'kg')) {
      return `${trimmed} / ${metric}`;
    }
    return trimmed;
  }
}

