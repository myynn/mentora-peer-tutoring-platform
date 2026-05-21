// data layer for localStorage
const storage = {

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  get(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  clear() {
    localStorage.clear();
  },

  setUser(user) {

    this.set("currentUser", user);
  },
  getUser() {
    return this.get("currentUser");
  },
  logout() {
    this.remove("currentUser");
  },
};

export default storage;
