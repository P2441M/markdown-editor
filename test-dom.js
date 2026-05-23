import { JSDOM } from "jsdom";
const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <details id="det"><p id="hid">Hello</p></details>
</body></html>`);
const el = dom.window.document.getElementById('hid');
console.log("offsetParent:", el.offsetParent);
console.log("rect.top:", el.getBoundingClientRect().top);
console.log("rect.height:", el.getBoundingClientRect().height);
