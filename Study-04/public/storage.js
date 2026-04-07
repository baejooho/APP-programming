// ── FridgeStorage: localStorage 추상화 모듈 ────────────────────
const FridgeStorage = {
  PROFILE_KEY: 'fridge_app_profile',
  RECIPES_KEY: 'fridge_app_recipes',

  // ── 프로필 ──────────────────────────────────────────────────
  getProfile() {
    try { return JSON.parse(localStorage.getItem(this.PROFILE_KEY)); } catch { return null; }
  },

  saveProfile(profile) {
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
  },

  createProfile(nickname) {
    const profile = {
      id: crypto.randomUUID(),
      nickname: nickname.trim(),
      avatar_url: '',
      created_at: new Date().toISOString(),
      preferences: { servings: 2, max_cooking_time: 30, diet: [] },
    };
    this.saveProfile(profile);
    return profile;
  },

  updatePreferences(prefs) {
    const profile = this.getProfile();
    if (!profile) return;
    profile.preferences = { ...profile.preferences, ...prefs };
    this.saveProfile(profile);
  },

  // ── 레시피 ──────────────────────────────────────────────────
  getRecipes() {
    try { return JSON.parse(localStorage.getItem(this.RECIPES_KEY)) || []; } catch { return []; }
  },

  saveRecipe(item) {
    const recipes = this.getRecipes();
    if (recipes.some(r => r.recipe.name === item.recipe.name)) return false;
    recipes.unshift(item);
    localStorage.setItem(this.RECIPES_KEY, JSON.stringify(recipes));
    return true;
  },

  deleteRecipe(id) {
    const recipes = this.getRecipes().filter(r => r.id !== id);
    localStorage.setItem(this.RECIPES_KEY, JSON.stringify(recipes));
  },

  updateMemo(id, memo) {
    const recipes = this.getRecipes().map(r => r.id === id ? { ...r, memo } : r);
    localStorage.setItem(this.RECIPES_KEY, JSON.stringify(recipes));
  },

  searchRecipes(query) {
    if (!query) return this.getRecipes();
    const q = query.toLowerCase();
    return this.getRecipes().filter(r =>
      r.recipe.name.toLowerCase().includes(q) ||
      (r.source_ingredients || []).some(i => i.toLowerCase().includes(q)) ||
      (r.recipe.ingredients || []).some(i => i.name.toLowerCase().includes(q))
    );
  },

  getTopIngredients(n = 3) {
    const count = {};
    this.getRecipes().forEach(r => {
      (r.source_ingredients || []).forEach(i => { count[i] = (count[i] || 0) + 1; });
    });
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);
  },
};
