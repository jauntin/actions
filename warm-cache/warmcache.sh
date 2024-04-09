#!/bin/bash

# Check if an argument is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 ROOT_SITEMAP_URL"
    exit 1
fi

# The first argument is the root sitemap URL
ROOT_SITEMAP="$1"

# Function to parse sitemap and curl each URL
function warm_cache() {
    local sitemap_url=$1

    # Fetch the sitemap
    content=$(curl -s "$sitemap_url")

    # Parse the sitemap to get all URLs
    urls=$(echo "$content" | xmllint --xpath "//*[local-name()='url']/*[local-name()='loc']/text()" -)

    # Access each URL to warm up the cache
    for url in $urls; do
        echo "$url"
        http_status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        echo "Status: $http_status"
    done
}

# Fetch the root sitemap and parse it to find child sitemap locations
child_sitemaps=$(curl -s "$ROOT_SITEMAP" | xmllint --xpath "//*[local-name()='sitemap']/*[local-name()='loc']/text()" -)

# Loop through each child sitemap and warm cache for URLs found
for sitemap in $child_sitemaps; do
    warm_cache "$sitemap"
done

echo "Cache warming complete."
