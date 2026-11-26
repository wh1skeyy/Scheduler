// Full-viewport media controller. All types share a single priority.mp4 video,
// with per-type JPEG posters as fallback images.
const TYPES = [
  { key: "work", asset: "priority" },
  { key: "lesson", asset: "priority" },
  { key: "hangout", asset: "priority" },
  { key: "priority", asset: "priority" },
];

export function createMediaController(root, onChange = () => {}) {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let active = null;
  let playing = !motionQuery.matches;
  const layers = new Map();

  root.innerHTML = '<div class="media-scrim" aria-hidden="true"></div>';

  for (const type of TYPES) {
    const layer = document.createElement("div");
    layer.className = `media-layer${active === type.key ? " is-active" : ""}`;
    layer.dataset.mediaType = type.key;
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = `
      <img class="media-image is-fallback" src="assets/img/${type.asset}.jpg" alt="" loading="eager">
      <video class="media-video" muted loop autoplay playsinline preload="metadata" poster="assets/img/${type.asset}.jpg" aria-hidden="true"></video>`;
    root.prepend(layer);
    const video = layer.querySelector("video");
    const image = layer.querySelector("img");
    video.playbackRate = 0.65; // slower playback for a calmer feel
    layers.set(type.key, { layer, video, image, asset: type.asset, failed: false });

    video.addEventListener("loadeddata", () => {
      layer.classList.add("has-video");
      layer.classList.remove("video-failed");
      // Auto-play if this layer is active and playing is enabled
      if (playing && layer.classList.contains("is-active")) {
        video.play().catch(() => {});
      }
    });
    video.addEventListener("error", () => {
      layer.classList.remove("has-video");
      layer.classList.add("video-failed");
      image.classList.add("is-fallback");
    });
    image.addEventListener("error", () => layer.classList.add("image-failed"));
    image.addEventListener("load", () => layer.classList.remove("image-failed"));
  }

  function syncSources() {
    const next = "assets/video/priority.mp4";
    for (const item of layers.values()) {
      if (item.video.getAttribute("src") === next) continue;
      item.video.setAttribute("src", next);
      item.video.load();
      // Don't auto-play here; wait for loadeddata event
    }
  }

  function syncPlayback() {
    root.classList.toggle("media-paused", !playing);
    for (const item of layers.values()) {
      if (playing && item.layer.dataset.mediaType === active) {
        // Only play if video has loaded data
        if (item.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          item.video.play().catch(() => {});
        }
      } else {
        item.video.pause();
      }
    }
    onChange({ playing, active });
  }

  function setActive(type) {
    if (!layers.has(type)) return;
    active = type;
    for (const [key, item] of layers) {
      item.layer.classList.toggle("is-active", key === type);
    }
    syncPlayback();
  }

  function setPlaying(value) {
    playing = Boolean(value);
    syncPlayback();
  }

  motionQuery.addEventListener("change", (event) => {
    if (event.matches) setPlaying(false);
  });

  syncSources();
  syncPlayback();

  return {
    setActive,
    setPlaying,
    toggle: () => setPlaying(!playing),
    get playing() {
      return playing;
    },
    get active() {
      return active;
    },
  };
}