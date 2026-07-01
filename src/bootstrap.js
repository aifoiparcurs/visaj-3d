/**
 * Încarcă animația hero (Three.js) doar după ce pagina a fost afișată, astfel încât
 * textul și restul conținutului să nu fie blocate de biblioteca 3D la prima încărcare.
 * Comportamentul vizual rămâne identic — se schimbă doar MOMENTUL încărcării.
 */
function loadStage() {
  return import("./main.js").catch((error) => {
    console.error("VISAJ: animația hero nu a putut fi încărcată.", error);
  });
}

const stage = document.getElementById("visaj-stage");

if (stage) {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            obs.disconnect();
            loadStage();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(stage);
  } else {
    loadStage();
  }
}
