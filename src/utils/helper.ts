export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export const calculateSum = (numbers: number[]): number => {
    return numbers.reduce((sum, num) => sum + num, 0);
};

export const findMax = (numbers: number[]): number => {
    return Math.max(...numbers);
};

export const findMin = (numbers: number[]): number => {
    return Math.min(...numbers);
};

// Improved the calculateAverage function to handle edge cases with a warning
export const calculateAverage = (numbers: number[]): number => {
    if (numbers.length === 0) {
        console.warn('Warning: Attempted to calculate average of an empty array.');
        return 0;
    }
    return calculateSum(numbers) / numbers.length;
};

export const calculateMedian = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
};

export const calculateStandardDeviation = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const avg = calculateAverage(numbers);
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - avg, 2), 0) / numbers.length;
    return Math.sqrt(variance);
};

export const calculateRange = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return Math.max(...numbers) - Math.min(...numbers);
};

// Added a utility function to calculate the product of an array of numbers
export const calculateProduct = (numbers: number[]): number => {
    if (numbers.length === 0) return 1;
    return numbers.reduce((product, num) => product * num, 1);
};

// Added a utility function to calculate the geometric mean of an array of numbers
export const calculateGeometricMean = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const product = calculateProduct(numbers);
    return Math.pow(product, 1 / numbers.length);
};

// Added a utility function to calculate the harmonic mean of an array of numbers
export const calculateHarmonicMean = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const reciprocalSum = numbers.reduce((sum, num) => sum + 1 / num, 0);
    return numbers.length / reciprocalSum;
};

// Added a utility function to calculate the mode of an array of numbers
export const calculateMode = (numbers: number[]): number[] => {
    if (numbers.length === 0) return [];
    const frequencyMap: Record<number, number> = {};
    numbers.forEach(num => {
        frequencyMap[num] = (frequencyMap[num] || 0) + 1;
    });
    const maxFrequency = Math.max(...Object.values(frequencyMap));
    return Object.keys(frequencyMap)
        .filter(key => frequencyMap[Number(key)] === maxFrequency)
        .map(Number);
};

// Added a utility function to calculate the variance of an array of numbers
export const calculateVariance = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const avg = calculateAverage(numbers);
    return numbers.reduce((sum, num) => sum + Math.pow(num - avg, 2), 0) / numbers.length;
};

// Added a utility function to calculate the interquartile range (IQR) of an array of numbers
export const calculateIQR = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const q1 = sorted[Math.floor((sorted.length / 4))];
    const q3 = sorted[Math.ceil((sorted.length * (3 / 4))) - 1];
    return q3 - q1;
};

// Added a utility function to calculate the midrange of an array of numbers
export const calculateMidrange = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const max = Math.max(...numbers);
    const min = Math.min(...numbers);
    return (max + min) / 2;
};

// Added a utility function to calculate the trimmed mean of an array of numbers
export const calculateTrimmedMean = (numbers: number[], trimPercent: number): number => {
    if (numbers.length === 0 || trimPercent < 0 || trimPercent > 50) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const trimCount = Math.floor((trimPercent / 100) * sorted.length);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    return calculateAverage(trimmed);
};

// Added a utility function to calculate the weighted mean of an array of numbers
export const calculateWeightedMean = (numbers: number[], weights: number[]): number => {
    if (numbers.length === 0 || numbers.length !== weights.length) return 0;
    const weightedSum = numbers.reduce((sum, num, index) => sum + num * weights[index], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return weightedSum / totalWeight;
};

// Added a utility function to calculate the percentile of a value in an array
export const calculatePercentile = (numbers: number[], value: number): number => {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const rank = sorted.filter(num => num < value).length;
    return (rank / sorted.length) * 100;
};

// Added a utility function to calculate the z-score of a value in an array
export const calculateZScore = (numbers: number[], value: number): number => {
    if (numbers.length === 0) return 0;
    const avg = calculateAverage(numbers);
    const stdDev = calculateStandardDeviation(numbers);
    return (value - avg) / stdDev;
};

// Added a utility function to calculate the skewness of an array of numbers
export const calculateSkewness = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const avg = calculateAverage(numbers);
    const stdDev = calculateStandardDeviation(numbers);
    const n = numbers.length;
    const skewness = numbers.reduce((sum, num) => sum + Math.pow((num - avg) / stdDev, 3), 0) / n;
    return skewness;
};