export const timeout = async (time: number) => {
    return new Promise((resolve) => setTimeout(resolve, time));
};

export const getChangePercent = (cur: number, prev: number): number => {
    return 100 * ((cur - prev) / prev);
};