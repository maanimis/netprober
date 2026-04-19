import Cloudflare from "../providers/cloudflare.json" with { type: "json" };
import Amazon from "../providers/amazon.json" with { type: "json" };
import Google from "../providers/google.json" with { type: "json" };
import Microsoft from "../providers/microsoft.json" with { type: "json" };
import Arvancloud from "../providers/arvancloud.json" with { type: "json" };

/*

Cloudflare:
  https://api.cloudflare.com/client/v4/ips

Amazon:
  https://ip-ranges.amazonaws.com/ip-ranges.json

Google:
  https://www.gstatic.com/ipranges/goog.json

Microsoft :
  https://www.microsoft.com/en-us/download/details.aspx?id=53602

Arvancloud:
  https://www.arvancloud.ir/en/ips.txt

*/

export const PROVIDERS = {
  Cloudflare,
  Amazon,
  Google,
  Microsoft,
  Arvancloud,
};
