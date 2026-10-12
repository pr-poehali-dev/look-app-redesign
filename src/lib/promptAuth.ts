export const promptAuth = () => {
  window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "login" } }));
};
