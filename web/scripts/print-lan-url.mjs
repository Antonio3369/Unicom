import os from "node:os";

const port = process.env.PORT ?? "1771";
const ips = [];

for (const ifaces of Object.values(os.networkInterfaces())) {
  if (!ifaces) continue;
  for (const iface of ifaces) {
    if (iface.family === "IPv4" && !iface.internal) {
      ips.push(iface.address);
    }
  }
}

console.log("");
console.log("  本机: http://localhost:" + port + "/login");
if (ips.length) {
  for (const ip of ips) {
    console.log("  手机（同一 WiFi）: http://" + ip + ":" + port + "/login");
  }
} else {
  console.log("  手机: 未检测到局域网 IP，请确认 WiFi 已连接");
}
console.log("  勿用 https；手机与电脑须在同一 WiFi");
console.log("");
