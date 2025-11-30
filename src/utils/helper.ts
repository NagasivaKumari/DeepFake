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