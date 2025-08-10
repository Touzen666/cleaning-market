// Debug script to track image requests
// Run this in browser console to see where image requests are coming from

console.log("🔍 Starting image request debugging...");

// Intercept all image requests
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const url = args[0];
  if (typeof url === "string" && url.includes("/uploads/apartments/")) {
    console.log("🚨 Intercepted fetch request to:", url);
    console.trace("Stack trace:");
  }
  return originalFetch.apply(this, args);
};

// Intercept Image constructor (keep type as constructor for TS/Next build)
const OriginalImageCtor = window.Image;
window.Image = function (...args) {
  const img = new OriginalImageCtor(...args);
  const originalSrc = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "src",
  );

  Object.defineProperty(img, "src", {
    set: function (value) {
      if (typeof value === "string" && value.includes("/uploads/apartments/")) {
        console.log("🚨 Image src set to:", value);
        console.trace("Stack trace:");
      }
      return originalSrc.set.call(this, value);
    },
    get: function () {
      return originalSrc.get.call(this);
    },
  });

  return img;
};
// Preserve prototype to satisfy constructor shape
window.Image.prototype = OriginalImageCtor.prototype;

// Monitor DOM changes for new images
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node;
        if (element.tagName === "IMG") {
          const src = element.getAttribute("src");
          if (src && src.includes("/uploads/apartments/")) {
            console.log("🚨 New IMG element with src:", src);
            console.trace("Stack trace:");
          }
        }
        // Check for images in children
        const images = element.querySelectorAll("img");
        images.forEach((img) => {
          const src = img.getAttribute("src");
          if (src && src.includes("/uploads/apartments/")) {
            console.log("🚨 IMG element found in DOM with src:", src);
            console.trace("Stack trace:");
          }
        });
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

console.log(
  "✅ Image request debugging active. Check console for intercepted requests.",
);
