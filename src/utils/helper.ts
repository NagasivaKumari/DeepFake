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

export const calculateAverage = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return calculateSum(numbers) / numbers.length;
};