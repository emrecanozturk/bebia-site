(function () {
  var d = document;

  var parts = d.querySelectorAll(".rv");
  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    parts.forEach(function (el) { seen.observe(el); });
  } else {
    parts.forEach(function (el) { el.classList.add("in"); });
  }
  var moving = d.querySelectorAll("[data-sc]");
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (moving.length && !(calm && calm.matches)) {
    var queued = false;
    var frame = function () {
      queued = false;
      var vh = window.innerHeight;
      for (var i = 0; i < moving.length; i++) {
        var el = moving[i], r = el.getBoundingClientRect();
        if (r.bottom < -vh * 0.3 || r.top > vh * 1.3) continue;
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        var e = Math.min(1, p / 0.45);
        e = 1 - Math.pow(1 - e, 3);
        var c = 1 - Math.min(1, Math.abs(p - 0.5) / 0.5);
        c = 1 - Math.pow(1 - c, 2);
        el.style.setProperty("--p", p.toFixed(4));
        el.style.setProperty("--e", e.toFixed(4));
        el.style.setProperty("--c", c.toFixed(4));
      }
    };
    var ask = function () { if (!queued) { queued = true; window.requestAnimationFrame(frame); } };
    frame();
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
  }
  var fitted = d.querySelectorAll("[data-fit]");
  function natural(el) {
    var range = d.createRange(), widest = 0;
    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if ((node.nodeType === 3 && node.textContent.trim()) || (node.nodeType === 1 && node.tagName === "SPAN")) {
        range.selectNodeContents(node);
        widest = Math.max(widest, range.getBoundingClientRect().width);
      }
    }
    return widest;
  }
  function fit() {
    for (var i = 0; i < fitted.length; i++) {
      var el = fitted[i];
      el.style.fontSize = "";
      var room = el.clientWidth, taken = natural(el);
      if (!room || !taken) continue;
      var fill = el.getAttribute("data-fit") === "fill";
      if (!fill && taken <= room) continue;
      var size = parseFloat(getComputedStyle(el).fontSize) * room / taken * 0.985;
      if (fill) size = Math.min(size, window.innerWidth * 0.3);
      el.style.fontSize = size + "px";
    }
  }
  if (fitted.length) {
    fit();
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit);
    var waiting = 0;
    window.addEventListener("resize", function () { clearTimeout(waiting); waiting = setTimeout(fit, 120); });
  }
  var menu = d.querySelector("details.lang");
  if (menu) {
    d.addEventListener("click", function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); } });
  }

  d.querySelectorAll("[data-acc]").forEach(function (acc) {
    var panels = acc.querySelectorAll(".acc-p");
    panels.forEach(function (panel) {
      panel.querySelector(".acc-h").addEventListener("click", function () {
        panels.forEach(function (other) {
          var open = other === panel;
          other.classList.toggle("open", open);
          other.querySelector(".acc-h").setAttribute("aria-expanded", open ? "true" : "false");
        });
      });
    });
  });
  var block = d.querySelector("[data-live]");
  var words = d.getElementById("live-t");
  if (!block || !words) return;
  var T = JSON.parse(words.textContent);
  var feed = d.querySelector("[data-feed]");
  var say = d.querySelector("[data-say]");
  var field = function (name) { return block.querySelector('[data-f="' + name + '"]'); };
  var button = function (act) { return d.querySelector('[data-act="' + act + '"]'); };
  var awake = { big: field("big").textContent, sub: field("sub").textContent, wide: field("big").style.getPropertyValue("--bw") };
  function wide(text) {
    var total = 0;
    for (var i = 0; i < text.length; i++) total += text.charCodeAt(i) > 0x2E7F ? 1 : (text[i] === " " ? 0.26 : (text.charCodeAt(i) > 0x08FF ? 0.9 : 0.6));
    return Math.max(total, 1.9).toFixed(2);
  }
  var state = "awake", started = 0, timer = null;

  function clock() {
    var s = Math.max(0, Math.floor((Date.now() - started) / 1000));
    return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }
  function tick() { field("big").textContent = clock(); }

  function addRow(act, title, detail) {
    var li = d.createElement("li");
    li.className = "new";
    li.appendChild(button(act).querySelector(".shape").cloneNode(true));
    var body = d.createElement("div"), b = d.createElement("b"), s = d.createElement("span"), t = d.createElement("span");
    b.textContent = title; s.textContent = detail; t.className = "t"; t.textContent = T.now;
    body.appendChild(b); body.appendChild(s);
    li.appendChild(body); li.appendChild(t);
    feed.insertBefore(li, feed.firstChild);
    while (feed.children.length > 4) feed.removeChild(feed.lastChild);
  }

  function show(next) {
    clearInterval(timer);
    block.classList.add("swap");
    setTimeout(function () {
      state = next;
      block.setAttribute("data-state", next);
      if (next === "awake") {
        field("state").textContent = T.awake;
        field("big").textContent = awake.big;
        field("big").style.setProperty("--bw", awake.wide);
        field("sub").textContent = awake.sub;
      } else {
        started = Date.now();
        field("state").textContent = next === "feeding" ? T.nursing : T.sleeping;
        field("sub").textContent = next === "feeding" ? T.nursing_sub : T.sleeping_sub;
        field("big").style.setProperty("--bw", "2.2");
        tick();
        timer = setInterval(tick, 1000);
      }
      button("nurse").setAttribute("aria-pressed", next === "feeding" ? "true" : "false");
      button("sleep").setAttribute("aria-pressed", next === "sleeping" ? "true" : "false");
      if (say) say.textContent = field("state").textContent;
      block.classList.remove("swap");
    }, 160);
  }

  function finish() {
    if (state === "feeding") addRow("nurse", T.nurse, T.nurse_side + " " + clock() + " · " + T.you);
    if (state === "sleeping") {
      addRow("sleep", T.sleep, clock() + " · " + T.you);
      awake = { big: T.woke_big, sub: T.woke_sub, wide: wide(T.woke_big) };
    }
  }

  function chip(name, text) {
    var el = field(name);
    el.lastElementChild.textContent = text;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  button("nurse").addEventListener("click", function () {
    var was = state;
    finish();
    show(was === "feeding" ? "awake" : "feeding");
  });
  button("sleep").addEventListener("click", function () {
    var was = state;
    finish();
    show(was === "sleeping" ? "awake" : "sleeping");
  });
  button("bottle").addEventListener("click", function () {
    addRow("bottle", T.bottle, T.you);
    chip("chip-feed", T.chip_feed);
  });
  button("diaper").addEventListener("click", function () {
    addRow("diaper", T.diaper, T.you);
    chip("chip-diaper", T.chip_diaper);
  });
})();
