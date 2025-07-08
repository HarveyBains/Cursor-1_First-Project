export const saveToLocalStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Silent fail on quota exceeded or other localStorage errors
    console.error("Error saving to localStorage", e);
  }
};

export const loadFromLocalStorage = (key: string, defaultValue: any): any => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error("Error loading from localStorage", e);
    return defaultValue;
  }
};
