export let indexConfigs = {};

export async function loadConstants() {
    try {
        const response = await fetch('./constants.json?v=' + Date.now());
        if (!response.ok) throw new Error("Constants.json not found");
        indexConfigs = await response.json();
        console.log("Config Loaded:", indexConfigs);
    } catch (e) {
        console.error("Config Load Error:", e);
    }
}