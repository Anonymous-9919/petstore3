export const revalidatePath = () => undefined;
export const revalidateTag = () => undefined;
export const unstable_cache = <T extends (...args: never[]) => unknown>(callback: T) => callback;
