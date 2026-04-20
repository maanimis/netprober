import requests
import json

def fetch_prefixes(asn: str):
    # Normalize ASN (remove "AS" if present)
    asn_number = asn.upper().replace("AS", "").strip()

    url = f"https://bgp.he.net/super-lg/report/api/v1/prefixes/originated/{asn_number}"

    response = requests.get(url, timeout=10)
    response.raise_for_status()

    data = response.json()

    # Extract prefixes where Count != 0
    prefixes = [
        item["Prefix"]
        for item in data.get("prefixes", [])
        if item.get("Count", 0) != 0
    ]

    return prefixes


def main():
    asn = input("Enter ASN (e.g. AS13335): ").strip()

    prefixes = fetch_prefixes(asn)

    with open("prefixes.json", "w") as f:
        json.dump(prefixes, f, indent=2)

    print(f"Saved {len(prefixes)} prefixes to prefixes.json")


if __name__ == "__main__":
    main()

