import Cloudflare from "../providers/cloudflare.json" with { type: "json" };
import Amazon from "../providers/amazon.json" with { type: "json" };
import Google from "../providers/google.json" with { type: "json" };
import Microsoft from "../providers/microsoft.json" with { type: "json" };
import Arvancloud from "../providers/arvancloud.json" with { type: "json" };
import Asiatech from "../providers/asiatech.json" with { type: "json" };
import Liara from "../providers/liara.json" with { type: "json" };
import Canonical from "../providers/canonical.json" with { type: "json" };
import Fastly from "../providers/fastly.json" with { type: "json" };
import Gitiserver from "../providers/gitiserver.json" with { type: "json" };
import Sefroyek from "../providers/sefroyek.json" with { type: "json" };

/*

Cloudflare:
  https://api.cloudflare.com/client/v4/ips

Google:
  https://www.gstatic.com/ipranges/goog.json

Microsoft :
  https://www.microsoft.com/en-us/download/details.aspx?id=53602

Arvancloud:
  https://www.arvancloud.ir/en/ips.txt

Fastly:
  https://api.fastly.com/public-ip-list

OTHERS:
  python3 asn-prefix-fetcher.py

*/

export const PROVIDERS = {
  Cloudflare,
  Amazon,
  Google,
  Microsoft,
  Arvancloud,
  Asiatech,
  Liara,
  Canonical,
  Fastly,
  Gitiserver,
  Sefroyek,
};
