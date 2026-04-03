export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        document: "readonly",
        window: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        MutationObserver: "readonly",
        matchMedia: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        HTMLElement: "readonly",
        Event: "readonly",
        MouseEvent: "readonly",
        NodeList: "readonly",
        console: "readonly",
        FileReader: "readonly",
        ClipboardItem: "readonly",
        Blob: "readonly",
        CustomEvent: "readonly",
        performance: "readonly",
        getComputedStyle: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        DOMParser: "readonly",
        btoa: "readonly",
        atob: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Image: "readonly",
        SoftUI: "writable"
      }
    },
    rules: {
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": ["warn", { args: "none" }],
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-undef": "error"
    }
  }
];
